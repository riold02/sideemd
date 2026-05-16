export function createChromeStorageMock() {
  const store: Record<string, unknown> = {};

  return {
    store,
    chrome: {
      storage: {
        local: {
          async get(key: string) {
            return { [key]: store[key] };
          },
          async set(items: Record<string, unknown>) {
            Object.assign(store, items);
          },
        },
      },
    },
  };
}
