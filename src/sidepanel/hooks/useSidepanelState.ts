import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { createDefaultState } from '../../lib/state';
import type { StorageRepository } from '../../lib/storage';
import type { AppState, Note } from '../../lib/types';
import {
  mergeImportedState,
  parseImport,
  replaceImportedState,
  serializeState,
} from '../../lib/importExport';
import { HOME_TAB } from '../editorConfig';

function withUpdatedNote(
  state: AppState,
  noteId: string,
  updates: Partial<Pick<Note, 'title' | 'contentMarkdown'>>
): AppState {
  const existing = state.notes[noteId];
  if (!existing) return state;
  return {
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
}

export function useSidepanelState(repository: StorageRepository) {
  const [state, setState] = useState<AppState>(createDefaultState());
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>(HOME_TAB);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    async function loadState() {
      try {
        const loaded = await repository.getState();
        setState(loaded);
        setSelectedNotebookId(loaded.notebookOrder[0] ?? '');
        setActiveTab(HOME_TAB);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    }
    void loadState();
  }, [repository]);

  useEffect(() => {
    if (loading) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(
      () => void repository.saveState(state),
      350
    );
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [state, loading, repository]);

  const selectedNote =
    activeTab === HOME_TAB ? null : (state.notes[activeTab] ?? null);
  const currentNoteIds = selectedNotebookId
    ? (state.noteOrderByNotebook[selectedNotebookId] ?? [])
    : [];
  const currentNotes = currentNoteIds
    .map((id) => state.notes[id])
    .filter(Boolean) as Note[];
  const allNotes = Object.values(state.notes);

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return currentNotes;
    const q = search.toLowerCase();
    return allNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.contentMarkdown.toLowerCase().includes(q)
    );
  }, [currentNotes, allNotes, search]);

  function patchState(next: AppState) {
    setState(next);
  }

  function openNoteTab(noteId: string) {
    const note = state.notes[noteId];
    if (!note) return;
    setOpenNoteIds((ids) => (ids.includes(noteId) ? ids : [...ids, noteId]));
    setSelectedNotebookId(note.notebookId);
    setActiveNoteId(noteId);
    setActiveTab(noteId);
  }

  function closeNoteTab(noteId: string) {
    setOpenNoteIds((ids) => ids.filter((id) => id !== noteId));
    if (activeNoteId === noteId) setActiveNoteId('');
    if (activeTab === noteId) setActiveTab(HOME_TAB);
  }

  function syncOpenTabs(next: AppState) {
    setOpenNoteIds((ids) => ids.filter((id) => Boolean(next.notes[id])));
    if (activeTab !== HOME_TAB && !next.notes[activeTab])
      setActiveTab(HOME_TAB);
    if (activeNoteId && !next.notes[activeNoteId]) setActiveNoteId('');
  }

  function updateNote(
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'contentMarkdown'>>
  ) {
    patchState(withUpdatedNote(state, noteId, updates));
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

  async function handleDeleteNote(noteId: string) {
    if (!window.confirm('Delete note?')) return;
    await repository.deleteNote(noteId);
    const next = await repository.getState();
    patchState(next);
    syncOpenTabs(next);
  }

  async function handleExport() {
    const payload = serializeState(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mdside-export-${new Date().toISOString().slice(0, 10)}.json`;
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
    loading,
    error,
    setError,
    isHomeMenuOpen,
    setIsHomeMenuOpen,
    selectedNote,
    filteredNotes,
    openNoteTab,
    closeNoteTab,
    updateNote,
    handleCreateNote,
    handleDeleteNote,
    handleExport,
    handleImport,
  };
}
