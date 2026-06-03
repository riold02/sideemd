import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  appendActivity,
  createActivityEntry,
  createDefaultState,
} from '../../lib/state';
import type { StorageRepository } from '../../lib/storage';
import {
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
import { HOME_TAB } from '../editorConfig';
import {
  createResearchLogExport,
  downloadFile,
  getAllNotes,
  getFilteredNotes,
  getRootNotes,
  getSelectedNote,
  isDiscardableDraft,
  withUpdatedNote,
  WORKSPACE_TABS,
} from './sidepanelStateUtils';
import { useSidepanelPersistence } from './useSidepanelPersistence';

export function useSidepanelState(repository: StorageRepository) {
  const [state, setState] = useState<AppState>(createDefaultState());
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>(HOME_TAB);
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
  useSidepanelPersistence({
    repository,
    state,
    loading,
    saveTimer,
    skipNextSave,
    setState,
    setSelectedNotebookId,
    setOpenNoteIds,
    setActiveNoteId,
    setActiveTab,
    setLoading,
    setError,
  });

  const selectedNote = getSelectedNote(state, activeTab);
  const rootNotes = getRootNotes(state, selectedNotebookId, showTrash);
  const allNotes = getAllNotes(state, showTrash);

  const filteredNotes = useMemo(() => {
    return getFilteredNotes({
      allNotes,
      noteTagFilter,
      rootNotes,
      search,
      selectedNotebookId,
    });
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

  async function handleCreateNote(title = 'Untitled Note') {
    const notebookId = selectedNotebookId || state.notebookOrder[0];
    if (!notebookId) return;
    const note = await repository.createNote(notebookId, title);
    patchState(await repository.getState());
    setOpenNoteIds((ids) => (ids.includes(note.id) ? ids : [...ids, note.id]));
    setActiveNoteId(note.id);
    setActiveTab(note.id);
  }

  async function handleRenameNote(noteId: string, title: string) {
    await repository.updateNote(noteId, { title });
    await refreshState();
  }

  async function handleMoveNote(
    noteId: string,
    destination: {
      notebookId: string;
      parentNoteId: string | null;
      index: number;
    }
  ) {
    await repository.moveNote(noteId, destination);
    await refreshState();
  }

  async function handleCreateNotebook(name = 'Untitled Notebook') {
    const notebook = await repository.createNotebook(name);
    const next = await repository.getState();
    patchState(next);
    setSelectedNotebookId(notebook.id);
    setActiveTab(HOME_TAB);
  }

  async function handleRenameNotebook(name: string) {
    const notebook = state.notebooks[selectedNotebookId];
    if (!notebook) return;
    await repository.renameNotebook(notebook.id, name);
    await refreshState();
  }

  async function handleDeleteNotebook() {
    const notebook = state.notebooks[selectedNotebookId];
    if (!notebook) return;
    const message =
      state.notebookOrder.length > 1
        ? `Delete notebook "${notebook.name}" and move its notes into another notebook?`
        : `Delete notebook "${notebook.name}"? A fresh default notebook will be created.`;
    if (!window.confirm(message)) return;
    await repository.deleteNotebook(notebook.id);
    const next = await repository.getState();
    patchState(next);
    setSelectedNotebookId(
      next.notebooks[selectedNotebookId] ? selectedNotebookId : (next.notebookOrder[0] ?? '')
    );
    syncOpenTabs(next);
    setActiveTab(HOME_TAB);
  }

  async function handleMoveNotebook(id: string, index: number) {
    await repository.moveNotebook(id, index);
    await refreshState();
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
        ? `Delete this note and ${descendantCount} subpage(s)?`
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
    if (!window.confirm('Delete all session tracking entries?')) return;
    await repository.clearResearchLogs();
    await refreshState();
  }

  function exportResearchLogs(format: 'csv' | 'json') {
    const logs = state.researchLogOrder
      .map((id) => state.researchLogs[id])
      .filter(Boolean);
    downloadFile(createResearchLogExport(logs, format), {
      type: format === 'json' ? 'application/json' : 'text/csv',
      filename: `sideemd-session-tracking-${new Date().toISOString().slice(0, 10)}.${format}`,
    });
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
          'Session tracking'
        )
      )
    );
  }

  async function handleExport() {
    const payload = serializeState(state);
    downloadFile(JSON.stringify(payload, null, 2), {
      type: 'application/json',
      filename: `sideemd-export-${new Date().toISOString().slice(0, 10)}.json`,
    });
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
    handleRenameNote,
    handleMoveNote,
    handleCreateNotebook,
    handleRenameNotebook,
    handleDeleteNotebook,
    handleMoveNotebook,
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
