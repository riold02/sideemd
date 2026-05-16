import {
  AppState,
  LEGACY_STORAGE_KEY,
  Note,
  Notebook,
  STORAGE_KEY,
} from './types';
import {
  MARKDOWN_SHOWCASE_MARKDOWN,
  createDefaultState,
  createId,
  nowIso,
} from './state';
import { normalizeState } from './storageNormalize';

export interface StorageRepository {
  getState(): Promise<AppState>;
  saveState(state: AppState): Promise<void>;
  createNotebook(name: string): Promise<Notebook>;
  createNote(notebookId: string, title?: string): Promise<Note>;
  updateNote(
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'contentMarkdown' | 'tags'>>
  ): Promise<Note | null>;
  deleteNote(noteId: string): Promise<void>;
  renameNotebook(notebookId: string, name: string): Promise<Notebook | null>;
  deleteNotebook(notebookId: string): Promise<void>;
  searchNotes(query: string): Promise<Note[]>;
}

interface ChromeStorageLike {
  get: (keys: string | string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
}

function getChromeStorage(): ChromeStorageLike {
  return chrome.storage.local;
}

export class ChromeStorageRepository implements StorageRepository {
  private storage: ChromeStorageLike;

  constructor(storage = getChromeStorage()) {
    this.storage = storage;
  }

  async getState(): Promise<AppState> {
    const data = await this.storage.get([STORAGE_KEY, LEGACY_STORAGE_KEY]);
    let state =
      (data[STORAGE_KEY] as AppState | undefined) ??
      (data[LEGACY_STORAGE_KEY] as AppState | undefined);

    if (!state) {
      const initial = createDefaultState();
      await this.saveState(initial);
      return initial;
    }

    const normalized = normalizeState(state);
    const migratedFromLegacy =
      !data[STORAGE_KEY] && Boolean(data[LEGACY_STORAGE_KEY]);

    if (normalized !== state || migratedFromLegacy) {
      await this.saveState(normalized);
    }

    if (migratedFromLegacy) {
      await this.storage.remove(LEGACY_STORAGE_KEY);
    }

    return normalized;
  }

  async saveState(state: AppState): Promise<void> {
    await this.storage.set({ [STORAGE_KEY]: state });
  }

  async createNotebook(name: string): Promise<Notebook> {
    const state = await this.getState();
    const timestamp = nowIso();
    const notebook: Notebook = {
      id: createId('book'),
      name: name.trim() || 'Untitled Notebook',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    state.notebooks[notebook.id] = notebook;
    state.notebookOrder.push(notebook.id);
    state.noteOrderByNotebook[notebook.id] = [];

    await this.saveState(state);
    return notebook;
  }

  async createNote(notebookId: string, title = 'Untitled Note'): Promise<Note> {
    const state = await this.getState();
    if (!state.notebooks[notebookId]) {
      throw new Error('Notebook not found');
    }

    const timestamp = nowIso();
    const note: Note = {
      id: createId('note'),
      notebookId,
      title: title.trim() || 'Untitled Note',
      contentMarkdown: MARKDOWN_SHOWCASE_MARKDOWN,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    state.notes[note.id] = note;
    state.noteOrderByNotebook[notebookId] =
      state.noteOrderByNotebook[notebookId] ?? [];
    state.noteOrderByNotebook[notebookId].unshift(note.id);
    state.notebooks[notebookId].updatedAt = timestamp;

    await this.saveState(state);
    return note;
  }

  async updateNote(
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'contentMarkdown' | 'tags'>>
  ): Promise<Note | null> {
    const state = await this.getState();
    const existing = state.notes[noteId];
    if (!existing) {
      return null;
    }

    const next: Note = {
      ...existing,
      ...updates,
      title: (updates.title ?? existing.title).trim() || 'Untitled Note',
      updatedAt: nowIso(),
    };

    state.notes[noteId] = next;
    state.notebooks[next.notebookId].updatedAt = next.updatedAt;

    await this.saveState(state);
    return next;
  }

  async deleteNote(noteId: string): Promise<void> {
    const state = await this.getState();
    const note = state.notes[noteId];
    if (!note) {
      return;
    }

    delete state.notes[noteId];
    state.noteOrderByNotebook[note.notebookId] = (
      state.noteOrderByNotebook[note.notebookId] ?? []
    ).filter((id) => id !== noteId);

    await this.saveState(state);
  }

  async renameNotebook(
    notebookId: string,
    name: string
  ): Promise<Notebook | null> {
    const state = await this.getState();
    const notebook = state.notebooks[notebookId];
    if (!notebook) {
      return null;
    }

    notebook.name = name.trim() || notebook.name;
    notebook.updatedAt = nowIso();

    await this.saveState(state);
    return notebook;
  }

  async deleteNotebook(notebookId: string): Promise<void> {
    const state = await this.getState();
    if (!state.notebooks[notebookId]) {
      return;
    }

    const fallbackNotebookId = state.notebookOrder.find(
      (id) => id !== notebookId
    );
    const noteIds = state.noteOrderByNotebook[notebookId] ?? [];

    if (fallbackNotebookId) {
      for (const noteId of noteIds) {
        const note = state.notes[noteId];
        if (!note) {
          continue;
        }
        note.notebookId = fallbackNotebookId;
        note.updatedAt = nowIso();
        state.noteOrderByNotebook[fallbackNotebookId] =
          state.noteOrderByNotebook[fallbackNotebookId] ?? [];
        state.noteOrderByNotebook[fallbackNotebookId].push(noteId);
      }
    } else {
      for (const noteId of noteIds) {
        delete state.notes[noteId];
      }
    }

    delete state.notebooks[notebookId];
    delete state.noteOrderByNotebook[notebookId];
    state.notebookOrder = state.notebookOrder.filter((id) => id !== notebookId);

    if (state.notebookOrder.length === 0) {
      const initial = createDefaultState();
      await this.saveState(initial);
      return;
    }

    await this.saveState(state);
  }

  async searchNotes(query: string): Promise<Note[]> {
    const state = await this.getState();
    const normalized = query.trim().toLowerCase();
    const notes = Object.values(state.notes);

    if (!normalized) {
      return notes;
    }

    return notes.filter((note) => {
      return (
        note.title.toLowerCase().includes(normalized) ||
        note.contentMarkdown.toLowerCase().includes(normalized)
      );
    });
  }
}
