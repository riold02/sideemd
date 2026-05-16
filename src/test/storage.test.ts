import { describe, expect, it } from 'vitest';
import { ChromeStorageRepository } from '../lib/storage';
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from '../lib/types';
import {
  MARKDOWN_SHOWCASE_MARKDOWN,
  MARKDOWN_SHOWCASE_TITLE,
  SEED_DATA_VERSION,
  WELCOME_MARKDOWN,
  createDefaultState,
} from '../lib/state';

function createMemoryStorage() {
  const store: Record<string, unknown> = {};
  return {
    store,
    async get(keys: string | string[]) {
      const keyList = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      for (const key of keyList) {
        if (key in store) {
          result[key] = store[key];
        }
      }
      return result;
    },
    async set(items: Record<string, unknown>) {
      Object.assign(store, items);
    },
    async remove(keys: string | string[]) {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete store[key];
      }
    },
  };
}

describe('ChromeStorageRepository', () => {
  it('creates default state when empty', async () => {
    const repo = new ChromeStorageRepository(createMemoryStorage());
    const state = await repo.getState();

    expect(state.notebookOrder.length).toBe(1);
    expect(state.seedDataVersion).toBe(SEED_DATA_VERSION);
    expect(Object.keys(state.notes).length).toBe(2);
    expect(
      Object.values(state.notes).some(
        (note) => note.contentMarkdown === WELCOME_MARKDOWN
      )
    ).toBe(true);
    expect(
      Object.values(state.notes).some(
        (note) => note.title === MARKDOWN_SHOWCASE_TITLE
      )
    ).toBe(true);
    expect(
      Object.values(state.notes).find(
        (note) => note.title === MARKDOWN_SHOWCASE_TITLE
      )?.contentMarkdown
    ).toContain('| Syntax | Example | Supported |');
  });

  it('migrates persisted state from the legacy storage key', async () => {
    const memory = createMemoryStorage();
    const state = createDefaultState();
    await memory.set({ [LEGACY_STORAGE_KEY]: state });

    const repo = new ChromeStorageRepository(memory);
    const loaded = await repo.getState();

    expect(loaded.notes).toEqual(state.notes);
    expect(memory.store[STORAGE_KEY]).toBeTruthy();
    expect(memory.store[LEGACY_STORAGE_KEY]).toBeUndefined();
  });

  it('normalizes old seeded welcome notes with escaped newlines', async () => {
    const memory = createMemoryStorage();
    const state = createDefaultState();
    const noteId = Object.values(state.notes).find(
      (note) => note.title === 'Welcome'
    )?.id;
    expect(noteId).toBeDefined();
    state.notes[noteId as string].contentMarkdown =
      '# MdSide\\n\\nStart taking notes.';
    await memory.set({ [STORAGE_KEY]: state });

    const repo = new ChromeStorageRepository(memory);
    const normalized = await repo.getState();

    expect(normalized.notes[noteId as string].contentMarkdown).toBe(
      WELCOME_MARKDOWN
    );
  });

  it('adds the markdown showcase note to older saved states once', async () => {
    const memory = createMemoryStorage();
    const state = createDefaultState();
    const showcaseId = Object.values(state.notes).find(
      (note) => note.title === MARKDOWN_SHOWCASE_TITLE
    )?.id;

    if (showcaseId) {
      delete state.notes[showcaseId];
      state.noteOrderByNotebook[state.notebookOrder[0]] =
        state.noteOrderByNotebook[state.notebookOrder[0]].filter(
          (id) => id !== showcaseId
        );
    }

    state.seedDataVersion = 0;
    await memory.set({ [STORAGE_KEY]: state });

    const repo = new ChromeStorageRepository(memory);
    const normalized = await repo.getState();
    const showcase = Object.values(normalized.notes).find(
      (note) => note.title === MARKDOWN_SHOWCASE_TITLE
    );

    expect(normalized.seedDataVersion).toBe(SEED_DATA_VERSION);
    expect(showcase?.contentMarkdown).toBe(MARKDOWN_SHOWCASE_MARKDOWN);
  });

  it('creates and searches notes', async () => {
    const memory = createMemoryStorage();
    const repo = new ChromeStorageRepository(memory);
    const state = await repo.getState();

    const notebookId = state.notebookOrder[0];
    const note = await repo.createNote(notebookId, 'Design Doc');
    expect(note.contentMarkdown).toBe(MARKDOWN_SHOWCASE_MARKDOWN);

    await repo.updateNote(note.id, {
      contentMarkdown: 'Checklist for browser side panel',
    });

    const results = await repo.searchNotes('side panel');
    expect(results.find((x) => x.id === note.id)).toBeTruthy();

    const persisted = await memory.get(STORAGE_KEY);
    expect(persisted[STORAGE_KEY]).toBeTruthy();
  });
});
