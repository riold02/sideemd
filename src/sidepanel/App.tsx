import { useMemo, useRef } from 'react';
import { type MDXEditorMethods } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { ChromeStorageRepository } from '../lib/storage';
import Tabline from './components/Tabline';
import HomeView from './components/HomeView';
import EditorView from './components/EditorView';
import { BLOCK_INSERT_OPTIONS, HOME_TAB, editorPlugins } from './editorConfig';
import { useEditorBlockInsert } from './hooks/useEditorBlockInsert';
import { useSidepanelState } from './hooks/useSidepanelState';
import { createNoteSnippet, formatNoteDate } from './utils/markdown';

const repository = new ChromeStorageRepository();

export default function App() {
  // Keep state local to sidepanel composition; promote to Context only if contracts
  // must cross multiple intermediary layers with several independent consumers.
  const editorRef = useRef<MDXEditorMethods>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const {
    state,
    selectedNotebookId,
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
  } = useSidepanelState(repository);

  const {
    isBlockMenuOpen,
    setIsBlockMenuOpen,
    blockInsertTarget,
    handleEditorMouseMove,
    insertBlockBelowCurrentTarget,
  } = useEditorBlockInsert({
    editorShellRef,
    editorRef,
    selectedNote,
    updateNote,
  });

  const tablineState = useMemo(
    () => ({
      activeTab,
      openNoteIds,
      notesById: state.notes,
    }),
    [activeTab, openNoteIds, state.notes]
  );

  const tablineActions = useMemo(
    () => ({
      openNoteTab,
      closeNoteTab,
      handleCreateNote,
      onHomeClick: () => setActiveTab(HOME_TAB),
      onCloseSidebar: () => window.close(),
    }),
    [openNoteTab, closeNoteTab, handleCreateNote, setActiveTab]
  );

  const homeViewState = useMemo(
    () => ({
      filteredNotes,
      activeNoteId,
      selectedNotebookId,
      isHomeMenuOpen,
      search,
    }),
    [filteredNotes, activeNoteId, selectedNotebookId, isHomeMenuOpen, search]
  );

  const homeViewActions = useMemo(
    () => ({
      openNoteTab,
      handleCreateNote,
      handleDeleteNote,
      handleExport,
      handleImport,
      toggleHomeMenu: () => setIsHomeMenuOpen((value) => !value),
      setSearch,
    }),
    [
      openNoteTab,
      handleCreateNote,
      handleDeleteNote,
      handleExport,
      handleImport,
      setIsHomeMenuOpen,
      setSearch,
    ]
  );

  const homeViewFormatters = useMemo(
    () => ({ formatNoteDate, createNoteSnippet }),
    []
  );

  const editorViewState = useMemo(
    () => ({
      selectedNote,
      isBlockMenuOpen,
      blockInsertTarget,
      error,
    }),
    [selectedNote, isBlockMenuOpen, blockInsertTarget, error]
  );

  const editorViewActions = useMemo(
    () => ({
      updateNote,
      handleEditorMouseMove,
      setIsBlockMenuOpen,
      insertBlockBelowCurrentTarget,
      setError,
    }),
    [
      updateNote,
      handleEditorMouseMove,
      setIsBlockMenuOpen,
      insertBlockBelowCurrentTarget,
      setError,
    ]
  );

  const editorViewConfig = useMemo(
    () => ({
      editorRef,
      editorShellRef,
      blockInsertOptions: BLOCK_INSERT_OPTIONS,
      editorPlugins,
    }),
    [editorRef, editorShellRef]
  );

  if (loading) return <div className="loading">Loading notes...</div>;

  return (
    <div className="app-shell" data-color-mode="light">
      <Tabline state={tablineState} actions={tablineActions} />
      {activeTab === HOME_TAB ? (
        <HomeView
          state={homeViewState}
          actions={homeViewActions}
          formatters={homeViewFormatters}
        />
      ) : (
        <EditorView
          state={editorViewState}
          actions={editorViewActions}
          config={editorViewConfig}
        />
      )}
    </div>
  );
}
