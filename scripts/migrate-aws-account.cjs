process.env.AWS_SDK_LOAD_CONFIG ||= '1';

const AWS = require('aws-sdk');
const crypto = require('node:crypto');
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const config = require('./aws-account-migration.config.cjs');

const ALLOWED_COGNITO_ATTRIBUTES = [
  'nickname',
  'custom:cookingStyle',
  'custom:magicalSpecialty',
  'custom:favoriteIngredients',
  'custom:avatar',
  'custom:bio',
];

const usage = `
Arcane Kitchen AWS account migration

Usage:
  npm run migrate:aws -- export-source --dir <path>
  npm run migrate:aws -- plan-users --dir <path> [--force]
  npm run migrate:aws -- approve-review --dir <path> --approve-all-identities --approve-all-admins --approve-suggested-profiles
  npm run migrate:aws -- seed-users --dir <path> [--apply --confirm-account 617394174030]
  npm run migrate:aws -- send-password-resets --dir <path> [--apply --confirm-account 617394174030]
  npm run migrate:aws -- transform-data --dir <path>
  npm run migrate:aws -- seed-images --dir <path> [--apply --confirm-account 617394174030]
  npm run migrate:aws -- seed-data --dir <path> [--apply --confirm-account 617394174030]
  npm run migrate:aws -- verify --dir <path>

All mutating commands are dry-run-only unless --apply is present. Migration
artifacts contain user data and must remain in the ignored .migration directory.
`;

const normalizeEmail = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
};

const stableJson = (value) => JSON.stringify(stableValue(value));
const sha256 = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

const checksumRecords = (records) =>
  sha256(
    stableJson(
      [...records].sort((left, right) =>
        String(left.id || '').localeCompare(String(right.id || ''))
      )
    )
  );

const parseArgs = (argv) => {
  const [command, ...tokens] = argv;
  const options = {};

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--'))
      throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const next = tokens[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }

  return { command, options };
};

const COMMAND_OPTIONS = {
  'export-source': new Set(['dir', 'confirm-source-frozen', 'debug']),
  'plan-users': new Set(['dir', 'force', 'debug']),
  'approve-review': new Set([
    'dir',
    'approve-all-identities',
    'approve-all-admins',
    'approve-suggested-profiles',
    'debug',
  ]),
  'seed-users': new Set(['dir', 'apply', 'confirm-account', 'debug']),
  'send-password-resets': new Set(['dir', 'apply', 'confirm-account', 'debug']),
  'transform-data': new Set(['dir', 'debug']),
  'seed-images': new Set(['dir', 'apply', 'confirm-account', 'debug']),
  'seed-data': new Set(['dir', 'apply', 'confirm-account', 'debug']),
  verify: new Set(['dir', 'debug']),
};

const validateOptions = (command, options) => {
  const allowed = COMMAND_OPTIONS[command];
  if (!allowed) throw new Error(`Unknown command: ${command}\n${usage}`);
  for (const key of Object.keys(options)) {
    if (!allowed.has(key))
      throw new Error(`Unknown option for ${command}: --${key}`);
  }
  for (const flag of [
    'apply',
    'force',
    'confirm-source-frozen',
    'approve-all-identities',
    'approve-all-admins',
    'approve-suggested-profiles',
    'debug',
  ]) {
    if (options[flag] !== undefined && options[flag] !== true) {
      throw new Error(`--${flag} is a valueless flag`);
    }
  }
  if (
    options.apply === true &&
    options['confirm-account'] !== config.destination.accountId
  ) {
    throw new Error(
      `Apply mode requires --confirm-account ${config.destination.accountId}`
    );
  }
};

const ensureDirectory = (directory) => {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
};

