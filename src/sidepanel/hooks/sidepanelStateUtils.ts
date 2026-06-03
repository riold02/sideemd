import {
  appendActivity,
  createActivityEntry,
} from '../../lib/state';
import type { AppState, Note, ResearchLog } from '../../lib/types';
import {
  ACTIVITY_TAB,
  DASHBOARD_TAB,
  HOME_TAB,
  RESEARCH_TAB,
  SETTINGS_TAB,
} from '../editorConfig';

export const WORKSPACE_TABS = new Set([
  HOME_TAB,
  DASHBOARD_TAB,
  RESEARCH_TAB,
  ACTIVITY_TAB,
  SETTINGS_TAB,
]);

export function withUpdatedNote(
  state: AppState,
  noteId: string,
  updates: Partial<Pick<Note, 'title' | 'contentMarkdown'>>
): AppState {
  const existing = state.notes[noteId];
  if (!existing) return state;
  const next = {
    ...state,
    notes: {
      ...state.notes,
      [noteId]: {
        ...existing,
        ...updates,
        title: (updates.title ?? existing.title).trim() || 'Untitled Note',
        updatedAt: new Date().toISOString(),
      },
    },
  };
  return appendActivity(
    next,
    createActivityEntry(
      'note.updated',
      'note',
      noteId,
      next.notes[noteId].title
    )
  );
}

export function isDiscardableDraft(state: AppState, noteId: string) {
  const note = state.notes[noteId];
  return Boolean(
    note &&
      note.title === 'Untitled Note' &&
      !note.contentMarkdown.trim() &&
      !note.tags?.length &&
      !note.pinned &&
      !note.favorite &&
      !note.deletedAt &&
      !(state.childOrderByNote[noteId]?.length ?? 0)
  );
}

export function getSelectedNote(state: AppState, activeTab: string) {
  return activeTab === HOME_TAB ||
    activeTab === DASHBOARD_TAB ||
    !state.notes[activeTab]
    ? null
    : state.notes[activeTab];
}

export function getRootNotes(
  state: AppState,
  selectedNotebookId: string,
  showTrash: boolean
) {
  const currentNoteIds = selectedNotebookId
    ? (state.noteOrderByNotebook[selectedNotebookId] ?? [])
    : [];
  return currentNoteIds
    .map((id) => state.notes[id])
    .filter(
      (note): note is Note =>
        Boolean(note) &&
        note.parentNoteId === null &&
        Boolean(note.deletedAt) === showTrash
    );
}

export function getAllNotes(state: AppState, showTrash: boolean) {
  return Object.values(state.notes).filter(
    (note) => Boolean(note.deletedAt) === showTrash
  );
}

export function getFilteredNotes(params: {
  allNotes: Note[];
  noteTagFilter: string;
  rootNotes: Note[];
  search: string;
  selectedNotebookId: string;
}) {
  const { allNotes, noteTagFilter, rootNotes, search, selectedNotebookId } =
    params;
  const q = search.trim().toLowerCase();
  const matches = q
    ? allNotes.filter(
        (note) =>
          note.notebookId === selectedNotebookId &&
          (note.title.toLowerCase().includes(q) ||
            note.contentMarkdown.toLowerCase().includes(q))
      )
    : rootNotes;
  const normalizedTag = noteTagFilter.trim().toLowerCase();
  const tagged = normalizedTag
    ? matches.filter((note) =>
        note.tags?.some((tag) => tag.toLowerCase() === normalizedTag)
      )
    : matches;
  return [...tagged].sort(
    (left, right) =>
      Number(Boolean(right.pinned)) - Number(Boolean(left.pinned))
  );
}

export function createResearchLogExport(
  logs: ResearchLog[],
  format: 'csv' | 'json'
) {
  return format === 'json'
    ? JSON.stringify(logs, null, 2)
    : [
        'query,website,url,pageTitle,researchedAt,personalNote',
        ...logs.map((log) =>
          [
            log.query,
            log.website,
            log.url,
            log.pageTitle,
            log.researchedAt,
            log.personalNote,
          ]
            .map((field) => `"${field.replaceAll('"', '""')}"`)
            .join(',')
        ),
      ].join('\n');
}

export function downloadFile(
  value: string,
  options: { type: string; filename: string }
) {
  const blob = new Blob([value], { type: options.type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
