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
    expect(Object.keys(state.notes).length).toBe(1);
    expect(
      Object.values(state.notes).some(
        (note) => note.contentMarkdown === WELCOME_MARKDOWN
      )
    ).toBe(true);
    expect(Object.values(state.notes)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: MARKDOWN_SHOWCASE_TITLE }),
      ])
    );
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

  it('drops legacy task records while loading saved state', async () => {
    const memory = createMemoryStorage();
    const state = createDefaultState() as ReturnType<
      typeof createDefaultState
    > & {
      tasks?: Record<string, unknown>;
      taskOrder?: string[];
    };
    state.tasks = { task_1: { id: 'task_1' } };
    state.taskOrder = ['task_1'];
    state.activityLog.unshift({
      id: 'activity_task',
      action: 'task.created' as never,
      objectType: 'task' as never,
      objectId: 'task_1',
      objectLabel: 'Old task',
      createdAt: '2026-05-22T00:00:00.000Z',
    });
    await memory.set({ [STORAGE_KEY]: state });

    const repo = new ChromeStorageRepository(memory);
    const normalized = await repo.getState();

    expect('tasks' in normalized).toBe(false);
    expect('taskOrder' in normalized).toBe(false);
    expect(normalized.activityLog).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'activity_task' })])
    );
  });

  it('removes the untouched markdown showcase seed from older states', async () => {
    const memory = createMemoryStorage();
    const state = createDefaultState();
    const showcaseId = 'showcase';
    const notebookId = state.notebookOrder[0];
    state.notes[showcaseId] = {
      id: showcaseId,
      notebookId,
      parentNoteId: null,
      title: MARKDOWN_SHOWCASE_TITLE,
      contentMarkdown: MARKDOWN_SHOWCASE_MARKDOWN,
      createdAt: '2026-05-22T00:00:00.000Z',
      updatedAt: '2026-05-22T00:00:00.000Z',
    };
    state.noteOrderByNotebook[notebookId].unshift(showcaseId);
    state.seedDataVersion = 1;
    await memory.set({ [STORAGE_KEY]: state });

    const repo = new ChromeStorageRepository(memory);
    const normalized = await repo.getState();

    expect(normalized.seedDataVersion).toBe(SEED_DATA_VERSION);
    expect(normalized.notes[showcaseId]).toBeUndefined();
    expect(normalized.noteOrderByNotebook[notebookId]).not.toContain(
      showcaseId
    );
  });

  it('keeps a markdown showcase seed after it gains user state', async () => {
    const memory = createMemoryStorage();
    const state = createDefaultState();
    const notebookId = state.notebookOrder[0];
    state.notes.showcase = {
      id: 'showcase',
      notebookId,
      parentNoteId: null,
      title: MARKDOWN_SHOWCASE_TITLE,
      contentMarkdown: MARKDOWN_SHOWCASE_MARKDOWN,
      tags: ['reference'],
      createdAt: '2026-05-22T00:00:00.000Z',
      updatedAt: '2026-05-22T00:00:00.000Z',
    };
    state.noteOrderByNotebook[notebookId].unshift('showcase');
    state.seedDataVersion = 1;
    await memory.set({ [STORAGE_KEY]: state });

    const repo = new ChromeStorageRepository(memory);
    const normalized = await repo.getState();

    expect(normalized.notes.showcase).toBeTruthy();
    expect(normalized.noteOrderByNotebook[notebookId]).toContain('showcase');
  });

  it('creates and searches notes', async () => {
    const memory = createMemoryStorage();
    const repo = new ChromeStorageRepository(memory);
    const state = await repo.getState();

    const notebookId = state.notebookOrder[0];
    const note = await repo.createNote(notebookId, 'Design Doc');
    expect(note.contentMarkdown).toBe('');

    await repo.updateNote(note.id, {
      contentMarkdown: 'Checklist for browser side panel',
    });

    const results = await repo.searchNotes('side panel');
    expect(results.find((x) => x.id === note.id)).toBeTruthy();

    const persisted = await memory.get(STORAGE_KEY);
    expect(persisted[STORAGE_KEY]).toBeTruthy();
  });

  it('discards blank draft notes instead of keeping them in storage', async () => {
    const memory = createMemoryStorage();
    const repo = new ChromeStorageRepository(memory);
    const state = await repo.getState();
    const note = await repo.createNote(state.notebookOrder[0]);

    await repo.discardNote(note.id);
    const next = await repo.getState();

    expect(next.notes[note.id]).toBeUndefined();
    expect(next.noteOrderByNotebook[note.notebookId]).not.toContain(note.id);
  });

  it('creates subnotes and moves the subtree through trash restore', async () => {
    const memory = createMemoryStorage();
    const repo = new ChromeStorageRepository(memory);
    const state = await repo.getState();
    const rootId = state.noteOrderByNotebook[state.notebookOrder[0]][0];

    const child = await repo.createSubnote(rootId, 'Child');
    const grandchild = await repo.createSubnote(child.id, 'Grandchild');

    const afterCreate = await repo.getState();
    expect(afterCreate.notes[child.id].parentNoteId).toBe(rootId);
    expect(afterCreate.childOrderByNote[rootId]).toContain(child.id);
    expect(afterCreate.childOrderByNote[child.id]).toContain(grandchild.id);

    await repo.deleteNote(rootId);

    const afterDelete = await repo.getState();
    expect(afterDelete.notes[rootId].deletedAt).toBeTruthy();
    expect(afterDelete.notes[child.id].deletedAt).toBeTruthy();
    expect(afterDelete.notes[grandchild.id].deletedAt).toBeTruthy();

    await repo.restoreNote(rootId);
    const afterRestore = await repo.getState();
    expect(afterRestore.notes[rootId].deletedAt).toBeNull();
    expect(afterRestore.notes[child.id].deletedAt).toBeNull();
    expect(afterRestore.notes[grandchild.id].deletedAt).toBeNull();
  });

  it('stores research logs, tracking settings, and activity', async () => {
    const memory = createMemoryStorage();
    const repo = new ChromeStorageRepository(memory);
    await repo.getState();

    const log = await repo.createResearchLog({
      query: 'chrome side panel',
      website: 'developer.chrome.com',
      url: 'https://developer.chrome.com/docs/extensions',
      pageTitle: 'Chrome extensions',
      personalNote: 'Check sidePanel behavior.',
    });
    await repo.updateTrackingSettings({
      paused: true,
      allowedDomains: ['developer.chrome.com'],
    });

    const state = await repo.getState();
    expect(state.researchLogs[log.id].website).toBe('developer.chrome.com');
    expect(state.trackingSettings.paused).toBe(true);
    expect(state.trackingSettings.allowedDomains).toEqual([
      'developer.chrome.com',
    ]);
    expect(state.activityLog.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['research.created', 'tracking.updated'])
    );
  });
});