const writeJson = (filePath, value) => {
  ensureDirectory(path.dirname(filePath));
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  fs.chmodSync(temporaryPath, 0o600);
  fs.renameSync(temporaryPath, filePath);
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const fileChecksum = (filePath) => sha256(fs.readFileSync(filePath));

const requireDirectoryOption = (options) => {
  if (!options.dir || typeof options.dir !== 'string') {
    throw new Error('--dir is required');
  }
  const directory = path.resolve(options.dir);
  ensureDirectory(directory);
  return directory;
};

const attributeMap = (attributes = []) =>
  Object.fromEntries(attributes.map(({ Name, Value }) => [Name, Value]));

const parseIdentities = (attributes) => {
  if (!attributes.identities) return [];
  const identities = JSON.parse(attributes.identities);
  if (!Array.isArray(identities))
    throw new Error('Cognito identities is not an array');
  return identities;
};

const userProvider = (user) => {
  const identities = parseIdentities(user.attributes);
  if (identities.length === 0) return 'Cognito';
  if (identities.length !== 1 || identities[0].providerName !== 'Google') {
    throw new Error(
      `Unsupported identity configuration for source user ${user.username}`
    );
  }
  return 'Google';
};

const awsServices = (environment) => {
  const credentials = new AWS.SsoCredentials({ profile: environment.profile });
  const common = { credentials, region: config.region };
  return {
    cognito: new AWS.CognitoIdentityServiceProvider(common),
    dynamodb: new AWS.DynamoDB.DocumentClient(common),
    s3: new AWS.S3(common),
    sts: new AWS.STS(common),
  };
};

const assertAccount = async (services, environment) => {
  const identity = await services.sts.getCallerIdentity({}).promise();
  if (identity.Account !== environment.accountId) {
    throw new Error(
      `Profile ${environment.profile} resolved to account ${identity.Account}, expected ${environment.accountId}`
    );
  }
  return identity;
};

const listCognitoUsers = async (cognito, userPoolId) => {
  const users = [];
  let PaginationToken;
  do {
    const response = await cognito
      .listUsers({ UserPoolId: userPoolId, PaginationToken })
      .promise();
    users.push(...(response.Users || []));
    PaginationToken = response.PaginationToken;
  } while (PaginationToken);
  return users;
};

const listGroupUsers = async (cognito, userPoolId, groupName) => {
  const users = [];
  let NextToken;
  do {
    const response = await cognito
      .listUsersInGroup({
        UserPoolId: userPoolId,
        GroupName: groupName,
        NextToken,
      })
      .promise();
    users.push(...(response.Users || []));
    NextToken = response.NextToken;
  } while (NextToken);
  return users;
};

const scanTable = async (dynamodb, tableName) => {
  const records = [];
  let ExclusiveStartKey;
  do {
    const response = await dynamodb
      .scan({ TableName: tableName, ExclusiveStartKey, ConsistentRead: true })
      .promise();
    records.push(...(response.Items || []));
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return records;
};

const listS3Objects = async (s3, bucket) => {
  const objects = [];
  let ContinuationToken;
  do {
    const response = await s3
      .listObjectsV2({ Bucket: bucket, ContinuationToken })
      .promise();
    objects.push(...(response.Contents || []));
    ContinuationToken = response.NextContinuationToken;
  } while (ContinuationToken);
  return objects;
};

const exportSource = async (directory, sourceWritesFrozen) => {
  const services = awsServices(config.source);
  const identity = await assertAccount(services, config.source);
  const sourceDirectory = path.join(directory, 'source');
  const tablesDirectory = path.join(sourceDirectory, 'tables');
  const imagesDirectory = path.join(sourceDirectory, 'images');
  ensureDirectory(tablesDirectory);
  ensureDirectory(imagesDirectory);

  const [rawUsers, rawAdmins] = await Promise.all([
    listCognitoUsers(services.cognito, config.source.userPoolId),
    listGroupUsers(
      services.cognito,
      config.source.userPoolId,
      config.adminGroup
    ),
  ]);
  const adminUsernames = new Set(rawAdmins.map((user) => user.Username));
  const users = rawUsers.map((user) => ({
    username: user.Username,
    enabled: user.Enabled,
    status: user.UserStatus,
    createdAt: user.UserCreateDate?.toISOString(),
    updatedAt: user.UserLastModifiedDate?.toISOString(),
    attributes: attributeMap(user.Attributes),
    isAdmin: adminUsernames.has(user.Username),
  }));
  writeJson(path.join(sourceDirectory, 'users.json'), users);

  const tableSummary = {};
  for (const model of config.models) {
    const records = await scanTable(
      services.dynamodb,
      config.source.tables[model]
    );
    writeJson(path.join(tablesDirectory, `${model}.json`), records);
    tableSummary[model] = {
      count: records.length,
      checksum: checksumRecords(records),
    };
  }

  const objectList = await listS3Objects(services.s3, config.source.bucket);
  const imageManifest = [];
  for (const object of objectList) {
    if (!object.Key) continue;
    const response = await services.s3
      .getObject({ Bucket: config.source.bucket, Key: object.Key })
      .promise();
    const body = Buffer.from(response.Body || []);
    const file = `${sha256(object.Key)}.bin`;
    const filePath = path.join(imagesDirectory, file);
    fs.writeFileSync(filePath, body, { mode: 0o600 });
    fs.chmodSync(filePath, 0o600);
    imageManifest.push({
      key: object.Key,
      file,
      size: body.length,
      sha256: sha256(body),
      contentType: response.ContentType,
      cacheControl: response.CacheControl,
      contentDisposition: response.ContentDisposition,
      contentEncoding: response.ContentEncoding,
      metadata: response.Metadata || {},
    });
  }
  imageManifest.sort((left, right) => left.key.localeCompare(right.key));
  writeJson(path.join(sourceDirectory, 'images.json'), imageManifest);

  writeJson(path.join(sourceDirectory, 'manifest.json'), {
    exportedAt: new Date().toISOString(),
    sourceAccountId: config.source.accountId,
    sourceRoleArn: identity.Arn,
    sourceUserPoolId: config.source.userPoolId,
    sourceWritesFrozen,
    userCount: users.length,
    usersChecksum: sha256(stableJson(users)),
    adminCount: rawAdmins.length,
    tables: tableSummary,
    images: {
      count: imageManifest.length,
      bytes: imageManifest.reduce((total, image) => total + image.size, 0),
      checksum: sha256(stableJson(imageManifest)),
    },
  });

  console.log(
    `Exported ${users.length} users, ${config.models.length} tables, and ${imageManifest.length} images to ${sourceDirectory}`
  );
  if (!sourceWritesFrozen) {
    console.warn(
      'This export is marked as a rehearsal snapshot and cannot be applied. Use --confirm-source-frozen for the final export.'
    );
  }
};

const validateSourceArtifacts = (directory) => {
  const sourceDirectory = path.join(directory, 'source');
  const manifestPath = path.join(sourceDirectory, 'manifest.json');
  const manifest = readJson(manifestPath);
  if (
    manifest.sourceAccountId !== config.source.accountId ||
    manifest.sourceUserPoolId !== config.source.userPoolId
  ) {
    throw new Error('Source manifest belongs to another AWS environment');
  }
  const users = readJson(path.join(sourceDirectory, 'users.json'));
  if (
    manifest.userCount !== users.length ||
    manifest.usersChecksum !== sha256(stableJson(users))
  ) {
    throw new Error('Source Cognito export failed checksum validation');
  }
  const tables = Object.fromEntries(
    config.models.map((model) => {
      const records = readJson(
        path.join(sourceDirectory, 'tables', `${model}.json`)
      );
      const expected = manifest.tables[model];
      if (
        !expected ||
        expected.count !== records.length ||
        expected.checksum !== checksumRecords(records)
      ) {
        throw new Error(`Source ${model} export failed checksum validation`);
      }
      return [model, records];
    })
  );
  const images = readJson(path.join(sourceDirectory, 'images.json'));
  if (
    manifest.images.count !== images.length ||
    manifest.images.checksum !== sha256(stableJson(images))
  ) {
    throw new Error('Source image manifest failed checksum validation');
  }
  return { manifest, manifestPath, users, tables, images };
};

const buildIdentityReview = (users, profiles = []) => {
  const groupsByEmail = new Map();
  for (const user of users) {
    const email = normalizeEmail(user.attributes.email);
    const sourceSub = user.attributes.sub;
    if (!email || !sourceSub) {
      throw new Error(`Source user ${user.username} is missing email or sub`);
    }
    const identity = parseIdentities(user.attributes)[0];
    const summary = {
      sourceSub,
      sourceUsername: user.username,
      provider: userProvider(user),
      emailVerified: user.attributes.email_verified === 'true',
      enabled: user.enabled !== false,
      isAdmin: Boolean(user.isAdmin),
      googleSubject: identity?.userId,
    };
    const group = groupsByEmail.get(email) || [];
    group.push(summary);
    groupsByEmail.set(email, group);
  }

  return {
    generatedAt: new Date().toISOString(),
    instructions:
      'Review every group, then set approved to true. Duplicate native-plus-Google groups are intentionally merged.',
    groups: [...groupsByEmail.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([email, sourceUsers]) => {
        const nativeUsers = sourceUsers.filter(
          (user) => user.provider === 'Cognito'
        );
        const googleUsers = sourceUsers.filter(
          (user) => user.provider === 'Google'
        );
        if (sourceUsers.length > 1) {
          if (
            sourceUsers.length !== 2 ||
            nativeUsers.length !== 1 ||
            googleUsers.length !== 1
          ) {
            throw new Error(
              `Duplicate email group ${sha256(email).slice(0, 12)} is not one native plus one Google user`
            );
          }
        }
        const sourceSubjects = new Set(
          sourceUsers.map((user) => user.sourceSub)
        );
        const profileCandidates = profiles
          .filter((profile) => sourceSubjects.has(profile.userId))
          .sort((left, right) =>
            String(right.updatedAt || '').localeCompare(
              String(left.updatedAt || '')
            )
          )
          .map((profile) => ({
            id: profile.id,
            username: profile.username,
            updatedAt: profile.updatedAt,
            userId: profile.userId,
          }));
        const tiedLatest =
          profileCandidates.length > 1 &&
          profileCandidates[0].updatedAt === profileCandidates[1].updatedAt;
        if (tiedLatest) {
          throw new Error(
            `Profile candidates for group ${sha256(email).slice(0, 12)} have no unique latest record`
          );
        }
        return {
          groupId: sha256(email).slice(0, 12),
          email,
          destinationUsername: email,
          decision: sourceUsers.length > 1 ? 'merge' : 'create',
          attributeSourceSub: (nativeUsers[0] || sourceUsers[0]).sourceSub,
          approved: false,
          adminApproved: !sourceUsers.some((user) => user.isAdmin),
          profileSelection: {
            selectedProfileId: profileCandidates[0]?.id || null,
            approved: profileCandidates.length <= 1,
            candidates: profileCandidates,
          },
          sourceUsers: sourceUsers.sort((left, right) =>
            left.sourceSub.localeCompare(right.sourceSub)
          ),
        };
      }),
  };
};

const immutableReviewGroup = (group) => ({
  groupId: group.groupId,
  email: group.email,
  destinationUsername: group.destinationUsername,
  decision: group.decision,
  attributeSourceSub: group.attributeSourceSub,
  sourceUsers: group.sourceUsers,
  profileCandidates: group.profileSelection?.candidates || [],
});

const validateIdentityReview = (review, users, profiles) => {
  if (
    review.sourceUsersChecksum !== sha256(stableJson(users)) ||
    review.sourceProfilesChecksum !== checksumRecords(profiles)
  ) {
    throw new Error('identity-review.json does not match the source export');
  }
  const expected = buildIdentityReview(users, profiles);
  if (expected.groups.length !== review.groups.length) {
    throw new Error('identity-review.json has an unexpected group count');
  }
  const expectedById = new Map(
    expected.groups.map((group) => [group.groupId, group])
  );
  for (const group of review.groups) {
    const expectedGroup = expectedById.get(group.groupId);
    if (
      !expectedGroup ||
      stableJson(immutableReviewGroup(group)) !==
        stableJson(immutableReviewGroup(expectedGroup))
    ) {
      throw new Error(
        `Immutable identity review data changed for ${group.groupId}`
      );
    }
    const candidateIds = new Set(
      expectedGroup.profileSelection.candidates.map((profile) => profile.id)
    );
    const selectedProfileId = group.profileSelection?.selectedProfileId;
    if (
      (candidateIds.size === 0 && selectedProfileId !== null) ||
      (candidateIds.size > 0 && !candidateIds.has(selectedProfileId))
    ) {
      throw new Error(`Invalid profile selection for ${group.groupId}`);
    }
  }
};

const planUsers = (directory, force) => {
  const outputPath = path.join(directory, 'identity-review.json');
  if (fs.existsSync(outputPath) && !force) {
    throw new Error(
      `${outputPath} already exists; use --force only if prior review decisions can be discarded`
    );
  }
  const { users, tables } = validateSourceArtifacts(directory);
  const profiles = tables.UserProfile;
  const review = buildIdentityReview(users, profiles);
  review.sourceUsersChecksum = sha256(stableJson(users));
  review.sourceProfilesChecksum = checksumRecords(profiles);
  writeJson(outputPath, review);
  const mergeGroups = review.groups.filter(
    (group) => group.decision === 'merge'
  ).length;
  console.log(
    `Wrote ${review.groups.length} destination identity groups (${mergeGroups} merges) to ${outputPath}`
  );
  console.log(
    'Review every group and set approved to true before seeding users.'
  );
};

const approveReview = (directory, options) => {
  const { users, tables } = validateSourceArtifacts(directory);
  const reviewPath = path.join(directory, 'identity-review.json');
  const review = readJson(reviewPath);
  validateIdentityReview(review, users, tables.UserProfile);
  if (
    options['approve-all-identities'] !== true ||
    options['approve-all-admins'] !== true ||
    options['approve-suggested-profiles'] !== true
  ) {
    throw new Error(
      'Approval requires --approve-all-identities --approve-all-admins --approve-suggested-profiles'
    );
  }
  let adminGrants = 0;
  let profileConflicts = 0;
  for (const group of review.groups) {
    group.approved = true;
    if (group.sourceUsers.some((user) => user.isAdmin)) {
      group.adminApproved = true;
      adminGrants += 1;
    }
    if ((group.profileSelection?.candidates?.length || 0) > 1) {
      group.profileSelection.approved = true;
      profileConflicts += 1;
    }
  }
  review.approvedAt = new Date().toISOString();
  review.approvalPolicy = {
    identities: 'all-reviewed-groups',
    administrators: 'preserve-all-source-memberships',
    profiles: 'use-suggested-uniquely-newest-record',
  };
  writeJson(reviewPath, review);
  console.log(
    `Approved ${review.groups.length} identity groups, ${adminGrants} administrator grants, and ${profileConflicts} profile conflicts`
  );
};

const findDestinationUserByEmail = async (cognito, email) => {
  const response = await cognito
    .listUsers({
      UserPoolId: config.destination.userPoolId,
      Filter: `email = "${email.replace(/["\\]/g, '\\$&')}"`,
      Limit: 10,
    })
    .promise();
  const exact = (response.Users || []).filter(
    (user) => normalizeEmail(attributeMap(user.Attributes).email) === email
  );
  if (exact.length > 1) {
    throw new Error(`Destination has multiple users for reviewed email group`);
  }
  return exact[0];
};

const destinationAttributes = (group, sourceUsers) => {
  const source = sourceUsers.find(
    (user) => user.attributes.sub === group.attributeSourceSub
  );
  if (!source) {
    throw new Error(`Attribute source is invalid for group ${group.groupId}`);
  }
  const attributes = [{ Name: 'email', Value: group.email }];
  const anyVerified = group.sourceUsers.some((user) => user.emailVerified);
  if (anyVerified) attributes.push({ Name: 'email_verified', Value: 'true' });
  for (const name of ALLOWED_COGNITO_ATTRIBUTES) {
    const value = source.attributes[name];
    if (value !== undefined && value !== '')
      attributes.push({ Name: name, Value: value });
  }
  return attributes;
};

const randomTemporaryPassword = () =>
  `Ak1!${crypto.randomBytes(24).toString('base64url')}`;

const hasLinkedGoogleIdentity = (user, googleSubject) => {
  const attributes = attributeMap(user.Attributes);
  return parseIdentities(attributes).some(
    (identity) =>
      identity.providerName === 'Google' && identity.userId === googleSubject
  );
};

const identityProgressChecksum = (progress) =>
  sha256(
    stableJson({
      destinationAccountId: progress.destinationAccountId,
      destinationUserPoolId: progress.destinationUserPoolId,
      sourceManifestChecksum: progress.sourceManifestChecksum,
      reviewChecksum: progress.reviewChecksum,
      groups: progress.groups.map((group) => ({
        groupId: group.groupId,
        destinationUsername: group.destinationUsername,
        destinationSub: group.destinationSub,
        linkedGoogleSubjects: group.linkedGoogleSubjects || [],
        adminApplied: Boolean(group.adminApplied),
        enabledStateApplied: Boolean(group.enabledStateApplied),
      })),
    })
  );

const seedUsers = async (directory, apply) => {
  const {
    manifest: sourceManifest,
    manifestPath: sourceManifestPath,
    users,
    tables,
  } = validateSourceArtifacts(directory);
  const reviewPath = path.join(directory, 'identity-review.json');
  const review = readJson(reviewPath);
  validateIdentityReview(review, users, tables.UserProfile);
  if (apply && sourceManifest.sourceWritesFrozen !== true) {
    throw new Error(
      'Apply mode requires a final export created with --confirm-source-frozen'
    );
  }
  const unapproved = review.groups.filter((group) => group.approved !== true);
  if (unapproved.length > 0) {
    throw new Error(
      `${unapproved.length} identity groups are not approved in identity-review.json`
    );
  }
  const unapprovedAdmins = review.groups.filter(
    (group) =>
      group.sourceUsers.some((user) => user.isAdmin) &&
      group.adminApproved !== true
  );
  if (unapprovedAdmins.length > 0) {
    throw new Error(
      `${unapprovedAdmins.length} administrator grants are not separately approved`
    );
  }
  const profileConflicts = review.groups.filter(
    (group) =>
      group.profileSelection?.candidates?.length > 1 &&
      group.profileSelection.approved !== true
  );
  if (profileConflicts.length > 0) {
    throw new Error(
      `${profileConflicts.length} profile selections are not approved`
    );
  }

  const services = awsServices(config.destination);
  await assertAccount(services, config.destination);
  const progressPath = path.join(directory, 'identity-progress.json');
  const reviewChecksum = fileChecksum(reviewPath);
  const sourceManifestChecksum = fileChecksum(sourceManifestPath);
  const progress = fs.existsSync(progressPath)
    ? readJson(progressPath)
    : {
        createdAt: new Date().toISOString(),
        destinationAccountId: config.destination.accountId,
        destinationUserPoolId: config.destination.userPoolId,
        sourceManifestChecksum,
        reviewChecksum,
        groups: [],
      };
  if (
    progress.destinationAccountId !== config.destination.accountId ||
    progress.destinationUserPoolId !== config.destination.userPoolId ||
    progress.sourceManifestChecksum !== sourceManifestChecksum ||
    progress.reviewChecksum !== reviewChecksum
  ) {
    throw new Error(
      'identity-progress.json is stale or belongs to another migration'
    );
  }
  const progressByGroup = new Map(
    progress.groups.map((group) => [group.groupId, group])
  );
  const existingDestinationUsers = await listCognitoUsers(
    services.cognito,
    config.destination.userPoolId
  );
  const trackedSubs = new Set(
    progress.groups.map((group) => group.destinationSub)
  );
  const unexpectedUsers = existingDestinationUsers.filter(
    (user) => !trackedSubs.has(attributeMap(user.Attributes).sub)
  );
  if (unexpectedUsers.length > 0) {
    throw new Error(
      `Destination pool contains ${unexpectedUsers.length} users not recorded in identity-progress.json`
    );
  }
  const mappings = [];
  const actions = [];

  for (const group of review.groups) {
    let groupProgress = progressByGroup.get(group.groupId);
    let destinationUser;
    if (groupProgress) {
      destinationUser = await services.cognito
        .adminGetUser({
          UserPoolId: config.destination.userPoolId,
          Username: groupProgress.destinationUsername,
        })
        .promise();
      if (
        attributeMap(destinationUser.UserAttributes).sub !==
        groupProgress.destinationSub
      ) {
        throw new Error(
          `Tracked destination identity changed for ${group.groupId}`
        );
      }
      destinationUser = {
        Username: destinationUser.Username,
        Attributes: destinationUser.UserAttributes,
        Enabled: destinationUser.Enabled,
        UserStatus: destinationUser.UserStatus,
      };
    } else {
      const emailMatch = await findDestinationUserByEmail(
        services.cognito,
        group.email
      );
      if (emailMatch) {
        throw new Error(
          `Destination email match for ${group.groupId} was not created by this migration`
        );
      }
    }
    if (!destinationUser) {
      actions.push(`create:${group.groupId}`);
      if (apply) {
        const response = await services.cognito
          .adminCreateUser({
            UserPoolId: config.destination.userPoolId,
            Username: group.destinationUsername,
            MessageAction: 'SUPPRESS',
            TemporaryPassword: randomTemporaryPassword(),
            UserAttributes: destinationAttributes(group, users),
          })
          .promise();
        destinationUser = response.User;
        const createdAttributes = attributeMap(destinationUser.Attributes);
        if (!createdAttributes.sub) {
          throw new Error(
            `Created destination user has no sub for ${group.groupId}`
          );
        }
        groupProgress = {
          groupId: group.groupId,
          destinationUsername: destinationUser.Username,
          destinationSub: createdAttributes.sub,
          linkedGoogleSubjects: [],
          adminApplied: false,
          enabledStateApplied: false,
        };
        progress.groups.push(groupProgress);
        progressByGroup.set(group.groupId, groupProgress);
        writeJson(progressPath, progress);
      }
    }

    const googleUsers = group.sourceUsers.filter(
      (user) => user.provider === 'Google'
    );
    for (const googleUser of googleUsers) {
      if (!googleUser.googleSubject) {
        throw new Error(`Google subject missing for group ${group.groupId}`);
      }
      const linked =
        destinationUser &&
        (hasLinkedGoogleIdentity(destinationUser, googleUser.googleSubject) ||
          groupProgress?.linkedGoogleSubjects?.includes(
            googleUser.googleSubject
          ));
      if (!linked) {
        actions.push(`link-google:${group.groupId}`);
        if (apply) {
          await services.cognito
            .adminLinkProviderForUser({
              UserPoolId: config.destination.userPoolId,
              DestinationUser: {
                ProviderName: 'Cognito',
                ProviderAttributeValue: destinationUser.Username,
              },
              SourceUser: {
                ProviderName: 'Google',
                ProviderAttributeName: 'Cognito_Subject',
                ProviderAttributeValue: googleUser.googleSubject,
              },
            })
            .promise();
          groupProgress.linkedGoogleSubjects = [
            ...new Set([
              ...(groupProgress.linkedGoogleSubjects || []),
              googleUser.googleSubject,
            ]),
          ];
          writeJson(progressPath, progress);
        }
      }
    }

    if (group.sourceUsers.some((user) => user.isAdmin)) {
      if (!groupProgress?.adminApplied)
        actions.push(`ensure-admin:${group.groupId}`);
      if (apply && !groupProgress.adminApplied) {
        await services.cognito
          .adminAddUserToGroup({
            UserPoolId: config.destination.userPoolId,
            Username: destinationUser.Username,
            GroupName: config.adminGroup,
          })
          .promise();
        groupProgress.adminApplied = true;
        writeJson(progressPath, progress);
      }
    }

    const shouldBeEnabled = group.sourceUsers.some((user) => user.enabled);
    if (!groupProgress?.enabledStateApplied) {
      actions.push(
        `${shouldBeEnabled ? 'enable' : 'disable'}:${group.groupId}`
      );
      if (apply) {
        const operation = shouldBeEnabled
          ? services.cognito.adminEnableUser.bind(services.cognito)
          : services.cognito.adminDisableUser.bind(services.cognito);
        await operation({
          UserPoolId: config.destination.userPoolId,
          Username: destinationUser.Username,
        }).promise();
        groupProgress.enabledStateApplied = true;
        writeJson(progressPath, progress);
      }
    }

    if (apply) {
      const refreshed = await services.cognito
        .adminGetUser({
          UserPoolId: config.destination.userPoolId,
          Username: destinationUser.Username,
        })
        .promise();
      const attributes = attributeMap(refreshed.UserAttributes);
      if (!attributes.sub) {
        throw new Error(`Destination sub missing for group ${group.groupId}`);
      }
      for (const sourceUser of group.sourceUsers) {
        mappings.push({
          sourceSub: sourceUser.sourceSub,
          destinationSub: attributes.sub,
          destinationUsername: refreshed.Username,
          groupId: group.groupId,
        });
      }
    }
  }

  console.log(
    `${apply ? 'Applied' : 'Planned'} ${actions.length} Cognito actions across ${review.groups.length} destination users`
  );
  if (!apply) {
    console.log('Dry run only. Re-run with --apply after reviewing the plan.');
    return;
  }

  writeJson(path.join(directory, 'identity-map.json'), {
    generatedAt: new Date().toISOString(),
    destinationAccountId: config.destination.accountId,
    destinationUserPoolId: config.destination.userPoolId,
    sourceManifestChecksum,
    reviewChecksum,
    progressChecksum: identityProgressChecksum(progress),
    sourceUserCount: users.length,
    destinationUserCount: review.groups.length,
    mappings,
    profileSelections: review.groups
      .filter((group) => group.profileSelection?.selectedProfileId)
      .map((group) => {
        const destinationSub = mappings.find(
          (mapping) => mapping.groupId === group.groupId
        )?.destinationSub;
        return {
          groupId: group.groupId,
          destinationSub,
          selectedProfileId: group.profileSelection.selectedProfileId,
        };
      }),
  });
  console.log(`Wrote ${mappings.length} subject mappings to identity-map.json`);
};

const validateIdentityMap = (
  identityMap,
  review,
  reviewPath,
  sourceManifestPath,
  progressPath
) => {
  if (
    identityMap.destinationAccountId !== config.destination.accountId ||
    identityMap.destinationUserPoolId !== config.destination.userPoolId ||
    identityMap.reviewChecksum !== fileChecksum(reviewPath) ||
    identityMap.sourceManifestChecksum !== fileChecksum(sourceManifestPath) ||
    identityMap.progressChecksum !==
      identityProgressChecksum(readJson(progressPath))
  ) {
    throw new Error(
      'identity-map.json is stale or belongs to another migration'
    );
  }
  const expectedSourceUsers = review.groups.flatMap((group) =>
    group.sourceUsers.map((user) => ({
      sourceSub: user.sourceSub,
      groupId: group.groupId,
    }))
  );
  if (
    identityMap.sourceUserCount !== expectedSourceUsers.length ||
    identityMap.mappings.length !== expectedSourceUsers.length
  ) {
    throw new Error(
      'Identity map does not contain one row per reviewed source user'
    );
  }
  const mappingsBySource = new Map();
  for (const mapping of identityMap.mappings) {
    if (mappingsBySource.has(mapping.sourceSub)) {
      throw new Error('Identity map contains a duplicate source subject');
    }
    mappingsBySource.set(mapping.sourceSub, mapping);
  }
  for (const expected of expectedSourceUsers) {
    const mapping = mappingsBySource.get(expected.sourceSub);
    if (!mapping || mapping.groupId !== expected.groupId) {
      throw new Error(
        'Identity map source subject is assigned to the wrong group'
      );
    }
  }
  const progress = readJson(progressPath);
  if (
    progress.destinationAccountId !== config.destination.accountId ||
    progress.destinationUserPoolId !== config.destination.userPoolId ||
    progress.sourceManifestChecksum !== fileChecksum(sourceManifestPath) ||
    progress.reviewChecksum !== fileChecksum(reviewPath)
  ) {
    throw new Error(
      'identity-progress.json is stale or belongs to another migration'
    );
  }
  const progressByGroup = new Map(
    progress.groups.map((group) => [group.groupId, group])
  );
  const destinationPairsAcrossGroups = new Set();
  for (const group of review.groups) {
    const groupMappings = identityMap.mappings.filter(
      (mapping) => mapping.groupId === group.groupId
    );
    const destinationPairs = new Set(
      groupMappings.map(
        (mapping) => `${mapping.destinationSub}:${mapping.destinationUsername}`
      )
    );
    if (
      groupMappings.length !== group.sourceUsers.length ||
      destinationPairs.size !== 1
    ) {
      throw new Error(
        `Identity map destination differs within ${group.groupId}`
      );
    }
    const destinationPair = [...destinationPairs][0];
    if (destinationPairsAcrossGroups.has(destinationPair)) {
      throw new Error(
        'Identity map reuses a destination across reviewed groups'
      );
    }
    destinationPairsAcrossGroups.add(destinationPair);
    const groupProgress = progressByGroup.get(group.groupId);
    if (
      !groupProgress ||
      groupProgress.destinationSub !== groupMappings[0].destinationSub ||
      groupProgress.destinationUsername !== groupMappings[0].destinationUsername
    ) {
      throw new Error(
        `Identity map differs from progress for ${group.groupId}`
      );
    }
    const profileSelection = (identityMap.profileSelections || []).find(
      (selection) => selection.groupId === group.groupId
    );
    const expectedProfileId = group.profileSelection?.selectedProfileId;
    if (
      (expectedProfileId &&
        (!profileSelection ||
          profileSelection.selectedProfileId !== expectedProfileId ||
          profileSelection.destinationSub !==
            groupMappings[0].destinationSub)) ||
      (!expectedProfileId && profileSelection)
    ) {
      throw new Error(
        `Identity map profile selection differs for ${group.groupId}`
      );
    }
  }
  const expectedProfileSelectionCount = review.groups.filter(
    (group) => group.profileSelection?.selectedProfileId
  ).length;
  if (
    (identityMap.profileSelections || []).length !==
    expectedProfileSelectionCount
  ) {
    throw new Error('Identity map contains unexpected profile selections');
  }
};

const sendPasswordResets = async (directory, apply) => {
  const sourceArtifacts = validateSourceArtifacts(directory);
  const reviewPath = path.join(directory, 'identity-review.json');
  const review = readJson(reviewPath);
  validateIdentityReview(
    review,
    sourceArtifacts.users,
    sourceArtifacts.tables.UserProfile
  );
  const identityMap = readJson(path.join(directory, 'identity-map.json'));
  const progressPath = path.join(directory, 'identity-progress.json');
  validateIdentityMap(
    identityMap,
    review,
    reviewPath,
    sourceArtifacts.manifestPath,
    progressPath
  );
  const progress = readJson(progressPath);
  const services = awsServices(config.destination);
  await assertAccount(services, config.destination);
  let resets = 0;

  for (const group of review.groups) {
    const hasNativeUser = group.sourceUsers.some(
      (user) => user.provider === 'Cognito'
    );
    const shouldBeEnabled = group.sourceUsers.some((user) => user.enabled);
    if (!hasNativeUser || !shouldBeEnabled) continue;
    const mapping = identityMap.mappings.find(
      (candidate) => candidate.groupId === group.groupId
    );
    const groupProgress = progress.groups.find(
      (candidate) => candidate.groupId === group.groupId
    );
    if (!mapping || !groupProgress) {
      throw new Error(`Missing seeded identity for ${group.groupId}`);
    }
    if (
      groupProgress.destinationUsername !== mapping.destinationUsername ||
      groupProgress.destinationSub !== mapping.destinationSub
    ) {
      throw new Error(`Identity progress differs for ${group.groupId}`);
    }
    if (groupProgress.passwordResetSentAt) continue;
    resets += 1;
    if (apply) {
      await services.cognito
        .adminResetUserPassword({
          UserPoolId: config.destination.userPoolId,
          Username: mapping.destinationUsername,
        })
        .promise();
      groupProgress.passwordResetSentAt = new Date().toISOString();
      writeJson(progressPath, progress);
    }
  }

  console.log(`${resets} native-account password reset messages to send`);
  console.log(
    apply
      ? 'Password reset messages sent'
      : 'Dry run only. Re-run with --apply to send password reset messages.'
  );
};

const latestRecord = (records, label) => {
  const sorted = [...records].sort((left, right) =>
    String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''))
  );
  if (
    sorted.length > 1 &&
    String(sorted[0].updatedAt || '') === String(sorted[1].updatedAt || '')
  ) {
    throw new Error(`${label} has no unique latest record`);
  }
  return sorted[0];
};

