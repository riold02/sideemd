import { AppState, Note, Notebook, STORAGE_KEY } from "./types";
import { MARKDOWN_SHOWCASE_MARKDOWN, MARKDOWN_SHOWCASE_TITLE, SEED_DATA_VERSION, WELCOME_MARKDOWN, createDefaultState, createId, nowIso } from "./state";

export interface StorageRepository {
  getState(): Promise<AppState>;
  saveState(state: AppState): Promise<void>;
  createNotebook(name: string): Promise<Notebook>;
  createNote(notebookId: string, title?: string): Promise<Note>;
  updateNote(noteId: string, updates: Partial<Pick<Note, "title" | "contentMarkdown" | "tags">>): Promise<Note | null>;
  deleteNote(noteId: string): Promise<void>;
  renameNotebook(notebookId: string, name: string): Promise<Notebook | null>;
  deleteNotebook(notebookId: string): Promise<void>;
  searchNotes(query: string): Promise<Note[]>;
}

interface ChromeStorageLike {
  get: (key: string) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
}

function getChromeStorage(): ChromeStorageLike {
  return chrome.storage.local;
}

function normalizeState(state: AppState): AppState {
  let changed = false;
  const next: AppState = {
    ...state,
    notebooks: { ...state.notebooks },
    notes: { ...state.notes },
    noteOrderByNotebook: { ...state.noteOrderByNotebook }
  };

  for (const [noteId, note] of Object.entries(next.notes)) {
    if (note.title === "Welcome" && note.contentMarkdown === "# MdSide\\n\\nStart taking notes.") {
      next.notes[noteId] = {
        ...note,
        contentMarkdown: WELCOME_MARKDOWN
      };
      changed = true;
    }
  }

  if ((state.seedDataVersion ?? 0) < SEED_DATA_VERSION) {
    const hasShowcase = Object.values(next.notes).some((note) => note.title === MARKDOWN_SHOWCASE_TITLE);
    const notebookId = next.notebookOrder[0];

    if (!hasShowcase && notebookId && next.notebooks[notebookId]) {
      const timestamp = nowIso();
      const noteId = createId("note");

      next.notes[noteId] = {
        id: noteId,
        notebookId,
        title: MARKDOWN_SHOWCASE_TITLE,
        contentMarkdown: MARKDOWN_SHOWCASE_MARKDOWN,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      next.noteOrderByNotebook[notebookId] = [noteId, ...(next.noteOrderByNotebook[notebookId] ?? [])];
      next.notebooks[notebookId] = {
        ...next.notebooks[notebookId],
        updatedAt: timestamp
      };
      changed = true;
    }

    next.seedDataVersion = SEED_DATA_VERSION;
    changed = true;
  }

  return changed ? next : state;
}

export class ChromeStorageRepository implements StorageRepository {
  private storage: ChromeStorageLike;

  constructor(storage = getChromeStorage()) {
    this.storage = storage;
  }

  async getState(): Promise<AppState> {
    const data = await this.storage.get(STORAGE_KEY);
    const state = data[STORAGE_KEY] as AppState | undefined;

    if (!state) {
      const initial = createDefaultState();
      await this.saveState(initial);
      return initial;
    }

    const normalized = normalizeState(state);
    if (normalized !== state) {
      await this.saveState(normalized);
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
      id: createId("book"),
      name: name.trim() || "Untitled Notebook",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    state.notebooks[notebook.id] = notebook;
    state.notebookOrder.push(notebook.id);
    state.noteOrderByNotebook[notebook.id] = [];

    await this.saveState(state);
    return notebook;
  }

  async createNote(notebookId: string, title = "Untitled Note"): Promise<Note> {
    const state = await this.getState();
    if (!state.notebooks[notebookId]) {
      throw new Error("Notebook not found");
    }

    const timestamp = nowIso();
    const note: Note = {
      id: createId("note"),
      notebookId,
      title: title.trim() || "Untitled Note",
      contentMarkdown: MARKDOWN_SHOWCASE_MARKDOWN,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    state.notes[note.id] = note;
    state.noteOrderByNotebook[notebookId] = state.noteOrderByNotebook[notebookId] ?? [];
    state.noteOrderByNotebook[notebookId].unshift(note.id);
    state.notebooks[notebookId].updatedAt = timestamp;

    await this.saveState(state);
    return note;
  }

  async updateNote(noteId: string, updates: Partial<Pick<Note, "title" | "contentMarkdown" | "tags">>): Promise<Note | null> {
    const state = await this.getState();
    const existing = state.notes[noteId];
    if (!existing) {
      return null;
    }

    const next: Note = {
      ...existing,
      ...updates,
      title: (updates.title ?? existing.title).trim() || "Untitled Note",
      updatedAt: nowIso()
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
    state.noteOrderByNotebook[note.notebookId] = (state.noteOrderByNotebook[note.notebookId] ?? []).filter((id) => id !== noteId);

    await this.saveState(state);
  }

  async renameNotebook(notebookId: string, name: string): Promise<Notebook | null> {
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

    const fallbackNotebookId = state.notebookOrder.find((id) => id !== notebookId);
    const noteIds = state.noteOrderByNotebook[notebookId] ?? [];

    if (fallbackNotebookId) {
      for (const noteId of noteIds) {
        const note = state.notes[noteId];
        if (!note) {
          continue;
        }
        note.notebookId = fallbackNotebookId;
        note.updatedAt = nowIso();
        state.noteOrderByNotebook[fallbackNotebookId] = state.noteOrderByNotebook[fallbackNotebookId] ?? [];
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
      return note.title.toLowerCase().includes(normalized) || note.contentMarkdown.toLowerCase().includes(normalized);
    });
  }
}
