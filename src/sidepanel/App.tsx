import { useMemo, useRef } from 'react';
import { type MDXEditorMethods } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { ChromeStorageRepository } from '../lib/storage';
import Tabline from './components/Tabline';
import HomeView from './components/HomeView';
import EditorView from './components/EditorView';
import { HOME_TAB } from './editorConfig';
import { useEditorBlockInsert } from './hooks/useEditorBlockInsert';
import { useEditorViewProps } from './hooks/useEditorViewProps';
import { useSelectionFormatToolbar } from './hooks/useSelectionFormatToolbar';
import { useSidepanelState } from './hooks/useSidepanelState';
import { useWikilinkEditor } from './hooks/useWikilinkEditor';
import { createNoteSnippet, formatNoteDate } from './utils/markdown';

const repository = new ChromeStorageRepository();

export default function App() {
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
    handleCreateSubnote,
    handleDeleteNote,
    handleExport,
    handleImport,
    selectedNoteAncestors,
  } = useSidepanelState(repository);

  const {
    isBlockMenuOpen,
    setIsBlockMenuOpen,
    blockInsertTarget,
    setBlockInsertTarget,
    handleEditorMouseMove,
    insertBlockBelowCurrentTarget,
    applyQuickFormatFromMenu,
    applyTextColorFromMenu,
    applyBackgroundColorFromMenu,
    createSubnoteAtCurrentBlock,
  } = useEditorBlockInsert({
    editorShellRef,
    editorRef,
    selectedNote,
    updateNote,
    createSubnote: (title) =>
      selectedNote
        ? handleCreateSubnote(selectedNote.id, title)
        : Promise.resolve(null),
  });

  const {
    selectionToolbar,
    applySelectionFormat,
    applySelectionTextColor,
    applySelectionBackgroundColor,
    selectionToolbarRef,
  } = useSelectionFormatToolbar({
    noteId: selectedNote?.id,
    editorShellRef,
    editorRef,
  });

  const { wikilinkMenu, handleSelectWikilink, openWikilinkMenu } =
    useWikilinkEditor({
      noteId: selectedNote?.id,
      editorShellRef,
      editorRef,
      state,
      openNoteTab,
      createSubnote: (title) =>
        selectedNote
          ? handleCreateSubnote(selectedNote.id, title)
          : Promise.resolve(null),
    });

  const editorView = useEditorViewProps({
    selectedNote,
    selectedNoteAncestors,
    isBlockMenuOpen,
    blockInsertTarget,
    selectionToolbar,
    wikilinkMenu,
    error,
    editorRef,
    editorShellRef,
    setActiveTab,
    updateNote,
    handleEditorMouseMove,
    setIsBlockMenuOpen,
    setBlockInsertTarget,
    insertBlockBelowCurrentTarget,
    createSubnoteAtCurrentBlock,
    applyQuickFormatFromMenu,
    applySelectionFormat,
    applySelectionTextColor,
    applySelectionBackgroundColor,
    applyTextColorFromMenu,
    applyBackgroundColorFromMenu,
    selectionToolbarRef,
    handleSelectWikilink,
    openWikilinkMenu,
    openNoteTab,
    setError,
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
          state={editorView.state}
          actions={editorView.actions}
          config={editorView.config}
        />
      )}
    </div>
  );
}
