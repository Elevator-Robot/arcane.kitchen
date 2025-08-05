import { defineData, a } from "@aws-amplify/backend";
import { ClientSchema } from "@aws-amplify/backend";

const schema = a.schema({
  // User's recipe collection (grimoire)
  Grimoire: a.model({
    id: a.id(),
    name: a.string(),
    description: a.string(),
    recipes: a.hasMany("Recipe", "grimoireId"),
    createdAt: a.date(),
    updatedAt: a.date(),
  }).authorization(allow => [allow.owner(), allow.groups(["Admins"])]),

  // Recipe model
  Recipe: a.model({
    id: a.id(),
    title: a.string(),
    description: a.string(),
    ingredients: a.string().array(),
    instructions: a.string().array(),
    prepTime: a.string(),
    cookTime: a.string(),
    servings: a.integer(),
    difficulty: a.string(),
    region: a.string(),
    dietaryTags: a.string().array(),
    magicalProperties: a.string().array(),
    imageUrl: a.string(),
    
    // Relations
    grimoireId: a.id(),
    grimoire: a.belongsTo("Grimoire", "grimoireId"),
    authorId: a.string(),
    reviews: a.hasMany("Review", "recipeId"),
    
    // Metadata
    createdAt: a.date(),
    updatedAt: a.date(),
    isPublic: a.boolean().default(false),
  }).authorization(allow => [
    allow.owner(),
    allow.authenticated().to(['read']),
    allow.groups(["Admins"])
  ]),

  // Recipe reviews
  Review: a.model({
    id: a.id(),
    recipeId: a.id(),
    recipe: a.belongsTo("Recipe", "recipeId"),
    rating: a.integer(),
    comment: a.string(),
    authorId: a.string(),
    createdAt: a.date(),
  }).authorization(allow => [
    allow.owner(),
    allow.authenticated().to(['read']),
    allow.groups(["Admins"])
  ]),

  // Ingredient database
  Ingredient: a.model({
    id: a.id(),
    name: a.string(),
    description: a.string(),
    category: a.string(),
    magicalProperties: a.string().array(),
    season: a.string().array(),
    substitutes: a.string().array(),
    imageUrl: a.string(),
  }).authorization(allow => [
    allow.authenticated().to(['read']),
    allow.groups(["Admins"]).to(['create', 'update', 'delete']),
  ]),

  // Community features
  CommunityEvent: a.model({
    id: a.id(),
    title: a.string(),
    description: a.string(),
    eventDate: a.date(),
    location: a.string(),
    isVirtual: a.boolean().default(false),
    imageUrl: a.string(),
    createdAt: a.date(),
    updatedAt: a.date(),
  }).authorization(allow => [
    allow.authenticated().to(['read']),
    allow.groups(["Admins"]).to(['create', 'update', 'delete']),
  ]),

  // Herbal wisdom database
  HerbalWisdom: a.model({
    id: a.id(),
    herb: a.string(),
    description: a.string(),
    culinaryUses: a.string().array(),
    magicalProperties: a.string().array(),
    medicinalUses: a.string().array(),
    cautions: a.string(),
    imageUrl: a.string(),
    createdAt: a.date(),
    updatedAt: a.date(),
  }).authorization(allow => [
    allow.authenticated().to(['read']),
    allow.groups(["Admins"]).to(['create', 'update', 'delete']),
  ]),

  // Mystical Sous Chef conversation
  sousChef: a.conversation({
    aiModel: a.ai.model('Claude 3.5 Haiku'),
    systemPrompt: `You are the Mystical Sous Chef of Arcane Kitchen, a wise and magical culinary companion. 
    You help users discover recipes, customize them to their taste, and explore the magical properties of ingredients.
    
    Your personality is warm, knowledgeable, and slightly mystical. You speak with the wisdom of ancient culinary traditions
    while being practical and helpful. You can:
    
    - Suggest recipes based on ingredients, dietary restrictions, or magical properties
    - Help modify existing recipes to accommodate different needs
    - Explain the culinary and magical properties of herbs and ingredients
    - Guide users through cooking techniques
    - Share knowledge about seasonal ingredients and traditional cooking methods
    
    Always be encouraging and make cooking feel like a magical, creative process.`,
  }).authorization((allow) => allow.owner()),

  // Recipe generation conversation
  recipeGenerator: a.conversation({
    aiModel: a.ai.model('Claude 3.5 Haiku'),
    systemPrompt: `You are a specialized recipe generation assistant for Arcane Kitchen. 
    Your role is to create detailed, magical recipes based on user requirements.
    
    When generating recipes, always include:
    - A mystical but practical recipe title
    - Detailed ingredient list with measurements
    - Step-by-step instructions
    - Prep time, cook time, and servings
    - Difficulty level (Novice, Apprentice, Adept, Master)
    - Regional cuisine information if applicable
    - Dietary tags (vegetarian, vegan, gluten-free, etc.)
    - Magical properties or special notes about ingredients
    
    Format your responses as structured recipe data that can be easily parsed and saved.`,
  }).authorization((allow) => allow.owner()),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

export type Schema = ClientSchema<typeof schema>;
