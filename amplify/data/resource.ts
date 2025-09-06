import { defineData, a } from "@aws-amplify/backend";
import { ClientSchema } from "@aws-amplify/backend";

const schema = a.schema({
  // Simple recipe model for MVP
  Recipe: a.model({
    id: a.id(),
    title: a.string().required(),
    description: a.string(),
    ingredients: a.string().array(),
    instructions: a.string().array(),
    prepTime: a.string(),
    cookTime: a.string(),
    servings: a.integer(),

    // Metadata
    createdAt: a.date(),
    updatedAt: a.date(),
    isPublic: a.boolean().default(false),
  }).authorization(allow => [
    allow.owner(),
    allow.authenticated().to(['read'])
  ]),

  // Basic AI conversation for cooking assistance
  sousChef: a.conversation({
    aiModel: a.ai.model('Amazon Nova Pro'),
    systemPrompt: `You are the Mystical Sous Chef for Arcane Kitchen. Help users with cooking questions, recipes, and culinary advice. Keep responses practical and encouraging.`,
  }).authorization((allow) => allow.owner()),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

export type Schema = ClientSchema<typeof schema>;
