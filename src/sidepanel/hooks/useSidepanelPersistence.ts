import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type { StorageRepository } from '../../lib/storage';
import { STORAGE_KEY, type AppState } from '../../lib/types';
import { HOME_TAB } from '../editorConfig';
import { WORKSPACE_TABS } from './sidepanelStateUtils';

interface Params {
  repository: StorageRepository;
  state: AppState;
  loading: boolean;
  saveTimer: MutableRefObject<number | null>;
  skipNextSave: MutableRefObject<boolean>;
  setState: (state: AppState) => void;
  setSelectedNotebookId: Dispatch<SetStateAction<string>>;
  setOpenNoteIds: Dispatch<SetStateAction<string[]>>;
  setActiveNoteId: Dispatch<SetStateAction<string>>;
  setActiveTab: Dispatch<SetStateAction<string>>;
  setLoading: (value: boolean) => void;
  setError: (value: string) => void;
}

export function useSidepanelPersistence({
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
}: Params) {
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
  }, [
    repository,
    setActiveTab,
    setError,
    setLoading,
    setSelectedNotebookId,
    setState,
  ]);

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
  }, [
    repository,
    setActiveNoteId,
    setActiveTab,
    setOpenNoteIds,
    setSelectedNotebookId,
    setState,
    skipNextSave,
  ]);

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
  }, [state, loading, repository, saveTimer, skipNextSave]);
}
