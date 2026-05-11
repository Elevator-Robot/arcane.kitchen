const storage = new Map();
const current = globalThis.localStorage;

if (
  !current ||
  typeof current.getItem !== 'function' ||
  typeof current.setItem !== 'function'
) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    enumerable: true,
    value: {
      getItem(key) {
        const normalizedKey = String(key);
        return storage.has(normalizedKey) ? storage.get(normalizedKey) : null;
      },
      setItem(key, value) {
        storage.set(String(key), String(value));
      },
      removeItem(key) {
        storage.delete(String(key));
      },
      clear() {
        storage.clear();
      },
      key(index) {
        return Array.from(storage.keys())[index] ?? null;
      },
      get length() {
        return storage.size;
      },
    },
  });
}
