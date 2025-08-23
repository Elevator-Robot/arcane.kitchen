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
    systemPrompt: `You are a helpful cooking assistant for Arcane Kitchen. 
    You help users with recipes, cooking techniques, and ingredient questions.
    
    Keep your responses practical and friendly. Focus on:
    - Recipe suggestions and modifications
    - Cooking techniques and tips
    - Ingredient substitutions
    - Basic cooking questions
    
    Be encouraging and make cooking accessible for everyone.`,
  }).authorization((allow) => allow.owner()),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

export type Schema = ClientSchema<typeof schema>;
