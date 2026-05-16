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
    typeof v.updatedAt === 'string' &&
    (v.parentNoteId === undefined ||
      v.parentNoteId === null ||
      typeof v.parentNoteId === 'string')
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
    noteOrderByNotebook: state.noteOrderByNotebook,
    childOrderByNote: state.childOrderByNote,
  };
}

export function parseImport(raw: string): ExportPayload {
  const parsed = JSON.parse(raw) as Partial<ExportPayload>;

  if (parsed.schemaVersion !== SCHEMA_VERSION && parsed.schemaVersion !== 1) {
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
    schemaVersion: parsed.schemaVersion ?? SCHEMA_VERSION,
    exportedAt: parsed.exportedAt ?? new Date().toISOString(),
    notebooks: parsed.notebooks,
    notes: parsed.notes.map((note) => ({
      ...note,
      parentNoteId: note.parentNoteId ?? null,
    })),
    noteOrderByNotebook: parsed.noteOrderByNotebook,
    childOrderByNote: parsed.childOrderByNote,
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

  return next;
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
  };

  importNotesIntoState(
    base,
    payload.notes,
    payload.noteOrderByNotebook,
    payload.childOrderByNote
  );

  return base;
}
