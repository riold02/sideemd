import { normalizeNoteLinksInMarkdown } from './noteLinks';
import {
  ActivityEntry,
  AppState,
  ResearchLog,
  SCHEMA_VERSION,
  TrackingSettings,
} from './types';
import {
  DEFAULT_TRACKING_SETTINGS,
  MARKDOWN_SHOWCASE_MARKDOWN,
  MARKDOWN_SHOWCASE_TITLE,
  SEED_DATA_VERSION,
  WELCOME_MARKDOWN,
} from './state';

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

function isActivity(value: unknown): value is ActivityEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as ActivityEntry;
  return (
    typeof entry.id === 'string' &&
    [
      'note.created',
      'note.updated',
      'note.deleted',
      'note.restored',
      'research.created',
      'research.deleted',
      'research.cleared',
      'tracking.updated',
    ].includes(entry.action) &&
    ['note', 'research', 'tracking'].includes(entry.objectType) &&
    typeof entry.objectId === 'string' &&
    typeof entry.objectLabel === 'string' &&
    typeof entry.createdAt === 'string'
  );
}

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
  const legacyState = state as AppState & {
    tasks?: unknown;
    taskOrder?: unknown;
  };
  let next: AppState = {
    ...state,
    schemaVersion: state.schemaVersion ?? 1,
    notebooks: { ...state.notebooks },
    notes: { ...state.notes },
    noteOrderByNotebook: { ...state.noteOrderByNotebook },
    childOrderByNote: { ...(state.childOrderByNote ?? {}) },
    researchLogs: { ...(state.researchLogs ?? {}) },
    researchLogOrder: [...(state.researchLogOrder ?? [])],
    activityLog: [...(state.activityLog ?? [])],
    trackingSettings: normalizeTrackingSettings(state.trackingSettings),
  };
  if (legacyState.tasks || legacyState.taskOrder) {
    delete (next as typeof legacyState).tasks;
    delete (next as typeof legacyState).taskOrder;
    changed = true;
  }

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

  const normalizedResearchLogs = Object.fromEntries(
    Object.entries(next.researchLogs).filter(([, log]) => isResearchLog(log))
  );
  if (
    Object.keys(normalizedResearchLogs).length !==
    Object.keys(next.researchLogs).length
  ) {
    next.researchLogs = normalizedResearchLogs;
    changed = true;
  }
  const researchLogOrder = next.researchLogOrder.filter((id) =>
    Boolean(next.researchLogs[id])
  );
  for (const id of Object.keys(next.researchLogs)) {
    if (!researchLogOrder.includes(id)) researchLogOrder.push(id);
  }
  if (researchLogOrder.join('|') !== next.researchLogOrder.join('|')) {
    next.researchLogOrder = researchLogOrder;
    changed = true;
  }

  const activityLog = next.activityLog.filter(isActivity).slice(0, 200);
  if (activityLog.length !== next.activityLog.length) {
    next.activityLog = activityLog;
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

    const normalizedLinks = normalizeNoteLinksInMarkdown(note.contentMarkdown);
    if (normalizedLinks !== note.contentMarkdown) {
      next.notes[noteId] = {
        ...next.notes[noteId],
        contentMarkdown: normalizedLinks,
      };
      changed = true;
    }
  }

  if ((state.seedDataVersion ?? 0) < SEED_DATA_VERSION) {
    for (const [noteId, note] of Object.entries(next.notes)) {
      const hasUserState =
        note.pinned ||
        note.favorite ||
        note.deletedAt ||
        Boolean(note.tags?.length) ||
        Boolean(next.childOrderByNote[noteId]?.length);
      if (
        note.title !== MARKDOWN_SHOWCASE_TITLE ||
        note.contentMarkdown !== MARKDOWN_SHOWCASE_MARKDOWN ||
        hasUserState
      ) {
        continue;
      }

      delete next.notes[noteId];
      for (const [notebookId, noteIds] of Object.entries(
        next.noteOrderByNotebook
      )) {
        next.noteOrderByNotebook[notebookId] = noteIds.filter(
          (id) => id !== noteId
        );
      }
      delete next.childOrderByNote[noteId];
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
