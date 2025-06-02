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

  // For AI recipe generation
  RecipeRequest: a.model({
    id: a.id(),
    prompt: a.string(),
    parameters: a.json(),
    status: a.string().default("PENDING"), // PENDING, PROCESSING, COMPLETED, FAILED
    result: a.json(),
    createdAt: a.date(),
  }).authorization(allow => [
    allow.owner(),
    allow.groups(["Admins"])
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

  // Keep conversation functionality for the Sous Chef feature
  Conversation: a.model({
    id: a.id(),
    messages: a.hasMany("Message", "conversationId"),
    recipeResponses: a.hasMany("RecipeResponse", "conversationId"),
    createdAt: a.date(),
    updatedAt: a.date(),
  }).authorization(allow => [allow.owner(), allow.groups(["Admins"])]),

  Message: a.model({
    id: a.id(),
    conversationId: a.id(),
    conversation: a.belongsTo("Conversation", "conversationId"),
    content: a.string(),
    timestamp: a.date(),
    recipeResponse: a.hasOne("RecipeResponse", "messageId")
  }).authorization(allow => [allow.owner(), allow.groups(["Admins"])]),

  RecipeResponse: a.model({
    id: a.id(),
    conversationId: a.id(),
    conversation: a.belongsTo("Conversation", "conversationId"),
    messageId: a.id(), // the user message this is responding to
    message: a.belongsTo("Message", "messageId"),
    response: a.string(),
    suggestedRecipes: a.json(), // Can contain recipe suggestions
    createdAt: a.date(),
  }).authorization(allow => [
    allow.owner(),
    allow.authenticated().to(['read']),
  ]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

export type Schema = ClientSchema<typeof schema>;
