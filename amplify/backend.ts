import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { adminActions } from './functions/admin-actions/resource';
import { Aspects, Aws, CfnResource, Tags, CfnOutput } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import type { IConstruct } from 'constructs';
import { Distribution, ViewerProtocolPolicy, PriceClass } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';

const backend = defineBackend({
  auth,
  data,
  storage,
  adminActions,
});

backend.adminActions.resources.lambda.addToRolePolicy(new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['cognito-idp:AdminDisableUser', 'cognito-idp:AdminEnableUser', 'cognito-idp:ListUsers'],
  resources: [`arn:aws:cognito-idp:${Aws.REGION}:${Aws.ACCOUNT_ID}:userpool/*`],
}));
 (backend.adminActions.resources.lambda as LambdaFunction).addEnvironment(
  'DATA_GRAPHQL_ENDPOINT',
  backend.data.resources.cfnResources.cfnGraphqlApi.attrGraphQlUrl,
);

const cdn = new Distribution(backend.storage.stack, 'RecipeImagesCDN', {
  defaultBehavior: {
    origin: new S3Origin(backend.storage.resources.bucket),
    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    compress: true,
  },
  priceClass: PriceClass.PRICE_CLASS_100,
  comment: 'CDN for Arcane Kitchen recipe images',
});

new CfnOutput(backend.storage.stack, 'CloudFrontDomain', {
  value: cdn.distributionDomainName,
  description: 'CloudFront domain for serving recipe images',
});

backend.addOutput({
  custom: { CloudFrontDomain: cdn.distributionDomainName },
});

const COGNITO_DOMAIN_PREFIX = 'arcanekitchen';
const MAX_COGNITO_DOMAIN_LENGTH = 63;

const sanitizeDomainPrefix = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const getDomainPrefixForStack = (stackName: string) => {
  const sandboxDomainPrefix = process.env.AK_COGNITO_DOMAIN_PREFIX;
  if (sandboxDomainPrefix) {
    return sanitizeDomainPrefix(sandboxDomainPrefix).slice(
      0,
      MAX_COGNITO_DOMAIN_LENGTH
    );
  }

  // The main branch owns the production hosted-UI domain. Amplify branch
  // stacks need unique prefixes because Cognito domains are region-scoped.
  if (process.env.AWS_BRANCH === 'main' || stackName.includes('main-branch')) {
    return COGNITO_DOMAIN_PREFIX;
  }

  const stackSuffix = sanitizeDomainPrefix(stackName).slice(-8);
  const sandboxPrefix = `${COGNITO_DOMAIN_PREFIX}-${stackSuffix}`;

  return sandboxPrefix.slice(0, MAX_COGNITO_DOMAIN_LENGTH);
};

Aspects.of(backend.auth.stack).add({
  visit(node: IConstruct) {
    if (
      node instanceof CfnResource &&
      node.cfnResourceType === 'AWS::Cognito::UserPoolDomain'
    ) {
      node.addPropertyOverride('Domain', getDomainPrefixForStack(backend.auth.stack.stackName));
    }
  },
});

// Apply tags at the stack level so they cascade to all resources
const stacks = [backend.auth.stack, backend.data.stack, backend.storage.stack];

stacks.forEach((stack) => {
  Tags.of(stack).add('Project', 'ArcaneKitchen');
  Tags.of(stack).add(
    'Environment',
    stack.stackName.includes('sandbox') ? 'development' : 'production'
  );
  Tags.of(stack).add('ManagedBy', 'Amplify');
});
