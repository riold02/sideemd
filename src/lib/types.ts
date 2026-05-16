export interface Notebook {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  notebookId: string;
  parentNoteId: string | null;
  title: string;
  contentMarkdown: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  schemaVersion: number;
  seedDataVersion?: number;
  notebooks: Record<string, Notebook>;
  notes: Record<string, Note>;
  notebookOrder: string[];
  /** Root note order per notebook (parentNoteId === null). */
  noteOrderByNotebook: Record<string, string[]>;
  /** Direct child order per parent note. */
  childOrderByNote: Record<string, string[]>;
}

export interface ExportPayload {
  schemaVersion: number;
  exportedAt: string;
  notebooks: Notebook[];
  notes: Note[];
  noteOrderByNotebook?: Record<string, string[]>;
  childOrderByNote?: Record<string, string[]>;
}

export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'sideemd_state';
export const LEGACY_STORAGE_KEY = 'mdside_state';
