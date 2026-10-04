const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
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
} = require('./migrate-aws-account.cjs');

const user = ({ sub, email, provider = 'Cognito', isAdmin = false }) => ({
  username: provider === 'Google' ? `Google_${sub}` : email,
  isAdmin,
  attributes: {
    sub,
    email,
    email_verified: provider === 'Cognito' ? 'true' : 'false',
    ...(provider === 'Google'
      ? {
          identities: JSON.stringify([
            {
              providerName: 'Google',
              providerType: 'Google',
              userId: `google-${sub}`,
            },
          ]),
        }
      : {}),
  },
});

test('normalizes email addresses', () => {
  assert.equal(normalizeEmail('  Cook@Example.COM '), 'cook@example.com');
});

test('plans a reviewed merge for native and Google identities sharing email', () => {
  const review = buildIdentityReview([
    user({ sub: 'native', email: 'cook@example.com', isAdmin: true }),
    user({
      sub: 'google',
      email: 'COOK@example.com',
      provider: 'Google',
    }),
  ]);

  assert.equal(review.groups.length, 1);
  assert.equal(review.groups[0].decision, 'merge');
  assert.equal(review.groups[0].approved, false);
  assert.equal(review.groups[0].adminApproved, false);
  assert.equal(review.groups[0].attributeSourceSub, 'native');
  assert.deepEqual(
    review.groups[0].sourceUsers
      .map((sourceUser) => sourceUser.provider)
      .sort(),
    ['Cognito', 'Google']
  );
});

test('transforms subjects and canonicalizes profiles and favorites', () => {
  const tables = {
    Ingredient: [{ id: 'ingredient-1', name: 'salt' }],
    Recipe: [
      {
        id: 'recipe-1',
        ownerId: 'native',
        name: 'soup',
        updatedAt: '2026-01-01',
      },
    ],
    UserProfile: [
      {
        id: 'profile-old',
        userId: 'native',
        username: 'old',
        updatedAt: '2026-01-01',
      },
      {
        id: 'profile-new',
        userId: 'google',
        username: 'new',
        updatedAt: '2026-02-01',
      },
    ],
    RecipeIngredient: [
      {
        id: 'join-1',
        recipeId: 'recipe-1',
        ingredientId: 'ingredient-1',
        quantity: { amount: '1', unit: 'tsp' },
      },
    ],
    Favorite: [
      {
        id: 'favorite-old',
        userId: 'native',
        recipeId: 'recipe-1',
        updatedAt: '2026-01-01',
      },
      {
        id: 'favorite-new',
        userId: 'google',
        recipeId: 'recipe-1',
        updatedAt: '2026-02-01',
      },
    ],
    Comment: [
      {
        id: 'comment-1',
        userId: 'google',
        recipeId: 'recipe-1',
        content: 'Good',
      },
    ],
  };
  const result = transformDataRecords(
    tables,
    [
      { sourceSub: 'native', destinationSub: 'destination' },
      { sourceSub: 'google', destinationSub: 'destination' },
    ],
    [
      {
        destinationSub: 'destination',
        selectedProfileId: 'profile-new',
      },
    ]
  );

  assert.equal(result.tables.Recipe[0].ownerId, 'destination');
  assert.equal(result.tables.Recipe[0].createdBy, '@new');
  assert.deepEqual(
    result.tables.UserProfile.map((record) => record.id),
    ['profile-new']
  );
  assert.deepEqual(
    result.tables.Favorite.map((record) => record.id),
    ['favorite-new']
  );
  assert.equal(result.tables.Comment[0].userId, 'destination');
  assert.equal(result.tables.Comment[0].author, '@new');
  assert.deepEqual(result.report.droppedProfiles, ['profile-old']);
  assert.deepEqual(result.report.droppedFavorites, ['favorite-old']);
});

test('record checksums do not depend on record or object key order', () => {
  const left = [
    { id: 'b', value: { second: 2, first: 1 } },
    { id: 'a', value: true },
  ];
  const right = [
    { value: true, id: 'a' },
    { value: { first: 1, second: 2 }, id: 'b' },
  ];
  assert.equal(checksumRecords(left), checksumRecords(right));
});

