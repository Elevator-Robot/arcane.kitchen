import { previewDishes } from './fixtures';

type Row = Record<string, any>;

const profiles = ['rowan', 'sage', 'marlow'].map((username, i) => ({
  id: `preview-profile-${i}`,
  userId: `preview-cook-${i}`,
  username,
  displayName: username,
  bio: [
    'A flour-dusted notebook, a pot on the stove, and a cat who thinks he owns the kitchen. Collecting recipes for quiet evenings and crowded tables.',
    'Following the seasons, growing more herbs than I need, and finding a use for every last lemon.',
    'Early mornings at the oven. Late nights at the table. There is always enough for one more.',
  ][i],
  avatar: ['wanderer.webp', 'juniper.webp', 'innkeeper.webp'][i],
  kitchenIdentity: JSON.stringify({
    theme: ['moonlit', 'grove', 'sunroom'][i],
    calling: ['hearthkeeper', 'dough-artificer', 'herb-druid'][i],
    familiar: ['cat', 'fox', 'owl'][i],
    signatureRecipeId: `preview-recipe-${i}`,
  }),
  needsUsernameSetup: false,
  createdAt: '2026-08-14T12:00:00Z',
  updatedAt: '2026-10-20T12:00:00Z',
}));

const recipes = previewDishes.map(
  (
    { name, description, tags, prepTime, imageUrl, instructions, utensils },
    i
  ) => ({
    name,
    description,
    tags,
    prepTime,
    imageUrl,
    instructions,
    utensils,
    id: `preview-recipe-${i}`,
    ownerId: profiles[i % profiles.length].userId,
    createdBy: `@${profiles[i % profiles.length].username}`,
    notes:
      'Make it your own: taste as you go, use what is in season, and leave a note about your favorite variation.',
    createdAt: new Date(Date.UTC(2026, 9, 20 - i)).toISOString(),
    ratings: [],
    isHidden: false,
  })
);

const tables: Record<string, Row[]> = {
  FeaturedRecipe: [{ id: 'emporium', recipeId: 'preview-recipe-2' }],
  Recipe: recipes,
  UserProfile: profiles,
  Ingredient: previewDishes.flatMap((dish, i) =>
    dish.ingredients.map(([name], j) => ({ id: `ingredient-${i}-${j}`, name }))
  ),
  RecipeIngredient: previewDishes.flatMap((dish, i) =>
    dish.ingredients.map(([, amount, unit], j) => ({
      id: `link-${i}-${j}`,
      recipeId: recipes[i].id,
      ingredientId: `ingredient-${i}-${j}`,
      quantity: JSON.stringify({ amount, unit }),
    }))
  ),
  Favorite: recipes.flatMap((recipe, i) =>
    Array.from({ length: [24, 18, 31, 12, 9, 16, 21][i] }, (_, j) => ({
      id: `favorite-${i}-${j}`,
      recipeId: recipe.id,
      userId: j === 0 && i % 2 ? profiles[0].userId : `sample-reader-${j}`,
    }))
  ),
  Comment: [
    {
      id: 'preview-comment',
      recipeId: recipes[0].id,
      userId: profiles[1].userId,
      author: '@sage',
      content:
        'Made this with chestnut mushrooms and a little thyme from the garden. The pasta water makes all the difference!',
      createdAt: '2026-10-21T12:00:00Z',
    },
  ],
};
const previewSeedUser = { ...profiles[0] };

function matches(row: Row, filter?: Row): boolean {
  return (
    !filter ||
    Object.entries(filter).every(([key, condition]) => {
      if (key === 'and')
        return condition.every((part: Row) => matches(row, part));
      if (key === 'or')
        return condition.some((part: Row) => matches(row, part));
      if ('eq' in condition) return row[key] === condition.eq;
      if ('ne' in condition) return row[key] !== condition.ne;
      throw new Error(`Unsupported preview filter: ${key}`);
    })
  );
}

// Preview records survive reloads in this tab; production never imports this store.
const PREVIEW_STORE_KEY = 'arcaneKitchen.previewData.v1';
try {
  const saved = JSON.parse(sessionStorage.getItem(PREVIEW_STORE_KEY) || 'null');
  if (saved && typeof saved === 'object') {
    for (const [name, rows] of Object.entries(tables)) {
      const records = saved[name];
      if (
        Array.isArray(records) &&
        records.every((row) => row && typeof row.id === 'string')
      ) {
        rows.splice(0, rows.length, ...records);
      }
    }
  }
} catch {
  /* A fresh fixture set is used when tab storage is unavailable. */
}

const persistPreviewData = () => {
  try {
    sessionStorage.setItem(PREVIEW_STORE_KEY, JSON.stringify(tables));
  } catch {
    /* The preview remains usable in memory. */
  }
};

export const mockClient = {
  queries: {
    listAdminUsers: async () => ({
      data: structuredClone(
        tables.UserProfile.map((profile) => ({
          ...profile,
          enabled: true,
          status: 'CONFIRMED',
        }))
      ),
    }),
  },
  models: Object.fromEntries(
    Object.entries(tables).map(([name, rows]) => [
      name,
      {
        list: async (options?: { filter?: Row }) => ({
          data: structuredClone(
            rows.filter((row) => matches(row, options?.filter))
          ),
          nextToken: null,
        }),
        get: async ({ id }: { id: string }) => ({
          data: structuredClone(rows.find((row) => row.id === id) ?? null),
        }),
        create: async (input: Row) => {
          const row = {
            ...structuredClone(input),
            id: input.id || crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          };
          rows.push(row);
          persistPreviewData();
          return { data: structuredClone(row) };
        },
        update: async (input: Row) => {
          const row = rows.find((row) => row.id === input.id);
          if (!row)
            return {
              data: null,
              errors: [{ message: 'Preview record not found.' }],
            };
          Object.assign(row, structuredClone(input), {
            updatedAt: new Date().toISOString(),
          });
          persistPreviewData();
          return { data: structuredClone(row) };
        },
        delete: async ({ id }: { id: string }) => {
          const index = rows.findIndex((row) => row.id === id);
          const data =
            index >= 0 ? structuredClone(rows.splice(index, 1)[0]) : null;
          persistPreviewData();
          return { data };
        },
      },
    ])
  ),
};

export const getPreviewProfile = () =>
  tables.UserProfile.find((profile) => profile.userId === 'preview-cook-0') ||
  previewSeedUser;