const canonicalize = (records, keyFor, label) => {
  const groups = new Map();
  for (const record of records) {
    const key = keyFor(record);
    const group = groups.get(key) || [];
    group.push(record);
    groups.set(key, group);
  }
  const kept = [];
  const dropped = [];
  for (const [key, group] of groups) {
    const selected = latestRecord(group, `${label} ${key}`);
    kept.push(selected);
    dropped.push(...group.filter((record) => record.id !== selected.id));
  }
  return { kept, dropped };
};

const transformDataRecords = (
  tables,
  mappings,
  profileSelections = [],
  imageKeys
) => {
  const subjectMap = new Map(
    mappings.map(({ sourceSub, destinationSub }) => [sourceSub, destinationSub])
  );
  const mapSubject = (value, field) => {
    if (value === undefined || value === null || value === '') return value;
    const destination = subjectMap.get(value);
    if (!destination) throw new Error(`No identity mapping for ${field}`);
    return destination;
  };
  const mapModeration = (record, model) => ({
    ...record,
    ...(record.hiddenBy
      ? { hiddenBy: mapSubject(record.hiddenBy, `${model}.hiddenBy`) }
      : {}),
    ...(record.moderationUpdatedBy
      ? {
          moderationUpdatedBy: mapSubject(
            record.moderationUpdatedBy,
            `${model}.moderationUpdatedBy`
          ),
        }
      : {}),
  });

  const rawProfiles = tables.UserProfile.map((record) =>
    mapModeration(
      {
        ...record,
        userId: mapSubject(record.userId, 'UserProfile.userId'),
      },
      'UserProfile'
    )
  );
  const selectedProfileByUser = new Map(
    profileSelections.map((selection) => [
      selection.destinationSub,
      selection.selectedProfileId,
    ])
  );
  const profileGroups = new Map();
  for (const profile of rawProfiles) {
    const group = profileGroups.get(profile.userId) || [];
    group.push(profile);
    profileGroups.set(profile.userId, group);
  }
  const keptProfiles = [];
  const droppedProfiles = [];
  for (const [userId, profiles] of profileGroups) {
    const selectedId = selectedProfileByUser.get(userId);
    if (profiles.length > 1 && !selectedId) {
      throw new Error(`No reviewed profile selection for destination user`);
    }
    const selected =
      profiles.find((profile) => profile.id === selectedId) ||
      (profiles.length === 1 ? profiles[0] : undefined);
    if (!selected) throw new Error(`Reviewed profile selection is not present`);
    keptProfiles.push(selected);
    droppedProfiles.push(
      ...profiles.filter((profile) => profile.id !== selected.id)
    );
  }
  const sourceRecipeIds = new Set(tables.Recipe.map((record) => record.id));
  const clearedSignatureProfiles = [];
  const migratedProfiles = keptProfiles.map((profile) => {
    const signatureRecipeId = profile.kitchenIdentity?.signatureRecipeId;
    if (!signatureRecipeId || sourceRecipeIds.has(signatureRecipeId)) {
      return profile;
    }
    const { signatureRecipeId: _missingSignature, ...kitchenIdentity } =
      profile.kitchenIdentity;
    clearedSignatureProfiles.push(profile.id);
    return { ...profile, kitchenIdentity };
  });
  const profileByUser = new Map(
    migratedProfiles.map((profile) => [profile.userId, profile])
  );
  const attributionFor = (userId, field, fallback) => {
    const profile = profileByUser.get(userId);
    if (!profile) {
      if (fallback) return fallback;
      throw new Error(`No migrated profile for ${field}`);
    }
    return `@${String(profile.username).replace(/^@/, '')}`;
  };
  const recipes = tables.Recipe.map((record) => {
    const ownerId = mapSubject(record.ownerId, 'Recipe.ownerId');
    return mapModeration(
      {
        ...record,
        ownerId,
        createdBy: attributionFor(ownerId, 'Recipe.createdBy'),
      },
      'Recipe'
    );
  });
  const rawFavorites = tables.Favorite.map((record) => ({
    ...record,
    userId: mapSubject(record.userId, 'Favorite.userId'),
  }));
  const favorites = canonicalize(
    rawFavorites,
    (record) => `${record.userId}:${record.recipeId}`,
    'Favorite user/recipe'
  );
  const comments = tables.Comment.map((record) => {
    const userId = mapSubject(record.userId, 'Comment.userId');
    return mapModeration(
      {
        ...record,
        userId,
        author: attributionFor(userId, 'Comment.author', record.author),
      },
      'Comment'
    );
  });
  const ingredientIds = new Set(tables.Ingredient.map((record) => record.id));
  const recipeIngredients = tables.RecipeIngredient.filter(
    (record) =>
      sourceRecipeIds.has(record.recipeId) &&
      ingredientIds.has(record.ingredientId)
  );
  const droppedRecipeIngredients = tables.RecipeIngredient.filter(
    (record) =>
      !sourceRecipeIds.has(record.recipeId) ||
      !ingredientIds.has(record.ingredientId)
  );

  const transformed = {
    Ingredient: tables.Ingredient,
    Recipe: recipes,
    UserProfile: migratedProfiles,
    RecipeIngredient: recipeIngredients,
    Favorite: favorites.kept,
    Comment: comments,
  };
  validateRelationships(transformed, imageKeys);
  return {
    tables: transformed,
    report: {
      droppedProfiles: droppedProfiles.map((record) => record.id),
      droppedFavorites: favorites.dropped.map((record) => record.id),
      droppedRecipeIngredients: droppedRecipeIngredients.map(
        (record) => record.id
      ),
      clearedSignatureProfiles,
      counts: Object.fromEntries(
        config.models.map((model) => [
          model,
          {
            source: tables[model].length,
            transformed: transformed[model].length,
          },
        ])
      ),
    },
  };
};

