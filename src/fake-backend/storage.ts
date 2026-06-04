const IMAGES_KEY = 'arcaneKitchen.fakeImages';
const STORAGE_CONFIG_KEY = 'arcaneKitchen.storageConfigured';

function loadImages(): Record<string, string> {
  try {
    const raw = localStorage.getItem(IMAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

function saveImages(images: Record<string, string>): void {
  localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
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
  const images = loadImages();
  const dataUrl = images[input.path];
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
  const images = loadImages();

  if (input.options?.preventOverwrite && images[input.path]) {
    throw new Error('Object already exists: ' + input.path);
  }

  const resultPromise = blobToDataUrl(input.data).then((dataUrl) => {
    images[input.path] = dataUrl;
    saveImages(images);
    return { path: input.path };
  });

  return { result: resultPromise };
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

export function fakeAmplifyConfigWithStorage(): { Storage: unknown } {
  return {
    Storage: {
      bucket: 'fake-bucket',
      region: 'us-east-1',
    },
  };
}
