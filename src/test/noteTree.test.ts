import { describe, expect, it } from 'vitest';
import {
  collectDescendantIds,
  getDirectChildren,
  getNoteAncestors,
} from '../lib/noteTree';
import { createDefaultState } from '../lib/state';
import type { AppState, Note } from '../lib/types';

function withHierarchy(
  notes: Record<string, Note>,
  childOrderByNote: Record<string, string[]>
): AppState {
  const base = createDefaultState();
  return {
    ...base,
    notes,
    childOrderByNote,
    noteOrderByNotebook: {
      [base.notebookOrder[0]]: Object.values(notes)
        .filter((note) => note.parentNoteId === null)
        .map((note) => note.id),
    },
  };
}

describe('noteTree', () => {
  it('returns ancestors from root to parent', () => {
    const root: Note = {
      id: 'root',
      notebookId: 'nb',
      title: 'Root',
      contentMarkdown: '',
      parentNoteId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const child: Note = {
      ...root,
      id: 'child',
      title: 'Child',
      parentNoteId: 'root',
    };
    const grandchild: Note = {
      ...root,
      id: 'grandchild',
      title: 'Grandchild',
      parentNoteId: 'child',
    };
    const state = withHierarchy(
      { root, child, grandchild },
      { root: ['child'], child: ['grandchild'] }
    );

    expect(
      getNoteAncestors(state, 'grandchild').map((note) => note.id)
    ).toEqual(['root', 'child']);
    expect(getDirectChildren(state, 'root').map((note) => note.id)).toEqual([
      'child',
    ]);
    expect(collectDescendantIds(state, 'root')).toEqual([
      'child',
      'grandchild',
    ]);
  });
});
