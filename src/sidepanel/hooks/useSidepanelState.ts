import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  appendActivity,
  createActivityEntry,
  createDefaultState,
} from '../../lib/state';
import type { StorageRepository } from '../../lib/storage';
import {
  STORAGE_KEY,
  type AppState,
  type Note,
  type ResearchLog,
  type TrackingSettings,
} from '../../lib/types';
import {
  mergeImportedState,
  parseImport,
  replaceImportedState,
  serializeState,
} from '../../lib/importExport';
import { collectDescendantIds, getNoteAncestors } from '../../lib/noteTree';
import {
  ACTIVITY_TAB,
  DASHBOARD_TAB,
  HOME_TAB,
  RESEARCH_TAB,
  SETTINGS_TAB,
} from '../editorConfig';

const WORKSPACE_TABS = new Set([
  HOME_TAB,
  DASHBOARD_TAB,
  RESEARCH_TAB,
  ACTIVITY_TAB,
  SETTINGS_TAB,
]);

function withUpdatedNote(
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

function isDiscardableDraft(state: AppState, noteId: string) {
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

export function useSidepanelState(repository: StorageRepository) {
  const [state, setState] = useState<AppState>(createDefaultState());
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>(DASHBOARD_TAB);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [noteTagFilter, setNoteTagFilter] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const skipNextSave = useRef(false);

  useEffect(() => {
    async function loadState() {
      try {
        const loaded = await repository.getState();
        setState(loaded);
        setSelectedNotebookId(loaded.notebookOrder[0] ?? '');
        setActiveTab(DASHBOARD_TAB);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    }
    void loadState();
  }, [repository]);

  useEffect(() => {
    const onChanged = chrome.storage.onChanged;
    if (!onChanged) return;

    function syncStoredState(
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) {
      if (areaName !== 'local' || !changes[STORAGE_KEY]) return;
      const next = changes[STORAGE_KEY].newValue as AppState | undefined;
      if (!next) return;

      skipNextSave.current = true;
      setState(next);
      setSelectedNotebookId((notebookId) =>
        next.notebooks[notebookId] ? notebookId : (next.notebookOrder[0] ?? '')
      );
      setOpenNoteIds((ids) => ids.filter((id) => Boolean(next.notes[id])));
      setActiveNoteId((noteId) => (next.notes[noteId] ? noteId : ''));
      setActiveTab((tab) =>
        WORKSPACE_TABS.has(tab) ||
        (next.notes[tab] && !next.notes[tab].deletedAt)
          ? tab
          : HOME_TAB
      );
    }

    onChanged.addListener(syncStoredState);
    return () => onChanged.removeListener(syncStoredState);
  }, [repository]);

  useEffect(() => {
    if (loading) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveTimer.current = window.setTimeout(
      () => void repository.saveState(state),
      350
    );
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [state, loading, repository]);

  const selectedNote =
    activeTab === HOME_TAB ||
    activeTab === DASHBOARD_TAB ||
    !state.notes[activeTab]
      ? null
      : state.notes[activeTab];
  const currentNoteIds = selectedNotebookId
    ? (state.noteOrderByNotebook[selectedNotebookId] ?? [])
    : [];
  const rootNotes = currentNoteIds
    .map((id) => state.notes[id])
    .filter(
      (note): note is Note =>
        Boolean(note) &&
        note.parentNoteId === null &&
        Boolean(note.deletedAt) === showTrash
    );
  const allNotes = Object.values(state.notes).filter(
    (note) => Boolean(note.deletedAt) === showTrash
  );

  const filteredNotes = useMemo(() => {
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
  }, [allNotes, noteTagFilter, rootNotes, search, selectedNotebookId]);

  const selectedNoteAncestors = useMemo(() => {
    if (!selectedNote) return [];
    return getNoteAncestors(state, selectedNote.id);
  }, [selectedNote, state]);

  function patchState(next: AppState) {
    setState(next);
  }

  function openNoteTab(noteId: string) {
    const note = state.notes[noteId];
    if (!note || note.deletedAt) return;
    setOpenNoteIds((ids) => (ids.includes(noteId) ? ids : [...ids, noteId]));
    setSelectedNotebookId(note.notebookId);
    setActiveNoteId(noteId);
    setActiveTab(noteId);
  }

  async function closeNoteTab(noteId: string) {
    if (isDiscardableDraft(state, noteId)) {
      await repository.discardNote(noteId);
      await refreshState();
    }
    setOpenNoteIds((ids) => ids.filter((id) => id !== noteId));
    if (activeNoteId === noteId) setActiveNoteId('');
    if (activeTab === noteId) setActiveTab(HOME_TAB);
  }

  function syncOpenTabs(next: AppState) {
    setOpenNoteIds((ids) => ids.filter((id) => Boolean(next.notes[id])));
    if (
      !WORKSPACE_TABS.has(activeTab) &&
      (!next.notes[activeTab] || next.notes[activeTab].deletedAt)
    )
      setActiveTab(HOME_TAB);
    if (activeNoteId && !next.notes[activeNoteId]) setActiveNoteId('');
  }

  function updateNote(
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'contentMarkdown'>>
  ) {
    setState((prev) => withUpdatedNote(prev, noteId, updates));
  }

  async function handleCreateNote() {
    const notebookId = selectedNotebookId || state.notebookOrder[0];
    if (!notebookId) return;
    const note = await repository.createNote(notebookId, 'Untitled Note');
    patchState(await repository.getState());
    setOpenNoteIds((ids) => (ids.includes(note.id) ? ids : [...ids, note.id]));
    setActiveNoteId(note.id);
    setActiveTab(note.id);
  }

  async function handleCreateSubnote(
    parentNoteId: string,
    title = 'Untitled Note',
    options: { openTab?: boolean } = {}
  ) {
    const note = await repository.createSubnote(parentNoteId, title);
    patchState(await repository.getState());
    setOpenNoteIds((ids) => (ids.includes(note.id) ? ids : [...ids, note.id]));
    if (options.openTab) {
      setActiveNoteId(note.id);
      setActiveTab(note.id);
    }
    return note;
  }

  async function handleDeleteNote(noteId: string) {
    if (isDiscardableDraft(state, noteId)) {
      await repository.discardNote(noteId);
      const next = await repository.getState();
      patchState(next);
      syncOpenTabs(next);
      return;
    }

    const descendantCount = collectDescendantIds(state, noteId).length;
    const message =
      descendantCount > 0
        ? `Delete this note and ${descendantCount} subnote(s)?`
        : 'Delete this note?';
    if (!window.confirm(message)) return;
    await repository.deleteNote(noteId);
    const next = await repository.getState();
    patchState(next);
    syncOpenTabs(next);
  }

  async function refreshState() {
    const next = await repository.getState();
    patchState(next);
    syncOpenTabs(next);
    return next;
  }

  async function handleRestoreNote(noteId: string) {
    await repository.restoreNote(noteId);
    await refreshState();
  }

  async function updateNoteMetadata(
    noteId: string,
    updates: Partial<Pick<Note, 'tags' | 'pinned' | 'favorite'>>
  ) {
    await repository.updateNote(noteId, updates);
    await refreshState();
  }

  async function handleCreateResearchLog(
    input: Omit<ResearchLog, 'id' | 'researchedAt'>
  ) {
    const log = await repository.createResearchLog(input);
    await refreshState();
    return log;
  }

  async function handleDeleteResearchLog(logId: string) {
    await repository.deleteResearchLog(logId);
    await refreshState();
  }

  async function handleClearResearchLogs() {
    if (!window.confirm('Delete all research logs?')) return;
    await repository.clearResearchLogs();
    await refreshState();
  }

  function exportResearchLogs(format: 'csv' | 'json') {
    const logs = state.researchLogOrder
      .map((id) => state.researchLogs[id])
      .filter(Boolean);
    const value =
      format === 'json'
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
    const blob = new Blob([value], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sideemd-research-${new Date().toISOString().slice(0, 10)}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpdateTrackingSettings(
    updates: Partial<TrackingSettings>
  ) {
    setState((previous) =>
      appendActivity(
        {
          ...previous,
          trackingSettings: {
            ...previous.trackingSettings,
            ...updates,
          },
        },
        createActivityEntry(
          'tracking.updated',
          'tracking',
          'settings',
          'Research tracking'
        )
      )
    );
  }

  async function handleExport() {
    const payload = serializeState(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sideemd-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = parseImport(text);
      const mode = window.confirm('Import mode: OK = Merge, Cancel = Replace')
        ? 'merge'
        : 'replace';
      const next =
        mode === 'merge'
          ? mergeImportedState(state, payload)
          : replaceImportedState(payload);
      patchState(next);
      await repository.saveState(next);
      setSelectedNotebookId(next.notebookOrder[0] ?? '');
      syncOpenTabs(next);
      setActiveTab(HOME_TAB);
      setIsHomeMenuOpen(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      (event.target as HTMLInputElement).value = '';
    }
  }

  return {
    state,
    selectedNotebookId,
    setSelectedNotebookId,
    activeTab,
    setActiveTab,
    openNoteIds,
    activeNoteId,
    search,
    setSearch,
    noteTagFilter,
    setNoteTagFilter,
    showTrash,
    setShowTrash,
    loading,
    error,
    setError,
    isHomeMenuOpen,
    setIsHomeMenuOpen,
    selectedNote,
    selectedNoteAncestors,
    filteredNotes,
    openNoteTab,
    closeNoteTab,
    updateNote,
    handleCreateNote,
    handleCreateSubnote,
    handleDeleteNote,
    handleRestoreNote,
    updateNoteMetadata,
    handleCreateResearchLog,
    handleDeleteResearchLog,
    handleClearResearchLogs,
    exportResearchLogs,
    handleUpdateTrackingSettings,
    handleExport,
    handleImport,
  };
}
