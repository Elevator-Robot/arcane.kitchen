const DB_KEY = 'arcaneKitchen.fakeDb';

interface StoredData {
  recipes: Record<string, Record<string, unknown>>;
  ingredients: Record<string, Record<string, unknown>>;
  recipeIngredients: Record<string, Record<string, unknown>>;
  favorites: Record<string, Record<string, unknown>>;
  images: Record<string, string>;
}

function loadDb(): StoredData {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as StoredData;
  } catch {
    /* ignore */
  }
  return {
    recipes: {},
    ingredients: {},
    recipeIngredients: {},
    favorites: {},
    images: {},
  };
}

function saveDb(db: StoredData): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function matchesFilter(
  record: Record<string, unknown>,
  filter?: Record<string, Record<string, unknown>>
): boolean {
  if (!filter) return true;
  return Object.entries(filter).every(([field, condition]) => {
    if (!condition || typeof condition !== 'object') return true;
    const recordValue = record[field];
    if ('eq' in condition) return recordValue === condition.eq;
    if ('ne' in condition) return recordValue !== condition.ne;
    if ('gt' in condition)
      return (
        typeof recordValue === 'number' &&
        recordValue > (condition.gt as number)
      );
    if ('lt' in condition)
      return (
        typeof recordValue === 'number' &&
        recordValue < (condition.lt as number)
      );
    if ('gte' in condition)
      return (
        typeof recordValue === 'number' &&
        recordValue >= (condition.gte as number)
      );
    if ('lte' in condition)
      return (
        typeof recordValue === 'number' &&
        recordValue <= (condition.lte as number)
      );
    if ('beginsWith' in condition)
      return (
        typeof recordValue === 'string' &&
        recordValue.startsWith(condition.beginsWith as string)
      );
    if ('contains' in condition)
      return (
        typeof recordValue === 'string' &&
        recordValue.includes(condition.contains as string)
      );
    if ('notContains' in condition)
      return (
        typeof recordValue === 'string' &&
        !recordValue.includes(condition.notContains as string)
      );
    return true;
  });
}

function modelApi<T extends Record<string, unknown>>(table: keyof StoredData) {
  const list = async (opts?: {
    filter?: Record<string, Record<string, unknown>>;
    authMode?: string;
  }): Promise<{ data: T[]; errors?: Array<{ message: string }> }> => {
    const db = loadDb();
    const records = Object.values(
      db[table] as Record<string, Record<string, unknown>>
    );
    const filtered = records.filter((r) => matchesFilter(r, opts?.filter));
    return {
      data: filtered as T[],
      errors:
        opts?.authMode === 'identityPool' && !records.length
          ? [{ message: 'Not authorized' }]
          : undefined,
    };
  };

  const get = async (
    input: { id: string },
    _opts?: { authMode?: string }
  ): Promise<{ data: T | null; errors?: Array<{ message: string }> }> => {
    const db = loadDb();
    const record = (db[table] as Record<string, Record<string, unknown>>)[
      input.id
    ];
    if (!record)
      return { data: null, errors: [{ message: 'Record not found' }] };
    return { data: record as T };
  };

  const create = async (
    input: T,
    _opts?: { authMode?: string }
  ): Promise<{ data: T | null; errors?: Array<{ message: string }> }> => {
    const db = loadDb();
    const id =
      ((input as Record<string, unknown>).id as string) ||
      crypto.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const record = { ...input, id } as unknown as Record<string, unknown>;
    if (table === 'recipes' && record.createdAt == null) {
      record.createdAt = new Date().toISOString();
    }
    (db[table] as Record<string, Record<string, unknown>>)[id] = record;
    saveDb(db);
    return { data: record as T };
  };

  const update = async (
    input: Partial<T> & { id: string },
    _opts?: { authMode?: string }
  ): Promise<{ data: T | null; errors?: Array<{ message: string }> }> => {
    const db = loadDb();
    const existing = (db[table] as Record<string, Record<string, unknown>>)[
      input.id
    ];
    if (!existing)
      return { data: null, errors: [{ message: 'Record not found' }] };
    const record = { ...existing, ...input } as Record<string, unknown>;
    (db[table] as Record<string, Record<string, unknown>>)[input.id] = record;
    saveDb(db);
    return { data: record as T };
  };

  const del = async (
    input: { id: string },
    _opts?: { authMode?: string }
  ): Promise<{
    data?: { id: string } | null;
    errors?: Array<{ message: string }>;
  }> => {
    const db = loadDb();
    delete (db[table] as Record<string, Record<string, unknown>>)[input.id];
    saveDb(db);
    return { data: { id: input.id } };
  };

  return { list, get, create, update, delete: del };
}

export function createFakeClient() {
  return {
    models: {
      Recipe: modelApi<Record<string, unknown>>('recipes'),
      Ingredient: modelApi<Record<string, unknown>>('ingredients'),
      RecipeIngredient: modelApi<Record<string, unknown>>('recipeIngredients'),
      Favorite: modelApi<Record<string, unknown>>('favorites'),
    },
  };
}