const validateRelationships = (tables, imageKeys) => {
  const ids = (model) => new Set(tables[model].map((record) => record.id));
  const recipeIds = ids('Recipe');
  const ingredientIds = ids('Ingredient');
  const commentIds = ids('Comment');
  const requireReference = (set, value, label) => {
    if (value && !set.has(value)) throw new Error(`Unresolved ${label}`);
  };

  for (const record of tables.RecipeIngredient) {
    requireReference(recipeIds, record.recipeId, 'RecipeIngredient.recipeId');
    requireReference(
      ingredientIds,
      record.ingredientId,
      'RecipeIngredient.ingredientId'
    );
  }
  for (const record of tables.Favorite) {
    requireReference(recipeIds, record.recipeId, 'Favorite.recipeId');
  }
  for (const record of tables.Comment) {
    requireReference(recipeIds, record.recipeId, 'Comment.recipeId');
    requireReference(commentIds, record.parentId, 'Comment.parentId');
  }
  for (const record of tables.UserProfile) {
    const signatureRecipeId = record.kitchenIdentity?.signatureRecipeId;
    requireReference(
      recipeIds,
      signatureRecipeId,
      'UserProfile.kitchenIdentity.signatureRecipeId'
    );
  }
  if (imageKeys) {
    for (const record of tables.Recipe) {
      if (
        record.imageUrl &&
        !/^https?:\/\//i.test(record.imageUrl) &&
        !imageKeys.has(record.imageUrl)
      ) {
        throw new Error(`Unresolved Recipe.imageUrl`);
      }
    }
  }
};

