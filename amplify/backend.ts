import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { Aspects, Tags } from 'aws-cdk-lib';
import { CfnUserPoolDomain } from 'aws-cdk-lib/aws-cognito';
import { Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { EventType } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import type { IConstruct } from 'constructs';
import { join } from 'node:path';

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

const imageProcessor = new NodejsFunction(backend.storage.stack, 'RecipeImageProcessor', {
  runtime: Runtime.NODEJS_20_X,
  entry: join(process.cwd(), 'amplify/functions/recipe-image-processor/index.ts'),
  handler: 'handler',
  timeout: Duration.seconds(30),
  memorySize: 1024,
  environment: {
    OUTPUT_PREFIX: 'recipe-images/processed/',
  },
});

backend.storage.resources.bucket.grantReadWrite(imageProcessor);

backend.storage.resources.bucket.addEventNotification(
  EventType.OBJECT_CREATED,
  new LambdaDestination(imageProcessor),
  { prefix: 'recipe-images/raw/' }
);

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
