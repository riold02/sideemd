import type { AppState, Note } from './types';

export function getNoteAncestors(state: AppState, noteId: string): Note[] {
  const ancestors: Note[] = [];
  let current = state.notes[noteId];
  const visited = new Set<string>();

  while (current?.parentNoteId) {
    if (visited.has(current.parentNoteId)) break;
    visited.add(current.parentNoteId);
    const parent = state.notes[current.parentNoteId];
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
  }

  return ancestors;
}

export function getDirectChildren(
  state: AppState,
  parentNoteId: string
): Note[] {
  const childIds = state.childOrderByNote[parentNoteId] ?? [];
  return childIds
    .map((id) => state.notes[id])
    .filter((note): note is Note => Boolean(note));
}

export function collectDescendantIds(
  state: AppState,
  noteId: string
): string[] {
  const descendants: string[] = [];
  const queue = [...(state.childOrderByNote[noteId] ?? [])];

  while (queue.length > 0) {
    const childId = queue.shift();
    if (!childId || descendants.includes(childId)) continue;
    descendants.push(childId);
    queue.push(...(state.childOrderByNote[childId] ?? []));
  }

  return descendants;
}

export function getRootNotesForNotebook(
  state: AppState,
  notebookId: string
): Note[] {
  const orderedIds = state.noteOrderByNotebook[notebookId] ?? [];
  return orderedIds
    .map((id) => state.notes[id])
    .filter(
      (note): note is Note => Boolean(note) && note.parentNoteId === null
    );
}

export function findNoteByTitleInSubtree(
  state: AppState,
  rootNoteId: string,
  title: string
): Note | null {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return null;

  const root = state.notes[rootNoteId];
  if (!root) return null;
  if (root.title.trim().toLowerCase() === normalized) return root;

  const queue = [...(state.childOrderByNote[rootNoteId] ?? [])];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) continue;
    const note = state.notes[id];
    if (!note) continue;
    if (note.title.trim().toLowerCase() === normalized) return note;
    queue.push(...(state.childOrderByNote[id] ?? []));
  }

  return null;
}

export function collectSubtreeNoteIds(
  state: AppState,
  rootNoteId: string
): string[] {
  return [rootNoteId, ...collectDescendantIds(state, rootNoteId)];
}