const transformData = (directory) => {
  const identityMapPath = path.join(directory, 'identity-map.json');
  const identityMap = readJson(identityMapPath);
  const reviewPath = path.join(directory, 'identity-review.json');
  const review = readJson(reviewPath);
  const {
    manifestPath: sourceManifestPath,
    users,
    tables,
    images,
  } = validateSourceArtifacts(directory);
  validateIdentityReview(review, users, tables.UserProfile);
  validateIdentityMap(
    identityMap,
    review,
    reviewPath,
    sourceManifestPath,
    path.join(directory, 'identity-progress.json')
  );
  const result = transformDataRecords(
    tables,
    identityMap.mappings,
    identityMap.profileSelections,
    new Set(images.map((image) => image.key))
  );
  const outputDirectory = path.join(directory, 'transformed', 'tables');
  for (const model of config.models) {
    writeJson(
      path.join(outputDirectory, `${model}.json`),
      result.tables[model]
    );
  }
  writeJson(path.join(directory, 'transformed', 'report.json'), result.report);
  writeJson(path.join(directory, 'transformed', 'manifest.json'), {
    generatedAt: new Date().toISOString(),
    sourceManifestChecksum: fileChecksum(sourceManifestPath),
    identityMapChecksum: fileChecksum(identityMapPath),
    tables: Object.fromEntries(
      config.models.map((model) => [
        model,
        {
          count: result.tables[model].length,
          checksum: checksumRecords(result.tables[model]),
        },
      ])
    ),
  });
  console.log(
    `Transformed ${config.models.length} models; dropped ${result.report.droppedProfiles.length} superseded profiles, ${result.report.droppedFavorites.length} duplicate favorites, and ${result.report.droppedRecipeIngredients.length} orphaned recipe ingredients; cleared ${result.report.clearedSignatureProfiles.length} missing signature recipe reference`
  );
};

