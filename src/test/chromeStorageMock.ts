export function createChromeStorageMock() {
  const store: Record<string, unknown> = {};
  const storageListeners = new Set<
    (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => void
  >();

  function emitStorageChanges(
    changes: Record<string, chrome.storage.StorageChange>
  ) {
    storageListeners.forEach((listener) => listener(changes, 'local'));
  }

  return {
    store,
    chrome: {
      storage: {
        local: {
          async get(keys: string | string[]) {
            const result: Record<string, unknown> = {};
            for (const key of Array.isArray(keys) ? keys : [keys]) {
              if (key in store) {
                result[key] = store[key];
              }
            }
            return result;
          },
          async set(items: Record<string, unknown>) {
            const changes = Object.fromEntries(
              Object.entries(items).map(([key, newValue]) => [
                key,
                { oldValue: store[key], newValue },
              ])
            );
            Object.assign(store, items);
            emitStorageChanges(changes);
          },
          async remove(keys: string | string[]) {
            const changes: Record<string, chrome.storage.StorageChange> = {};
            for (const key of Array.isArray(keys) ? keys : [keys]) {
              changes[key] = { oldValue: store[key], newValue: undefined };
              delete store[key];
            }
            emitStorageChanges(changes);
          },
        },
        onChanged: {
          addListener(
            listener: typeof storageListeners extends Set<infer T> ? T : never
          ) {
            storageListeners.add(listener);
          },
          removeListener(
            listener: typeof storageListeners extends Set<infer T> ? T : never
          ) {
            storageListeners.delete(listener);
          },
        },
      },
    },
  };
}
