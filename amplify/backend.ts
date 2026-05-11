import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { Aspects, Tags } from 'aws-cdk-lib';
import { CfnUserPoolDomain } from 'aws-cdk-lib/aws-cognito';
import type { IConstruct } from 'constructs';

const backend = defineBackend({
  auth,
  data,
  storage,
});

const COGNITO_DOMAIN_PREFIX = 'arcanekitchen';

Aspects.of(backend.auth.stack).add({
  visit(node: IConstruct) {
    if (node instanceof CfnUserPoolDomain) {
      node.addPropertyOverride('Domain', COGNITO_DOMAIN_PREFIX);
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