test('fails transformation when an owner has no destination mapping', () => {
  assert.throws(
    () =>
      transformDataRecords(
        {
          Ingredient: [],
          Recipe: [{ id: 'recipe-1', ownerId: 'missing' }],
          UserProfile: [],
          RecipeIngredient: [],
          Favorite: [],
          Comment: [],
        },
        []
      ),
    /No identity mapping for Recipe.ownerId/
  );
});

test('preserves comment attribution when the migrated user has no profile', () => {
  const result = transformDataRecords(
    {
      Ingredient: [],
      Recipe: [{ id: 'recipe-1', ownerId: 'source-owner' }],
      UserProfile: [
        { id: 'profile-1', userId: 'source-owner', username: 'owner' },
      ],
      RecipeIngredient: [],
      Favorite: [],
      Comment: [
        {
          id: 'comment-1',
          userId: 'source-user',
          recipeId: 'recipe-1',
          author: '@historical-author',
        },
      ],
    },
    [
      { sourceSub: 'source-user', destinationSub: 'destination-user' },
      { sourceSub: 'source-owner', destinationSub: 'destination-owner' },
    ]
  );

  assert.equal(result.tables.Comment[0].userId, 'destination-user');
  assert.equal(result.tables.Comment[0].author, '@historical-author');
});

test('drops orphaned recipe joins and clears a missing signature recipe', () => {
  const result = transformDataRecords(
    {
      Ingredient: [{ id: 'ingredient-1' }],
      Recipe: [{ id: 'recipe-1', ownerId: 'source-owner' }],
      UserProfile: [
        {
          id: 'profile-1',
          userId: 'source-owner',
          username: 'owner',
          kitchenIdentity: {
            theme: 'moonlit',
            signatureRecipeId: 'deleted-recipe',
          },
        },
      ],
      RecipeIngredient: [
        {
          id: 'join-valid',
          recipeId: 'recipe-1',
          ingredientId: 'ingredient-1',
        },
        {
          id: 'join-orphan',
          recipeId: 'deleted-recipe',
          ingredientId: 'ingredient-1',
        },
      ],
      Favorite: [],
      Comment: [],
    },
    [{ sourceSub: 'source-owner', destinationSub: 'destination-owner' }]
  );

  assert.deepEqual(
    result.tables.RecipeIngredient.map((record) => record.id),
    ['join-valid']
  );
  assert.deepEqual(result.report.droppedRecipeIngredients, ['join-orphan']);
  assert.equal(
    result.tables.UserProfile[0].kitchenIdentity.signatureRecipeId,
    undefined
  );
  assert.equal(result.tables.UserProfile[0].kitchenIdentity.theme, 'moonlit');
  assert.deepEqual(result.report.clearedSignatureProfiles, ['profile-1']);
});

test('rejects apply values and unknown options', () => {
  assert.throws(
    () => validateOptions('seed-users', { dir: '.migration', apply: 'false' }),
    /valueless flag/
  );
  assert.throws(
    () => validateOptions('seed-users', { dir: '.migration', nope: true }),
    /Unknown option/
  );
});

test('requires the exact destination account confirmation for apply mode', () => {
  assert.throws(
    () => validateOptions('seed-data', { dir: '.migration', apply: true }),
    /requires --confirm-account 617394174030/
  );
  assert.doesNotThrow(() =>
    validateOptions('seed-data', {
      dir: '.migration',
      apply: true,
      'confirm-account': '617394174030',
    })
  );
});

test('parses apply=false as an invalid option rather than apply mode', () => {
  const { options } = parseArgs([
    'seed-users',
    '--dir',
    '.migration',
    '--apply=false',
  ]);
  assert.throws(
    () => validateOptions('seed-users', options),
    /Unknown option.*apply=false/
  );
});

