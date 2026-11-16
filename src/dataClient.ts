import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import { isMockPreview } from './preview/config';
export let client: any = isMockPreview ? null : generateClient<Schema>();

/** Bootstrap awaits this before mounting the app; production never imports fixtures. */
export async function initializePreviewClient() {
  if (isMockPreview) {
    client = (await import('./preview/client')).mockClient;
  }
}
