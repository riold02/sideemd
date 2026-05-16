import {
  AppState,
  ExportPayload,
  Note,
  Notebook,
  SCHEMA_VERSION,
} from './types';

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
    typeof v.updatedAt === 'string'
  );
}

export function serializeState(state: AppState): ExportPayload {
  return {
    schemaVersion: state.schemaVersion,
    exportedAt: new Date().toISOString(),
    notebooks: state.notebookOrder
      .map((id) => state.notebooks[id])
      .filter(Boolean),
    notes: Object.values(state.notes),
  };
}

export function parseImport(raw: string): ExportPayload {
  const parsed = JSON.parse(raw) as Partial<ExportPayload>;

  if (parsed.schemaVersion !== SCHEMA_VERSION) {
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

  return {
    schemaVersion: parsed.schemaVersion,
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    notebooks: parsed.notebooks,
    notes: parsed.notes,
  };
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

  for (const note of payload.notes) {
    next.notes[note.id] = note;
    const order = next.noteOrderByNotebook[note.notebookId] ?? [];
    if (!order.includes(note.id)) {
      order.push(note.id);
    }
    next.noteOrderByNotebook[note.notebookId] = order;
  }

  return next;
}

export function replaceImportedState(payload: ExportPayload): AppState {
  const notebookOrder = payload.notebooks.map((notebook) => notebook.id);
  const noteOrderByNotebook: Record<string, string[]> = {};

  for (const notebook of payload.notebooks) {
    noteOrderByNotebook[notebook.id] = [];
  }

  const notes: Record<string, Note> = {};
  for (const note of payload.notes) {
    notes[note.id] = note;
    noteOrderByNotebook[note.notebookId] =
      noteOrderByNotebook[note.notebookId] ?? [];
    noteOrderByNotebook[note.notebookId].push(note.id);
  }

  const notebooks: Record<string, Notebook> = {};
  for (const notebook of payload.notebooks) {
    notebooks[notebook.id] = notebook;
  }

  return {
    schemaVersion: payload.schemaVersion,
    notebooks,
    notes,
    notebookOrder,
    noteOrderByNotebook,
  };
}
