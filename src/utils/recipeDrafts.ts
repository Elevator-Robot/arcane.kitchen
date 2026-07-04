export interface RecipeIngredientDraft {
  id: number;
  name: string;
  amount: string;
  unit: string;
}

export interface RecipeDraft {
  name: string;
  description: string;
  notes?: string;
  prepTime: string;
  tags: string[];
  imageUrl: string;
  instructions: string[];
  ingredients: RecipeIngredientDraft[];
  utensils: string[];
}

export interface RecipeDraftRecord {
  id: string;
  ownerId: string;
  draft: RecipeDraft;
  editingRecipeId: string | null;
  imageDataUrl: string | null;
  title: string;
  updatedAt: number;
}

interface SaveRecipeDraftInput {
  ownerId: string;
  draft: RecipeDraft;
  editingRecipeId?: string | null;
  imageDataUrl?: string | null;
  draftId?: string | null;
}

interface LegacyStoredDraft {
  draft: RecipeDraft;
  editingRecipeId: string | null;
  savedAt: number;
}

const DRAFTS_DB_NAME = 'arcaneKitchenDraft';
const DRAFTS_DB_VERSION = 2;
const DRAFTS_STORE_NAME = 'recipeDrafts';
const LEGACY_IMAGE_STORE_NAME = 'kv';
const LEGACY_IMAGE_KEY = 'arcaneKitchen.draftImage';
const LEGACY_SINGLE_DRAFT_KEY = 'arcaneKitchen.recipeDraft';
const LOCAL_STORAGE_DRAFTS_KEY = 'arcaneKitchen.recipeDrafts';

const hasIndexedDb = () => typeof indexedDB !== 'undefined';

const generateDraftId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const EMPTY_RECIPE_DRAFT: RecipeDraft = {
  name: '',
  description: '',
  notes: '',
  prepTime: '',
  tags: [],
  imageUrl: '',
  instructions: [''],
  ingredients: [{ id: 0, name: '', amount: '', unit: '' }],
  utensils: [],
};

export const isRecipeDraftEmpty = (draft: RecipeDraft) =>
  !draft.name.trim() &&
  !draft.description.trim() &&
  !draft.notes?.trim() &&
  !draft.prepTime.trim() &&
  draft.tags.every((tag) => !tag.trim()) &&
  draft.imageUrl.trim() === '' &&
  draft.instructions.every((instruction) => !instruction.trim()) &&
  draft.ingredients.every(
    (ingredient) =>
      !ingredient.name.trim() &&
      !ingredient.amount.trim() &&
      !ingredient.unit.trim()
  ) &&
  draft.utensils.every((utensil) => !utensil.trim());

const cloneDraft = (draft: RecipeDraft): RecipeDraft => ({
  ...draft,
  tags: [...draft.tags],
  instructions: [...draft.instructions],
  ingredients: draft.ingredients.map((ingredient) => ({ ...ingredient })),
  utensils: [...draft.utensils],
});

const toDraftRecord = ({
  id,
  ownerId,
  draft,
  editingRecipeId = null,
  imageDataUrl = null,
  updatedAt = Date.now(),
}: {
  id: string;
  ownerId: string;
  draft: RecipeDraft;
  editingRecipeId?: string | null;
  imageDataUrl?: string | null;
  updatedAt?: number;
}): RecipeDraftRecord => ({
  id,
  ownerId,
  draft: cloneDraft(draft),
  editingRecipeId,
  imageDataUrl,
  title: draft.name.trim() || 'Untitled recipe',
  updatedAt,
});

const sortDrafts = (drafts: RecipeDraftRecord[]) =>
  [...drafts].sort((left, right) => right.updatedAt - left.updatedAt);

const readLocalStorageDrafts = (): RecipeDraftRecord[] => {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  try {
    const saved = window.localStorage.getItem(LOCAL_STORAGE_DRAFTS_KEY);
    if (!saved) return [];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isRecipeDraftRecordLike).map(normalizeStoredRecord);
  } catch {
    return [];
  }
};

