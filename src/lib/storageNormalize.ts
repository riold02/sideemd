import { AppState } from './types';
import {
  MARKDOWN_SHOWCASE_MARKDOWN,
  MARKDOWN_SHOWCASE_TITLE,
  SEED_DATA_VERSION,
  WELCOME_MARKDOWN,
  createId,
  nowIso,
} from './state';

export function normalizeState(state: AppState): AppState {
  let changed = false;
  const next: AppState = {
    ...state,
    notebooks: { ...state.notebooks },
    notes: { ...state.notes },
    noteOrderByNotebook: { ...state.noteOrderByNotebook },
  };

  for (const [noteId, note] of Object.entries(next.notes)) {
    if (
      note.title === 'Welcome' &&
      note.contentMarkdown === '# MdSide\\n\\nStart taking notes.'
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

  return changed ? next : state;
}
