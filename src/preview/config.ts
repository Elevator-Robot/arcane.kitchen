// Never enable mock data in a production build.
export const isMockPreview =
  import.meta.env.DEV &&
  import.meta.env.MODE !== 'test' &&
  import.meta.env.VITE_MOCK_PREVIEW === 'true';