const writeLocalStorageDrafts = (drafts: RecipeDraftRecord[]) => {
  if (typeof window === 'undefined' || !window.localStorage) return;

  window.localStorage.setItem(LOCAL_STORAGE_DRAFTS_KEY, JSON.stringify(drafts));
};

const readLegacyLocalStorageDraft = (): LegacyStoredDraft | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    const saved = window.localStorage.getItem(LEGACY_SINGLE_DRAFT_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as {
      draft?: RecipeDraft;
      editingRecipeId?: string | null;
      savedAt?: number;
    };

    if (!parsed.draft) return null;

    return {
      draft: parsed.draft,
      editingRecipeId: parsed.editingRecipeId || null,
      savedAt: parsed.savedAt || Date.now(),
    };
  } catch {
    return null;
  }
};

const removeLegacyLocalStorageDraft = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(LEGACY_SINGLE_DRAFT_KEY);
};

const isRecipeDraftRecordLike = (value: unknown): value is Partial<RecipeDraftRecord> =>
  Boolean(value && typeof value === 'object' && 'id' in value && 'draft' in value);

const normalizeStoredRecord = (value: Partial<RecipeDraftRecord>): RecipeDraftRecord =>
  toDraftRecord({
    id: typeof value.id === 'string' && value.id ? value.id : generateDraftId(),
    ownerId:
      typeof value.ownerId === 'string' && value.ownerId
        ? value.ownerId
        : 'legacy-local-owner',
    draft: value.draft ? cloneDraft(value.draft) : cloneDraft(EMPTY_RECIPE_DRAFT),
    editingRecipeId: typeof value.editingRecipeId === 'string' ? value.editingRecipeId : null,
    imageDataUrl: typeof value.imageDataUrl === 'string' ? value.imageDataUrl : null,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now(),
  });

const openDraftDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DRAFTS_DB_NAME, DRAFTS_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(DRAFTS_STORE_NAME)) {
        db.createObjectStore(DRAFTS_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readLegacyDraftImage = async (): Promise<string | null> => {
  if (!hasIndexedDb()) return null;

  try {
    const db = await openDraftDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(LEGACY_IMAGE_STORE_NAME, 'readonly');
      const request = tx.objectStore(LEGACY_IMAGE_STORE_NAME).get(LEGACY_IMAGE_KEY);
      request.onsuccess = () => resolve((request.result as string | null) || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
};

const removeLegacyDraftImage = async () => {
  if (!hasIndexedDb()) return;

  try {
    const db = await openDraftDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LEGACY_IMAGE_STORE_NAME, 'readwrite');
      const request = tx.objectStore(LEGACY_IMAGE_STORE_NAME).delete(LEGACY_IMAGE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    /* ignore */
  }
};

const readIndexedDbDrafts = async (): Promise<RecipeDraftRecord[]> => {
  const db = await openDraftDatabase();

  return await new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFTS_STORE_NAME, 'readonly');
    const request = tx.objectStore(DRAFTS_STORE_NAME).getAll();
    request.onsuccess = () => {
      const records = Array.isArray(request.result)
        ? request.result
            .filter(isRecipeDraftRecordLike)
            .map(normalizeStoredRecord)
        : [];
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
};

const writeIndexedDbDrafts = async (drafts: RecipeDraftRecord[]): Promise<void> => {
  const db = await openDraftDatabase();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DRAFTS_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DRAFTS_STORE_NAME);
    drafts.forEach((draft) => {
      store.put(draft);
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

const readAllStoredDrafts = async (): Promise<RecipeDraftRecord[]> => {
  if (hasIndexedDb()) {
    try {
      const drafts = await readIndexedDbDrafts();
      return sortDrafts(drafts);
    } catch {
      /* fall through to localStorage */
    }
  }

  const localDrafts = readLocalStorageDrafts();
  return sortDrafts(localDrafts);
};

const migrateLegacyDraft = async (
  ownerId: string
): Promise<RecipeDraftRecord | null> => {
  const legacyLocalDraft = readLegacyLocalStorageDraft();
  if (!legacyLocalDraft) return null;

  const imageDataUrl = await readLegacyDraftImage();
  const record = toDraftRecord({
    id: 'legacy-local-draft',
    ownerId,
    draft: legacyLocalDraft.draft,
    editingRecipeId: legacyLocalDraft.editingRecipeId,
    imageDataUrl,
    updatedAt: legacyLocalDraft.savedAt,
  });

  if (hasIndexedDb()) {
    await saveIndexedDbDraft(record);
  } else {
    await saveLocalStorageDraft(record);
  }

  removeLegacyLocalStorageDraft();
  await removeLegacyDraftImage();
  return record;
};

const saveLocalStorageDraft = async (
  draftRecord: RecipeDraftRecord
): Promise<RecipeDraftRecord> => {
  const drafts = readLocalStorageDrafts();
  const nextDrafts = sortDrafts([
    draftRecord,
    ...drafts.filter((existing) => existing.id !== draftRecord.id),
  ]);
  writeLocalStorageDrafts(nextDrafts);
  return draftRecord;
};

const saveIndexedDbDraft = async (
  draftRecord: RecipeDraftRecord
): Promise<RecipeDraftRecord> => {
  const drafts = await readIndexedDbDrafts();
  const nextDrafts = sortDrafts([
    draftRecord,
    ...drafts.filter((existing) => existing.id !== draftRecord.id),
  ]);
  await writeIndexedDbDrafts(nextDrafts);
  return draftRecord;
};

export const listRecipeDrafts = async (): Promise<RecipeDraftRecord[]> =>
  readAllStoredDrafts();

export const getLatestRecipeDraft = async (
  ownerId: string
): Promise<RecipeDraftRecord | null> => {
  const drafts = (await readAllStoredDrafts()).filter(
    (draft) => draft.ownerId === ownerId
  );
  return drafts[0] || null;
};

export const getRecipeDraftById = async (
  ownerId: string,
  draftId: string
): Promise<RecipeDraftRecord | null> => {
  const drafts = await readAllStoredDrafts();
  return (
    drafts.find((draft) => draft.ownerId === ownerId && draft.id === draftId) ||
    null
  );
};

export const saveRecipeDraft = async ({
  ownerId,
  draft,
  editingRecipeId = null,
  imageDataUrl = null,
  draftId = null,
}: SaveRecipeDraftInput): Promise<RecipeDraftRecord | null> => {
  if (isRecipeDraftEmpty(draft) && !imageDataUrl) {
    if (draftId) {
      await deleteRecipeDraft(ownerId, draftId);
    }
    return null;
  }

  const existingId = draftId || generateDraftId();
  const record = toDraftRecord({
    id: existingId,
    ownerId,
    draft,
    editingRecipeId,
    imageDataUrl,
    updatedAt: Date.now(),
  });

  if (hasIndexedDb()) {
    try {
      return await saveIndexedDbDraft(record);
    } catch {
      return saveLocalStorageDraft(record);
    }
  }

  return saveLocalStorageDraft(record);
};

export const loadRecipeDraftsForOwner = async (
  ownerId: string
): Promise<RecipeDraftRecord[]> => {
  const drafts = (await readAllStoredDrafts()).filter(
    (draft) => draft.ownerId === ownerId
  );

  if (drafts.length) {
    return drafts;
  }

  const migratedDraft = await migrateLegacyDraft(ownerId);
  return migratedDraft ? [migratedDraft] : [];
};

export const deleteRecipeDraft = async (
  ownerId: string,
  draftId: string
): Promise<void> => {
  if (!draftId) return;

  if (hasIndexedDb()) {
    try {
      const drafts = await readIndexedDbDrafts();
      const nextDrafts = drafts.filter(
        (draft) => draft.ownerId !== ownerId || draft.id !== draftId
      );
      await writeIndexedDbDrafts(nextDrafts);
      return;
    } catch {
      /* fall through */
    }
  }

  const drafts = readLocalStorageDrafts().filter(
    (draft) => draft.ownerId !== ownerId || draft.id !== draftId
  );
  writeLocalStorageDrafts(drafts);
};