const readTransformedArtifacts = (directory) => {
  const sourceArtifacts = validateSourceArtifacts(directory);
  const sourceManifestPath = sourceArtifacts.manifestPath;
  const identityMapPath = path.join(directory, 'identity-map.json');
  const identityMap = readJson(identityMapPath);
  const reviewPath = path.join(directory, 'identity-review.json');
  const review = readJson(reviewPath);
  validateIdentityReview(
    review,
    sourceArtifacts.users,
    sourceArtifacts.tables.UserProfile
  );
  validateIdentityMap(
    identityMap,
    review,
    reviewPath,
    sourceManifestPath,
    path.join(directory, 'identity-progress.json')
  );
  const transformedManifest = readJson(
    path.join(directory, 'transformed', 'manifest.json')
  );
  if (
    transformedManifest.sourceManifestChecksum !==
      fileChecksum(sourceManifestPath) ||
    transformedManifest.identityMapChecksum !== fileChecksum(identityMapPath)
  ) {
    throw new Error(
      'Transformed artifacts are stale or from another migration'
    );
  }
  const tables = Object.fromEntries(
    config.models.map((model) => {
      const records = readJson(
        path.join(directory, 'transformed', 'tables', `${model}.json`)
      );
      const expected = transformedManifest.tables[model];
      if (
        !expected ||
        expected.count !== records.length ||
        expected.checksum !== checksumRecords(records)
      ) {
        throw new Error(
          `Transformed ${model} artifact failed checksum validation`
        );
      }
      return [model, records];
    })
  );
  return { tables, transformedManifest };
};

