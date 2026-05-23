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

export function moveNotebookInState(
  state: AppState,
  notebookId: string,
  targetIndex: number
) {
  const currentIndex = state.notebookOrder.indexOf(notebookId);
  if (currentIndex === -1) return null;

  const nextIndex = Math.max(
    0,
    Math.min(targetIndex, state.notebookOrder.length - 1)
  );
  if (currentIndex === nextIndex) return state.notebookOrder;

  const order = [...state.notebookOrder];
  order.splice(currentIndex, 1);
  const insertIndex =
    currentIndex < nextIndex ? Math.max(0, nextIndex - 1) : nextIndex;
  order.splice(insertIndex, 0, notebookId);
  state.notebookOrder = order;
  return order;
}

function removeFromCurrentLocation(state: AppState, noteId: string) {
  const note = state.notes[noteId];
  if (!note) return null;

  if (note.parentNoteId) {
    state.childOrderByNote[note.parentNoteId] = (
      state.childOrderByNote[note.parentNoteId] ?? []
    ).filter((id) => id !== noteId);
  } else {
    state.noteOrderByNotebook[note.notebookId] = (
      state.noteOrderByNotebook[note.notebookId] ?? []
    ).filter((id) => id !== noteId);
  }

  return note;
}

function assignNotebookToSubtree(
  state: AppState,
  noteId: string,
  notebookId: string,
  updatedAt: string
) {
  for (const id of [noteId, ...collectDescendantIds(state, noteId)]) {
    const note = state.notes[id];
    if (!note) continue;
    note.notebookId = notebookId;
    note.updatedAt = updatedAt;
  }
}

export function moveNoteInState(
  state: AppState,
  noteId: string,
  destination: {
    notebookId: string;
    parentNoteId: string | null;
    index: number;
  }
) {
  const note = state.notes[noteId];
  if (!note || !state.notebooks[destination.notebookId]) return null;

  const descendants = new Set(collectDescendantIds(state, noteId));
  if (
    destination.parentNoteId === noteId ||
    (destination.parentNoteId && descendants.has(destination.parentNoteId))
  ) {
    return null;
  }

  if (destination.parentNoteId) {
    const parent = state.notes[destination.parentNoteId];
    if (!parent) return null;
    destination.notebookId = parent.notebookId;
  }

  const sourceParentNoteId = note.parentNoteId;
  const sourceNotebookId = note.notebookId;
  const sourceCollection = sourceParentNoteId
    ? state.childOrderByNote[sourceParentNoteId] ?? []
    : state.noteOrderByNotebook[sourceNotebookId] ?? [];
  const sourceIndex = sourceCollection.indexOf(noteId);

  removeFromCurrentLocation(state, noteId);

  const timestamp = nowIso();
  assignNotebookToSubtree(state, noteId, destination.notebookId, timestamp);
  state.notes[noteId].parentNoteId = destination.parentNoteId;
  state.notes[noteId].updatedAt = timestamp;

  const targetCollection = destination.parentNoteId
    ? (state.childOrderByNote[destination.parentNoteId] =
        state.childOrderByNote[destination.parentNoteId] ?? [])
    : (state.noteOrderByNotebook[destination.notebookId] =
        state.noteOrderByNotebook[destination.notebookId] ?? []);

  const nextIndex = Math.max(
    0,
    Math.min(destination.index, targetCollection.length)
  );
  const insertIndex =
    sourceParentNoteId === destination.parentNoteId &&
    sourceNotebookId === destination.notebookId &&
    sourceIndex > -1 &&
    sourceIndex < nextIndex
      ? nextIndex - 1
      : nextIndex;
  targetCollection.splice(insertIndex, 0, noteId);

  state.notebooks[note.notebookId].updatedAt = timestamp;
  state.notebooks[destination.notebookId].updatedAt = timestamp;
  return state.notes[noteId];
}
