import { AppState, SCHEMA_VERSION } from './types';
import {
  MARKDOWN_SHOWCASE_MARKDOWN,
  MARKDOWN_SHOWCASE_TITLE,
  SEED_DATA_VERSION,
  WELCOME_MARKDOWN,
  createId,
  nowIso,
} from './state';

function reconcileHierarchy(state: AppState): AppState {
  const notes = { ...state.notes };
  const childOrderByNote: Record<string, string[]> = {};
  const noteOrderByNotebook: Record<string, string[]> = {};

  for (const [noteId, note] of Object.entries(notes)) {
    let parentId = note.parentNoteId ?? null;
    if (parentId && !notes[parentId]) {
      parentId = null;
      notes[noteId] = { ...note, parentNoteId: null };
    }
    if (parentId) {
      childOrderByNote[parentId] = childOrderByNote[parentId] ?? [];
      if (!childOrderByNote[parentId].includes(noteId)) {
        childOrderByNote[parentId].push(noteId);
      }
    }
  }

  for (const [notebookId, orderedIds] of Object.entries(
    state.noteOrderByNotebook
  )) {
    noteOrderByNotebook[notebookId] = orderedIds.filter((id) => {
      const note = state.notes[id];
      return Boolean(note) && (note.parentNoteId ?? null) === null;
    });
  }

  for (const note of Object.values(notes)) {
    if ((note.parentNoteId ?? null) !== null) continue;
    noteOrderByNotebook[note.notebookId] =
      noteOrderByNotebook[note.notebookId] ?? [];
    if (!noteOrderByNotebook[note.notebookId].includes(note.id)) {
      noteOrderByNotebook[note.notebookId].push(note.id);
    }
  }

  return { ...state, notes, noteOrderByNotebook, childOrderByNote };
}

export function normalizeState(state: AppState): AppState {
  let changed = false;
  let next: AppState = {
    ...state,
    schemaVersion: state.schemaVersion ?? 1,
    notebooks: { ...state.notebooks },
    notes: { ...state.notes },
    noteOrderByNotebook: { ...state.noteOrderByNotebook },
    childOrderByNote: { ...(state.childOrderByNote ?? {}) },
  };

  if (next.schemaVersion < SCHEMA_VERSION) {
    for (const [noteId, note] of Object.entries(next.notes)) {
      if (note.parentNoteId === undefined) {
        next.notes[noteId] = { ...note, parentNoteId: null };
      }
    }
    next.schemaVersion = SCHEMA_VERSION;
    next.childOrderByNote = next.childOrderByNote ?? {};
    changed = true;
  }

  for (const [noteId, note] of Object.entries(next.notes)) {
    if (note.parentNoteId === undefined) {
      next.notes[noteId] = { ...note, parentNoteId: null };
      changed = true;
    }
    if (
      note.title === 'Welcome' &&
      (note.contentMarkdown === '# MdSide\\n\\nStart taking notes.' ||
        note.contentMarkdown === '# MdSide\n\nStart taking notes.')
    ) {
      next.notes[noteId] = {
        ...note,
        contentMarkdown: WELCOME_MARKDOWN,
      };
      changed = true;
    }
  }

  if ((state.seedDataVersion ?? 0) < SEED_DATA_VERSION) {
    const hasShowcase = Object.values(next.notes).some(
      (note) => note.title === MARKDOWN_SHOWCASE_TITLE
    );
    const notebookId = next.notebookOrder[0];

    if (!hasShowcase && notebookId && next.notebooks[notebookId]) {
      const timestamp = nowIso();
      const noteId = createId('note');

      next.notes[noteId] = {
        id: noteId,
        notebookId,
        parentNoteId: null,
        title: MARKDOWN_SHOWCASE_TITLE,
        contentMarkdown: MARKDOWN_SHOWCASE_MARKDOWN,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      next.noteOrderByNotebook[notebookId] = [
        noteId,
        ...(next.noteOrderByNotebook[notebookId] ?? []),
      ];
      next.notebooks[notebookId] = {
        ...next.notebooks[notebookId],
        updatedAt: timestamp,
      };
      changed = true;
    }

    next.seedDataVersion = SEED_DATA_VERSION;
    changed = true;
  }

  const reconciled = reconcileHierarchy(next);
  if (reconciled !== next) {
    next = reconciled;
    changed = true;
  }

  return changed ? next : state;
}