const conditionalPut = async (dynamodb, tableName, record) => {
  await dynamodb
    .put({
      TableName: tableName,
      Item: record,
      ConditionExpression: 'attribute_not_exists(#id)',
      ExpressionAttributeNames: { '#id': 'id' },
    })
    .promise();
};

const seedData = async (directory, apply) => {
  const services = awsServices(config.destination);
  await assertAccount(services, config.destination);
  const { manifest: sourceManifest } = validateSourceArtifacts(directory);
  if (apply && sourceManifest.sourceWritesFrozen !== true) {
    throw new Error(
      'Apply mode requires a final export created with --confirm-source-frozen'
    );
  }
  const { tables } = readTransformedArtifacts(directory);
  for (const model of config.models) {
    const expected = tables[model];
    const existing = await scanTable(
      services.dynamodb,
      config.destination.tables[model]
    );
    const expectedById = new Map(expected.map((record) => [record.id, record]));
    for (const record of existing) {
      const expectedRecord = expectedById.get(record.id);
      if (
        !expectedRecord ||
        stableJson(expectedRecord) !== stableJson(record)
      ) {
        throw new Error(
          `${model} contains unexpected destination record ${record.id}`
        );
      }
    }
    const existingIds = new Set(existing.map((record) => record.id));
    const missing = expected.filter((record) => !existingIds.has(record.id));
    console.log(
      `${model}: ${missing.length} records to write, ${existing.length} already verified`
    );
    if (apply && missing.length > 0) {
      for (const record of missing) {
        await conditionalPut(
          services.dynamodb,
          config.destination.tables[model],
          record
        );
      }
    }
  }
  console.log(
    apply
      ? 'Destination data seeding complete'
      : 'Dry run only. Re-run with --apply to seed destination tables.'
  );
};

const imageMetadataMatches = (object, image) => {
  const equalOptional = (actual, expected) =>
    String(actual || '') === String(expected || '');
  if (
    !equalOptional(object.ContentType, image.contentType) ||
    !equalOptional(object.CacheControl, image.cacheControl) ||
    !equalOptional(object.ContentDisposition, image.contentDisposition) ||
    !equalOptional(object.ContentEncoding, image.contentEncoding)
  ) {
    return false;
  }
  return Object.entries(image.metadata || {}).every(
    ([key, value]) => object.Metadata?.[key.toLowerCase()] === value
  );
};

const seedImages = async (directory, apply) => {
  const services = awsServices(config.destination);
  await assertAccount(services, config.destination);
  const { manifest: sourceManifest, images: manifest } =
    validateSourceArtifacts(directory);
  if (apply && sourceManifest.sourceWritesFrozen !== true) {
    throw new Error(
      'Apply mode requires a final export created with --confirm-source-frozen'
    );
  }
  const existing = await listS3Objects(services.s3, config.destination.bucket);
  const existingKeys = new Set(existing.map((object) => object.Key));
  const expectedKeys = new Set(manifest.map((image) => image.key));
  for (const object of existing) {
    if (!expectedKeys.has(object.Key)) {
      throw new Error(`Unexpected destination image object ${object.Key}`);
    }
  }

  let missing = 0;
  for (const image of manifest) {
    if (existingKeys.has(image.key)) {
      const object = await services.s3
        .getObject({ Bucket: config.destination.bucket, Key: image.key })
        .promise();
      if (
        Number(object.ContentLength) !== image.size ||
        sha256(Buffer.from(object.Body || [])) !== image.sha256 ||
        !imageMetadataMatches(object, image)
      ) {
        throw new Error(
          `Destination image differs from migration snapshot: ${image.key}`
        );
      }
      continue;
    }
    missing += 1;
    if (apply) {
      const body = fs.readFileSync(
        path.join(directory, 'source', 'images', image.file)
      );
      if (body.length !== image.size || sha256(body) !== image.sha256) {
        throw new Error(`Local migration image failed checksum: ${image.key}`);
      }
      await services.s3
        .putObject({
          Bucket: config.destination.bucket,
          Key: image.key,
          Body: body,
          ContentType: image.contentType,
          CacheControl: image.cacheControl,
          ContentDisposition: image.contentDisposition,
          ContentEncoding: image.contentEncoding,
          ContentMD5: crypto.createHash('md5').update(body).digest('base64'),
          Metadata: {
            ...(image.metadata || {}),
            'migration-sha256': image.sha256,
          },
        })
        .promise();
    }
  }
  console.log(
    `${missing} images to write, ${manifest.length - missing} already verified`
  );
  console.log(
    apply
      ? 'Destination image seeding complete'
      : 'Dry run only. Re-run with --apply to seed destination images.'
  );
};

