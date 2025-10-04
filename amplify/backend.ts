import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { Tags } from "aws-cdk-lib";

const backend = defineBackend({
  auth,
  data,
});

// Apply tags at the stack level so they cascade to all resources
const stacks = [
  backend.auth.stack,
  backend.data.stack,
];

stacks.forEach((stack) => {
  Tags.of(stack).add('Project', 'ArcaneKitchen');
  Tags.of(stack).add('Environment', stack.stackName.includes('sandbox') ? 'development' : 'production');
  Tags.of(stack).add('ManagedBy', 'Amplify');
});
