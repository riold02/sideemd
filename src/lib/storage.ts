import {
  AppState,
  LEGACY_STORAGE_KEY,
  Note,
  Notebook,
  ResearchLog,
  STORAGE_KEY,
  TrackingSettings,
} from './types';
import {
  appendActivity,
  createActivityEntry,
  createDefaultState,
  createId,
  nowIso,
} from './state';
import { normalizeState } from './storageNormalize';
import {
  appendChild,
  deleteNotebookFromState,
  getChromeStorage,
  removeNoteSubtree,
  setNoteSubtreeDeleted,
  type ChromeStorageLike,
} from './storageHelpers';

export interface StorageRepository {
  getState(): Promise<AppState>;
  saveState(state: AppState): Promise<void>;
  createNotebook(name: string): Promise<Notebook>;
  createNote(notebookId: string, title?: string): Promise<Note>;
  createSubnote(parentNoteId: string, title?: string): Promise<Note>;
  updateNote(
    noteId: string,
    updates: Partial<
      Pick<Note, 'title' | 'contentMarkdown' | 'tags' | 'pinned' | 'favorite'>
    >
  ): Promise<Note | null>;
  deleteNote(noteId: string): Promise<void>;
  discardNote(noteId: string): Promise<void>;
  restoreNote(noteId: string): Promise<void>;
  createResearchLog(
    input: Omit<ResearchLog, 'id' | 'researchedAt'> & { researchedAt?: string }
  ): Promise<ResearchLog>;
  deleteResearchLog(logId: string): Promise<void>;
  clearResearchLogs(): Promise<void>;
  updateTrackingSettings(
    updates: Partial<TrackingSettings>
  ): Promise<TrackingSettings>;
  renameNotebook(notebookId: string, name: string): Promise<Notebook | null>;
  deleteNotebook(notebookId: string): Promise<void>;
  searchNotes(query: string): Promise<Note[]>;
}

export class ChromeStorageRepository implements StorageRepository {
  private storage: ChromeStorageLike;

  constructor(storage: ChromeStorageLike = getChromeStorage()) {
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
    state.childOrderByNote = state.childOrderByNote ?? {};

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
      parentNoteId: null,
      title: title.trim() || 'Untitled Note',
      contentMarkdown: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    state.notes[note.id] = note;
    state.noteOrderByNotebook[notebookId] =
      state.noteOrderByNotebook[notebookId] ?? [];
    state.noteOrderByNotebook[notebookId].unshift(note.id);
    state.notebooks[notebookId].updatedAt = timestamp;

    await this.saveState(
      appendActivity(
        state,
        createActivityEntry('note.created', 'note', note.id, note.title)
      )
    );
    return note;
  }

  async createSubnote(
    parentNoteId: string,
    title = 'Untitled Note'
  ): Promise<Note> {
    const state = await this.getState();
    const parent = state.notes[parentNoteId];
    if (!parent) {
      throw new Error('Parent note not found');
    }

    const timestamp = nowIso();
    const note: Note = {
      id: createId('note'),
      notebookId: parent.notebookId,
      parentNoteId,
      title: title.trim() || 'Untitled Note',
      contentMarkdown: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    state.notes[note.id] = note;
    appendChild(state, parentNoteId, note.id);
    state.notebooks[parent.notebookId].updatedAt = timestamp;

    await this.saveState(
      appendActivity(
        state,
        createActivityEntry('note.created', 'note', note.id, note.title)
      )
    );
    return note;
  }

  async updateNote(
    noteId: string,
    updates: Partial<
      Pick<Note, 'title' | 'contentMarkdown' | 'tags' | 'pinned' | 'favorite'>
    >
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

    await this.saveState(
      appendActivity(
        state,
        createActivityEntry('note.updated', 'note', next.id, next.title)
      )
    );
    return next;
  }

  async deleteNote(noteId: string): Promise<void> {
    const state = await this.getState();
    const note = setNoteSubtreeDeleted(state, noteId, nowIso());
    if (!note) return;
    await this.saveState(
      appendActivity(
        state,
        createActivityEntry('note.deleted', 'note', note.id, note.title)
      )
    );
  }

  async discardNote(noteId: string): Promise<void> {
    const state = await this.getState();
    if (!removeNoteSubtree(state, noteId)) return;
    await this.saveState(state);
  }

  async restoreNote(noteId: string): Promise<void> {
    const state = await this.getState();
    const note = setNoteSubtreeDeleted(state, noteId, null);
    if (!note) return;
    await this.saveState(
      appendActivity(
        state,
        createActivityEntry('note.restored', 'note', note.id, note.title)
      )
    );
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
    const next = deleteNotebookFromState(state, notebookId);
    if (!next) return;
    await this.saveState(next);
  }

  async searchNotes(query: string): Promise<Note[]> {
    const state = await this.getState();
    const normalized = query.trim().toLowerCase();
    const notes = Object.values(state.notes).filter((note) => !note.deletedAt);

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

  async createResearchLog(
    input: Omit<ResearchLog, 'id' | 'researchedAt'> & {
      researchedAt?: string;
    }
  ): Promise<ResearchLog> {
    const state = await this.getState();
    const log: ResearchLog = {
      ...input,
      id: createId('research'),
      researchedAt: input.researchedAt ?? nowIso(),
    };
    state.researchLogs[log.id] = log;
    state.researchLogOrder.unshift(log.id);
    await this.saveState(
      appendActivity(
        state,
        createActivityEntry('research.created', 'research', log.id, log.query)
      )
    );
    return log;
  }

  async deleteResearchLog(logId: string): Promise<void> {
    const state = await this.getState();
    const log = state.researchLogs[logId];
    if (!log) return;
    delete state.researchLogs[logId];
    state.researchLogOrder = state.researchLogOrder.filter(
      (id) => id !== logId
    );
    await this.saveState(
      appendActivity(
        state,
        createActivityEntry('research.deleted', 'research', log.id, log.query)
      )
    );
  }

  async clearResearchLogs(): Promise<void> {
    const state = await this.getState();
    state.researchLogs = {};
    state.researchLogOrder = [];
    await this.saveState(
      appendActivity(
        state,
        createActivityEntry('research.cleared', 'research', 'all', 'All logs')
      )
    );
  }

  async updateTrackingSettings(
    updates: Partial<TrackingSettings>
  ): Promise<TrackingSettings> {
    const state = await this.getState();
    state.trackingSettings = {
      ...state.trackingSettings,
      ...updates,
    };
    await this.saveState(
      appendActivity(
        state,
        createActivityEntry(
          'tracking.updated',
          'tracking',
          'settings',
          'Research tracking'
        )
      )
    );
    return state.trackingSettings;
  }
}