const requestOk = (url, expectedSha256) =>
  new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`${url} returned HTTP ${response.statusCode}`));
          return;
        }
        if (sha256(Buffer.concat(chunks)) !== expectedSha256) {
          reject(new Error(`${url} returned unexpected content`));
          return;
        }
        resolve();
      });
    });
    request.on('error', reject);
  });

const verify = async (directory) => {
  const services = awsServices(config.destination);
  await assertAccount(services, config.destination);
  const sourceArtifacts = validateSourceArtifacts(directory);
  const reviewPath = path.join(directory, 'identity-review.json');
  const review = readJson(reviewPath);
  const identityMap = readJson(path.join(directory, 'identity-map.json'));
  validateIdentityReview(
    review,
    sourceArtifacts.users,
    sourceArtifacts.tables.UserProfile
  );
  validateIdentityMap(
    identityMap,
    review,
    reviewPath,
    sourceArtifacts.manifestPath,
    path.join(directory, 'identity-progress.json')
  );
  const destinationUsers = await listCognitoUsers(
    services.cognito,
    config.destination.userPoolId
  );
  const destinationSubs = new Set(
    destinationUsers.map((user) => attributeMap(user.Attributes).sub)
  );
  if (destinationUsers.length !== identityMap.destinationUserCount) {
    throw new Error(
      'Destination Cognito user count does not match the reviewed plan'
    );
  }
  for (const mapping of identityMap.mappings) {
    if (!destinationSubs.has(mapping.destinationSub)) {
      throw new Error(`Mapped destination Cognito user is missing`);
    }
  }

  const expectedAdminUsernames = new Set();
  for (const group of review.groups) {
    const mapping = identityMap.mappings.find(
      (candidate) => candidate.groupId === group.groupId
    );
    if (!mapping)
      throw new Error(`Missing identity mapping for ${group.groupId}`);
    const user = await services.cognito
      .adminGetUser({
        UserPoolId: config.destination.userPoolId,
        Username: mapping.destinationUsername,
      })
      .promise();
    const attributes = attributeMap(user.UserAttributes);
    if (
      attributes.sub !== mapping.destinationSub ||
      normalizeEmail(attributes.email) !== group.email
    ) {
      throw new Error(
        `Destination Cognito attributes differ for ${group.groupId}`
      );
    }
    const linkedGoogleSubjects = new Set(
      parseIdentities(attributes)
        .filter((identity) => identity.providerName === 'Google')
        .map((identity) => identity.userId)
    );
    for (const sourceUser of group.sourceUsers) {
      if (
        sourceUser.provider === 'Google' &&
        !linkedGoogleSubjects.has(sourceUser.googleSubject)
      ) {
        throw new Error(`Google identity is not linked for ${group.groupId}`);
      }
    }
    const shouldBeEnabled = group.sourceUsers.some(
      (sourceUser) => sourceUser.enabled
    );
    if (Boolean(user.Enabled) !== shouldBeEnabled) {
      throw new Error(`Enabled state differs for ${group.groupId}`);
    }
    if (group.sourceUsers.some((sourceUser) => sourceUser.isAdmin)) {
      expectedAdminUsernames.add(user.Username);
    }
  }
  const actualAdmins = await listGroupUsers(
    services.cognito,
    config.destination.userPoolId,
    config.adminGroup
  );
  const actualAdminUsernames = new Set(
    actualAdmins.map((user) => user.Username)
  );
  if (
    stableJson([...actualAdminUsernames].sort()) !==
    stableJson([...expectedAdminUsernames].sort())
  ) {
    throw new Error(
      'Destination Admins membership does not match the reviewed plan'
    );
  }

  const { tables } = readTransformedArtifacts(directory);
  for (const model of config.models) {
    const expected = tables[model];
    const actual = await scanTable(
      services.dynamodb,
      config.destination.tables[model]
    );
    if (
      expected.length !== actual.length ||
      checksumRecords(expected) !== checksumRecords(actual)
    ) {
      throw new Error(`${model} reconciliation failed`);
    }
    console.log(`${model}: ${actual.length} records verified`);
  }

  const images = sourceArtifacts.images;
  const destinationObjects = await listS3Objects(
    services.s3,
    config.destination.bucket
  );
  if (destinationObjects.length !== images.length) {
    throw new Error('Recipe image object count does not match');
  }
  for (const image of images) {
    const object = await services.s3
      .getObject({ Bucket: config.destination.bucket, Key: image.key })
      .promise();
    if (
      Number(object.ContentLength) !== image.size ||
      sha256(Buffer.from(object.Body || [])) !== image.sha256 ||
      !imageMetadataMatches(object, image)
    ) {
      throw new Error(`Recipe image verification failed: ${image.key}`);
    }
    const encodedKey = image.key.split('/').map(encodeURIComponent).join('/');
    await requestOk(
      `https://${config.destination.cloudFrontDomain}/${encodedKey}`,
      image.sha256
    );
  }
  console.log(
    `Verified ${destinationUsers.length} destination users, ${config.models.length} tables, and ${images.length} recipe images`
  );
};

const main = async () => {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command || command === 'help' || options.help) {
    console.log(usage.trim());
    return;
  }
  validateOptions(command, options);
  const directory = requireDirectoryOption(options);
  switch (command) {
    case 'export-source':
      await exportSource(directory, options['confirm-source-frozen'] === true);
      break;
    case 'plan-users':
      planUsers(directory, options.force === true);
      break;
    case 'approve-review':
      approveReview(directory, options);
      break;
    case 'seed-users':
      await seedUsers(directory, options.apply === true);
      break;
    case 'send-password-resets':
      await sendPasswordResets(directory, options.apply === true);
      break;
    case 'transform-data':
      transformData(directory);
      break;
    case 'seed-images':
      await seedImages(directory, options.apply === true);
      break;
    case 'seed-data':
      await seedData(directory, options.apply === true);
      break;
    case 'verify':
      await verify(directory);
      break;
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`[migration] ${error.message}`);
    if (process.argv.includes('--debug')) console.error(error.stack);
    process.exitCode = 1;
  });
}

module.exports = {
  buildIdentityReview,
  checksumRecords,
  identityProgressChecksum,
  normalizeEmail,
  parseArgs,
  stableJson,
  transformDataRecords,
  validateIdentityMap,
  validateIdentityReview,
  validateOptions,
  validateRelationships,
};
