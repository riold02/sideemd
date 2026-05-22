import type { AppState } from './types';
import { collectDescendantIds } from './noteTree';
import { createDefaultState, nowIso } from './state';

export interface ChromeStorageLike {
  get: (keys: string | string[]) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
}

export function getChromeStorage(): ChromeStorageLike {
  return chrome.storage.local;
}

export function appendChild(
  state: AppState,
  parentNoteId: string,
  childId: string
) {
  state.childOrderByNote[parentNoteId] =
    state.childOrderByNote[parentNoteId] ?? [];
  if (!state.childOrderByNote[parentNoteId].includes(childId)) {
    state.childOrderByNote[parentNoteId].unshift(childId);
  }
}

export function removeNoteSubtree(state: AppState, noteId: string) {
  const root = state.notes[noteId];
  if (!root) return null;

  const idsToDelete = [noteId, ...collectDescendantIds(state, noteId)];
  for (const id of idsToDelete) {
    const target = state.notes[id];
    if (!target) continue;

    if (target.parentNoteId) {
      const siblings = state.childOrderByNote[target.parentNoteId] ?? [];
      state.childOrderByNote[target.parentNoteId] = siblings.filter(
        (childId) => childId !== id
      );
    } else {
      state.noteOrderByNotebook[target.notebookId] = (
        state.noteOrderByNotebook[target.notebookId] ?? []
      ).filter((rootId) => rootId !== id);
    }

    delete state.notes[id];
    delete state.childOrderByNote[id];
  }

  state.notebooks[root.notebookId].updatedAt = nowIso();
  return root;
}

export function setNoteSubtreeDeleted(
  state: AppState,
  noteId: string,
  deletedAt: string | null
) {
  const root = state.notes[noteId];
  if (!root) return null;

  for (const id of [noteId, ...collectDescendantIds(state, noteId)]) {
    const note = state.notes[id];
    if (!note) continue;
    state.notes[id] = { ...note, deletedAt, updatedAt: nowIso() };
  }

  state.notebooks[root.notebookId].updatedAt = nowIso();
  return root;
}

export function deleteNotebookFromState(
  state: AppState,
  notebookId: string
): AppState | null {
  if (!state.notebooks[notebookId]) return null;

  const fallbackNotebookId = state.notebookOrder.find(
    (id) => id !== notebookId
  );
  const noteIds = Object.values(state.notes)
    .filter((note) => note.notebookId === notebookId)
    .map((note) => note.id);

  if (fallbackNotebookId) {
    for (const noteId of noteIds) {
      const note = state.notes[noteId];
      if (!note) continue;
      note.notebookId = fallbackNotebookId;
      note.updatedAt = nowIso();
      if (note.parentNoteId === null) {
        state.noteOrderByNotebook[fallbackNotebookId] =
          state.noteOrderByNotebook[fallbackNotebookId] ?? [];
        if (!state.noteOrderByNotebook[fallbackNotebookId].includes(noteId)) {
          state.noteOrderByNotebook[fallbackNotebookId].push(noteId);
        }
      }
    }
  } else {
    for (const noteId of noteIds) {
      delete state.notes[noteId];
      delete state.childOrderByNote[noteId];
    }
  }

  delete state.notebooks[notebookId];
  delete state.noteOrderByNotebook[notebookId];
  state.notebookOrder = state.notebookOrder.filter((id) => id !== notebookId);

  if (state.notebookOrder.length === 0) {
    return createDefaultState();
  }

  return state;
}
