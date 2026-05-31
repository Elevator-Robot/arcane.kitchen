import { createFakeClient } from './client';
import {
  fakeGetUrl,
  fakeUploadData,
  hasFakeStorageConfig,
  markStorageConfigured,
  fakeAmplifyConfigWithStorage,
} from './storage';
import {
  fakeGetCurrentUser,
  fakeFetchUserAttributes,
  fakeSignOut,
} from './auth';
import { Amplify } from 'aws-amplify';

let initialized = false;

export function isFakeBackend(): boolean {
  return import.meta.env.MODE === 'development';
}

export function initFakeBackend(): void {
  if (initialized || !isFakeBackend()) return;
  initialized = true;

  Amplify.configure(fakeAmplifyConfigWithStorage());
  markStorageConfigured();

  console.log('[fake-backend] Initialised localStorage-backed backend');
}

export function getFakeClient() {
  return createFakeClient();
}

export { fakeGetUrl, fakeUploadData, hasFakeStorageConfig };
export { fakeGetCurrentUser, fakeFetchUserAttributes, fakeSignOut };
