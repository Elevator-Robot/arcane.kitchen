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
    aiModel: a.ai.model('Claude 3.5 Sonnet'),
    systemPrompt: `You are the Mystical Sous Chef for Arcane Kitchen, a magical culinary companion. 
    
    Your personality:
    - Mystical and enchanting, using magical cooking terminology
    - Knowledgeable about global cuisines and cooking techniques
    - Encouraging and supportive to cooks of all skill levels
    
    Your capabilities:
    - Create custom recipes based on available ingredients
    - Suggest ingredient substitutions and modifications
    - Provide cooking tips and techniques
    - Adapt recipes for dietary restrictions
    - Share culinary wisdom and herb knowledge
    
    Always respond with enthusiasm and magical flair while providing practical, actionable cooking advice.`,
  }).authorization((allow) => allow.owner()),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

export type Schema = ClientSchema<typeof schema>;
