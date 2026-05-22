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
  pinned?: boolean;
  favorite?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchLog {
  id: string;
  query: string;
  website: string;
  url: string;
  pageTitle: string;
  researchedAt: string;
  personalNote: string;
}

export interface ActivityEntry {
  id: string;
  action:
    | 'note.created'
    | 'note.updated'
    | 'note.deleted'
    | 'note.restored'
    | 'research.created'
    | 'research.deleted'
    | 'research.cleared'
    | 'tracking.updated';
  objectType: 'note' | 'research' | 'tracking';
  objectId: string;
  objectLabel: string;
  createdAt: string;
}

export interface TrackingSettings {
  enabled: boolean;
  paused: boolean;
  allowedDomains: string[];
  blockedDomains: string[];
  blockSensitivePages: boolean;
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
  researchLogs: Record<string, ResearchLog>;
  researchLogOrder: string[];
  activityLog: ActivityEntry[];
  trackingSettings: TrackingSettings;
}

export interface ExportPayload {
  schemaVersion: number;
  exportedAt: string;
  notebooks: Notebook[];
  notes: Note[];
  noteOrderByNotebook?: Record<string, string[]>;
  childOrderByNote?: Record<string, string[]>;
  researchLogs?: ResearchLog[];
  researchLogOrder?: string[];
  activityLog?: ActivityEntry[];
  trackingSettings?: TrackingSettings;
}

export const SCHEMA_VERSION = 3;
export const STORAGE_KEY = 'sideemd_state';
export const LEGACY_STORAGE_KEY = 'mdside_state';