test('rejects edits to immutable identity review data', () => {
  const users = [
    user({ sub: 'native', email: 'cook@example.com', isAdmin: true }),
    user({
      sub: 'google',
      email: 'cook@example.com',
      provider: 'Google',
    }),
  ];
  const profiles = [
    {
      id: 'profile-1',
      userId: 'native',
      username: 'cook',
      updatedAt: '2026-01-01',
    },
  ];
  const review = buildIdentityReview(users, profiles);
  review.sourceUsersChecksum = crypto
    .createHash('sha256')
    .update(stableJson(users))
    .digest('hex');
  review.sourceProfilesChecksum = checksumRecords(profiles);
  review.groups[0].sourceUsers[1].googleSubject = 'attacker';

  assert.throws(
    () => validateIdentityReview(review, users, profiles),
    /Immutable identity review data changed/
  );
});

test('requires relative recipe image keys to exist in the image manifest', () => {
  assert.throws(
    () =>
      validateRelationships(
        {
          Ingredient: [],
          Recipe: [{ id: 'recipe-1', imageUrl: 'recipe-images/missing.webp' }],
          UserProfile: [],
          RecipeIngredient: [],
          Favorite: [],
          Comment: [],
        },
        new Set()
      ),
    /Unresolved Recipe.imageUrl/
  );
});

test('rejects source subjects assigned to the wrong reviewed group', () => {
  const users = [
    user({ sub: 'source-a', email: 'a@example.com' }),
    user({ sub: 'source-b', email: 'b@example.com' }),
  ];
  const review = buildIdentityReview(users, []);
  review.sourceUsersChecksum = crypto
    .createHash('sha256')
    .update(stableJson(users))
    .digest('hex');
  review.sourceProfilesChecksum = checksumRecords([]);
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'ak-migration-test-')
  );
  const reviewPath = path.join(directory, 'review.json');
  const manifestPath = path.join(directory, 'manifest.json');
  const progressPath = path.join(directory, 'progress.json');
  const [groupA, groupB] = review.groups;
  fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
  fs.writeFileSync(manifestPath, '{}\n');
  fs.writeFileSync(
    progressPath,
    `${JSON.stringify({
      destinationAccountId: '617394174030',
      destinationUserPoolId: 'us-east-1_T6z6xYsDI',
      sourceManifestChecksum: crypto
        .createHash('sha256')
        .update(fs.readFileSync(manifestPath))
        .digest('hex'),
      reviewChecksum: crypto
        .createHash('sha256')
        .update(fs.readFileSync(reviewPath))
        .digest('hex'),
      groups: [
        {
          groupId: groupA.groupId,
          destinationSub: 'destination-a',
          destinationUsername: 'a@example.com',
        },
        {
          groupId: groupB.groupId,
          destinationSub: 'destination-b',
          destinationUsername: 'b@example.com',
        },
      ],
    })}\n`
  );
  const fileHash = (filePath) =>
    crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  const identityMap = {
    destinationAccountId: '617394174030',
    destinationUserPoolId: 'us-east-1_T6z6xYsDI',
    sourceManifestChecksum: fileHash(manifestPath),
    reviewChecksum: fileHash(reviewPath),
    progressChecksum: identityProgressChecksum(
      JSON.parse(fs.readFileSync(progressPath, 'utf8'))
    ),
    sourceUserCount: 2,
    destinationUserCount: 2,
    profileSelections: [],
    mappings: [
      {
        sourceSub: groupA.sourceUsers[0].sourceSub,
        groupId: groupB.groupId,
        destinationSub: 'destination-b',
        destinationUsername: 'b@example.com',
      },
      {
        sourceSub: groupB.sourceUsers[0].sourceSub,
        groupId: groupA.groupId,
        destinationSub: 'destination-a',
        destinationUsername: 'a@example.com',
      },
    ],
  };

  assert.throws(
    () =>
      validateIdentityMap(
        identityMap,
        review,
        reviewPath,
        manifestPath,
        progressPath
      ),
    /assigned to the wrong group/
  );
  fs.rmSync(directory, { recursive: true, force: true });
});
