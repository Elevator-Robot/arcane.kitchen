const DB_NAME = 'arcaneKitchen';
const STORE_NAME = 'images';
const STORAGE_CONFIG_KEY = 'arcaneKitchen.storageConfigured';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getImage(path: string): Promise<string | undefined> {
  return openDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(path);
      request.onsuccess = () => resolve(request.result || undefined);
      request.onerror = () => reject(request.error);
    });
  });
}

function putImage(path: string, dataUrl: string): Promise<void> {
  return openDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).put(dataUrl, path);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function deleteImage(path: string): Promise<void> {
  return openDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).delete(path);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export function markStorageConfigured(): void {
  localStorage.setItem(STORAGE_CONFIG_KEY, 'true');
}

export function hasFakeStorageConfig(): boolean {
  return localStorage.getItem(STORAGE_CONFIG_KEY) === 'true';
}

export async function fakeGetUrl(input: {
  path: string;
  options?: { expiresIn?: number };
}): Promise<{ url: URL }> {
  const dataUrl = await getImage(input.path);
  if (dataUrl) {
    const blob = dataUrlToBlob(dataUrl);
    const url = URL.createObjectURL(blob);
    return { url: new URL(url) };
  }
  return {
    url: new URL(
      'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=900&q=80'
    ),
  };
}

export function fakeUploadData(input: {
  path: string;
  data: File | Blob;
  options?: { contentType?: string; preventOverwrite?: boolean };
}): { result: Promise<{ path: string }> } {
  const resultPromise = (async () => {
    if (input.options?.preventOverwrite) {
      const existing = await getImage(input.path);
      if (existing) {
        throw new Error('Object already exists: ' + input.path);
      }
    }

    const dataUrl = await blobToDataUrl(input.data);
    await putImage(input.path, dataUrl);
    return { path: input.path };
  })();

  return { result: resultPromise };
}

export async function fakeDeleteImage(path: string): Promise<void> {
  await deleteImage(path);
}

export async function fakeClearAllImages(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0]?.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bytes = atob(parts[1] || '');
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    array[i] = bytes.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

export function fakeAmplifyConfigWithStorage() {
  return {
    Storage: {
      S3: {
        bucket: 'fake-bucket',
        region: 'us-east-1',
      },
    },
  };
}
