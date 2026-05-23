import { useMemo, useRef } from 'react';
import { type MDXEditorMethods } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { ChromeStorageRepository } from '../lib/storage';
import Tabline from './components/Tabline';
import HomeView from './components/HomeView';
import EditorView from './components/EditorView';
import DashboardView from './components/DashboardView';
import ResearchView from './components/ResearchView';
import ActivityView from './components/ActivityView';
import TrackingSettingsView from './components/TrackingSettingsView';
import {
  ACTIVITY_TAB,
  DASHBOARD_TAB,
  HOME_TAB,
  RESEARCH_TAB,
  SETTINGS_TAB,
} from './editorConfig';
import { useEditorBlockInsert } from './hooks/useEditorBlockInsert';
import { useEditorViewProps } from './hooks/useEditorViewProps';
import { useSelectionFormatToolbar } from './hooks/useSelectionFormatToolbar';
import { useSidepanelState } from './hooks/useSidepanelState';
import { useMarkdownPaste } from './hooks/useMarkdownPaste';
import { useWikilinkEditor } from './hooks/useWikilinkEditor';
import { createNoteSnippet, formatNoteDate } from './utils/markdown';

const repository = new ChromeStorageRepository();

export default function App() {
  const editorRef = useRef<MDXEditorMethods>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const {
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

  useMarkdownPaste({
    noteId: selectedNote?.id,
    editorShellRef,
    editorRef,
    selectedNote,
    updateNote,
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
      onViewClick: setActiveTab,
      onCloseSidebar: () => window.close(),
    }),
    [openNoteTab, closeNoteTab, handleCreateNote, setActiveTab]
  );

  const homeViewState = useMemo(
    () => ({
      filteredNotes,
      activeNoteId,
      selectedNotebookId,
      notebooks: state.notebookOrder
        .map((id) => state.notebooks[id])
        .filter(Boolean)
        .map((notebook) => ({
          id: notebook.id,
          name: notebook.name,
          noteCount: Object.values(state.notes).filter(
            (note) => note.notebookId === notebook.id && !note.deletedAt
          ).length,
        })),
      notesById: state.notes,
      rootNoteIds: state.noteOrderByNotebook[selectedNotebookId] ?? [],
      childOrderByNote: state.childOrderByNote,
      isHomeMenuOpen,
      search,
      noteTagFilter,
      tags: [
        ...new Set(
          Object.values(state.notes).flatMap((note) => note.tags ?? [])
        ),
      ].sort(),
      showTrash,
    }),
    [
      filteredNotes,
      activeNoteId,
      selectedNotebookId,
      state.notebookOrder,
      state.notebooks,
      state.noteOrderByNotebook,
      state.childOrderByNote,
      isHomeMenuOpen,
      search,
      noteTagFilter,
      showTrash,
      state.notes,
    ]
  );

  const homeViewActions = useMemo(
    () => ({
      openNoteTab,
      handleCreateNote,
      handleRenameNote,
      handleMoveNote,
      handleCreateSubpage: (parentNoteId, title) =>
        handleCreateSubnote(parentNoteId, title, { openTab: false }),
      handleCreateNotebook,
      handleRenameNotebook,
      handleDeleteNotebook,
      handleMoveNotebook,
      handleDeleteNote,
      handleRestoreNote,
      updateNoteMetadata,
      handleExport,
      handleImport,
      toggleHomeMenu: () => setIsHomeMenuOpen((value) => !value),
      setSelectedNotebookId,
      setSearch,
      setNoteTagFilter,
      setShowTrash,
    }),
    [
      openNoteTab,
      handleCreateNote,
      handleRenameNote,
      handleMoveNote,
      handleCreateNotebook,
      handleRenameNotebook,
      handleDeleteNotebook,
      handleMoveNotebook,
      handleDeleteNote,
      handleRestoreNote,
      updateNoteMetadata,
      handleExport,
      handleImport,
      setIsHomeMenuOpen,
      setSelectedNotebookId,
      setSearch,
      setNoteTagFilter,
      setShowTrash,
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
      {activeTab === DASHBOARD_TAB ? (
        <DashboardView state={state} onOpenView={setActiveTab} />
      ) : activeTab === HOME_TAB ? (
        <HomeView
          state={homeViewState}
          actions={homeViewActions}
          formatters={homeViewFormatters}
        />
      ) : activeTab === RESEARCH_TAB ? (
        <ResearchView
          logs={state.researchLogOrder
            .map((id) => state.researchLogs[id])
            .filter(Boolean)}
          onCreateLog={handleCreateResearchLog}
          onDeleteLog={handleDeleteResearchLog}
          onClearLogs={handleClearResearchLogs}
          onExport={exportResearchLogs}
        />
      ) : activeTab === ACTIVITY_TAB ? (
        <ActivityView entries={state.activityLog} />
      ) : activeTab === SETTINGS_TAB ? (
        <TrackingSettingsView
          settings={state.trackingSettings}
          onUpdate={handleUpdateTrackingSettings}
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
