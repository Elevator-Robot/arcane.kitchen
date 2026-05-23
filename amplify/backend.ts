import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { Aspects, CfnResource, Tags } from 'aws-cdk-lib';
import type { IConstruct } from 'constructs';

const backend = defineBackend({
  auth,
  data,
  storage,
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

  if (!stackName.includes('sandbox')) {
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
