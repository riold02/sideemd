import {
  AppState,
  ExportPayload,
  Note,
  Notebook,
  ResearchLog,
  SCHEMA_VERSION,
  TrackingSettings,
} from './types';
import { DEFAULT_TRACKING_SETTINGS } from './state';
import { normalizeState } from './storageNormalize';

function isNotebook(value: unknown): value is Notebook {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const v = value as Notebook;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  );
}

function isNote(value: unknown): value is Note {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const v = value as Note;
  return (
    typeof v.id === 'string' &&
    typeof v.notebookId === 'string' &&
    typeof v.title === 'string' &&
    typeof v.contentMarkdown === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string' &&
    (v.parentNoteId === undefined ||
      v.parentNoteId === null ||
      typeof v.parentNoteId === 'string')
  );
}

function isResearchLog(value: unknown): value is ResearchLog {
  if (!value || typeof value !== 'object') return false;
  const log = value as ResearchLog;
  return (
    typeof log.id === 'string' &&
    typeof log.query === 'string' &&
    typeof log.website === 'string' &&
    typeof log.url === 'string' &&
    typeof log.pageTitle === 'string' &&
    typeof log.researchedAt === 'string' &&
    typeof log.personalNote === 'string'
  );
}

function normalizeTrackingSettings(
  settings: Partial<TrackingSettings> | undefined
): TrackingSettings {
  return {
    ...DEFAULT_TRACKING_SETTINGS,
    ...settings,
    allowedDomains: Array.isArray(settings?.allowedDomains)
      ? settings.allowedDomains.filter((domain) => typeof domain === 'string')
      : [],
    blockedDomains: Array.isArray(settings?.blockedDomains)
      ? settings.blockedDomains.filter((domain) => typeof domain === 'string')
      : [...DEFAULT_TRACKING_SETTINGS.blockedDomains],
  };
}

export function serializeState(state: AppState): ExportPayload {
  return {
    schemaVersion: state.schemaVersion,
    exportedAt: new Date().toISOString(),
    notebooks: state.notebookOrder
      .map((id) => state.notebooks[id])
      .filter(Boolean),
    notes: Object.values(state.notes),
    noteOrderByNotebook: state.noteOrderByNotebook,
    childOrderByNote: state.childOrderByNote,
    researchLogs: state.researchLogOrder
      .map((id) => state.researchLogs[id])
      .filter(Boolean),
    researchLogOrder: state.researchLogOrder,
    activityLog: state.activityLog,
    trackingSettings: state.trackingSettings,
  };
}

export function parseImport(raw: string): ExportPayload {
  const parsed = JSON.parse(raw) as Partial<ExportPayload>;

  if (![SCHEMA_VERSION, 2, 1].includes(parsed.schemaVersion ?? -1)) {
    throw new Error(
      `Unsupported schema version: ${String(parsed.schemaVersion)}`
    );
  }

  if (!Array.isArray(parsed.notebooks) || !Array.isArray(parsed.notes)) {
    throw new Error('Invalid payload structure');
  }

  for (const notebook of parsed.notebooks) {
    if (!isNotebook(notebook)) {
      throw new Error('Invalid notebook in payload');
    }
  }

  for (const note of parsed.notes) {
    if (!isNote(note)) {
      throw new Error('Invalid note in payload');
    }
  }

  if (
    parsed.researchLogs &&
    (!Array.isArray(parsed.researchLogs) ||
      !parsed.researchLogs.every(isResearchLog))
  ) {
    throw new Error('Invalid research log in payload');
  }

  return {
    schemaVersion: parsed.schemaVersion ?? SCHEMA_VERSION,
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    notebooks: parsed.notebooks,
    notes: parsed.notes.map((note) => ({
      ...note,
      parentNoteId: note.parentNoteId ?? null,
    })),
    noteOrderByNotebook: parsed.noteOrderByNotebook,
    childOrderByNote: parsed.childOrderByNote,
    researchLogs: parsed.researchLogs ?? [],
    researchLogOrder: parsed.researchLogOrder ?? [],
    activityLog: parsed.activityLog ?? [],
    trackingSettings: normalizeTrackingSettings(parsed.trackingSettings),
  };
}

