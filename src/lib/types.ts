export interface Notebook {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  notebookId: string;
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
  noteOrderByNotebook: Record<string, string[]>;
}

export interface ExportPayload {
  schemaVersion: number;
  exportedAt: string;
  notebooks: Notebook[];
  notes: Note[];
}

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'mdside_state';