function importNotesIntoState(
  next: AppState,
  notes: Note[],
  noteOrderByNotebook?: Record<string, string[]>,
  childOrderByNote?: Record<string, string[]>
) {
  if (noteOrderByNotebook && childOrderByNote) {
    next.noteOrderByNotebook = {
      ...next.noteOrderByNotebook,
      ...noteOrderByNotebook,
    };
    next.childOrderByNote = { ...next.childOrderByNote, ...childOrderByNote };
    for (const note of notes) {
      next.notes[note.id] = {
        ...note,
        parentNoteId: note.parentNoteId ?? null,
      };
    }
    return;
  }

  for (const note of notes) {
    const parentNoteId = note.parentNoteId ?? null;
    next.notes[note.id] = { ...note, parentNoteId };
    if (parentNoteId) {
      next.childOrderByNote[parentNoteId] =
        next.childOrderByNote[parentNoteId] ?? [];
      if (!next.childOrderByNote[parentNoteId].includes(note.id)) {
        next.childOrderByNote[parentNoteId].push(note.id);
      }
    } else {
      const order = next.noteOrderByNotebook[note.notebookId] ?? [];
      if (!order.includes(note.id)) {
        order.push(note.id);
      }
      next.noteOrderByNotebook[note.notebookId] = order;
    }
  }
}

export function mergeImportedState(
  current: AppState,
  payload: ExportPayload
): AppState {
  const next: AppState = structuredClone(current);

  for (const notebook of payload.notebooks) {
    if (!next.notebooks[notebook.id]) {
      next.notebookOrder.push(notebook.id);
    }
    next.notebooks[notebook.id] = notebook;
    next.noteOrderByNotebook[notebook.id] =
      next.noteOrderByNotebook[notebook.id] ?? [];
  }

  importNotesIntoState(
    next,
    payload.notes,
    payload.noteOrderByNotebook,
    payload.childOrderByNote
  );

  for (const log of payload.researchLogs ?? []) {
    next.researchLogs[log.id] = log;
  }
  next.researchLogOrder = [
    ...new Set([
      ...(payload.researchLogOrder ??
        payload.researchLogs?.map((log) => log.id) ??
        []),
      ...next.researchLogOrder,
    ]),
  ].filter((id) => Boolean(next.researchLogs[id]));
  next.activityLog = [
    ...(payload.activityLog ?? []),
    ...next.activityLog,
  ].slice(0, 200);
  next.trackingSettings = payload.trackingSettings ?? next.trackingSettings;

  return normalizeState(next);
}

export function replaceImportedState(payload: ExportPayload): AppState {
  const notebookOrder = payload.notebooks.map((notebook) => notebook.id);
  const noteOrderByNotebook: Record<string, string[]> = {};
  const childOrderByNote: Record<string, string[]> = {};

  for (const notebook of payload.notebooks) {
    noteOrderByNotebook[notebook.id] = [];
  }

  const notebooks: Record<string, Notebook> = {};
  for (const notebook of payload.notebooks) {
    notebooks[notebook.id] = notebook;
  }

  const notes: Record<string, Note> = {};
  const base: AppState = {
    schemaVersion: SCHEMA_VERSION,
    notebooks,
    notes,
    notebookOrder,
    noteOrderByNotebook,
    childOrderByNote,
    researchLogs: {},
    researchLogOrder: [],
    activityLog: payload.activityLog ?? [],
    trackingSettings:
      payload.trackingSettings ?? structuredClone(DEFAULT_TRACKING_SETTINGS),
  };

  importNotesIntoState(
    base,
    payload.notes,
    payload.noteOrderByNotebook,
    payload.childOrderByNote
  );

  for (const log of payload.researchLogs ?? []) {
    base.researchLogs[log.id] = log;
  }
  base.researchLogOrder = (
    payload.researchLogOrder ??
    payload.researchLogs?.map((log) => log.id) ??
    []
  ).filter((id) => Boolean(base.researchLogs[id]));

  return normalizeState(base);
}
