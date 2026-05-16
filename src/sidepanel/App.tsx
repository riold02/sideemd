import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { type MDXEditorMethods } from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { ChromeStorageRepository } from '../lib/storage';
import Tabline from './components/Tabline';
import HomeView from './components/HomeView';
import EditorView from './components/EditorView';
import { BLOCK_INSERT_OPTIONS, HOME_TAB, editorPlugins } from './editorConfig';
import { useSidepanelState } from './hooks/useSidepanelState';
import {
  createNoteSnippet,
  formatNoteDate,
  insertMarkdownAfterBlock,
  isEditableBlockElement,
  normalizeBlockText,
} from './utils/markdown';

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
    handleDeleteNote,
    handleExport,
    handleImport,
  } = useSidepanelState(repository);

  const [blockInsertTarget, setBlockInsertTarget] = useState<{
    top: number;
    signature: string;
  } | null>(null);
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);

  function handleEditorMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    const shell = editorShellRef.current;
    if (!shell) return;
    const targetElement =
      event.target instanceof Element
        ? event.target.closest('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,table,hr')
        : null;
    if (
      !targetElement ||
      !shell.contains(targetElement) ||
      !isEditableBlockElement(targetElement)
    ) {
      if (!isBlockMenuOpen) setBlockInsertTarget(null);
      return;
    }
    const signature = normalizeBlockText(
      targetElement.textContent ?? targetElement.tagName.toLowerCase()
    );
    if (!signature) return;
    const shellRect = shell.getBoundingClientRect();
    const blockRect = targetElement.getBoundingClientRect();
    setBlockInsertTarget({
      top: blockRect.top - shellRect.top + blockRect.height / 2,
      signature,
    });
  }

  function insertBlockBelowCurrentTarget(markdown: string) {
    if (!selectedNote || !blockInsertTarget) return;
    const nextMarkdown = insertMarkdownAfterBlock(
      selectedNote.contentMarkdown,
      blockInsertTarget.signature,
      markdown
    );
    updateNote(selectedNote.id, { contentMarkdown: nextMarkdown });
    editorRef.current?.setMarkdown(nextMarkdown);
    setIsBlockMenuOpen(false);
  }

  if (loading) return <div className="loading">Loading notes...</div>;

  return (
    <div className="app-shell" data-color-mode="light">
      <Tabline
        activeTab={activeTab}
        openNoteIds={openNoteIds}
        state={state}
        openNoteTab={openNoteTab}
        closeNoteTab={closeNoteTab}
        handleCreateNote={handleCreateNote}
        onHomeClick={() => setActiveTab(HOME_TAB)}
      />
      {activeTab === HOME_TAB ? (
        <HomeView
          filteredNotes={filteredNotes}
          activeNoteId={activeNoteId}
          openNoteTab={openNoteTab}
          handleCreateNote={handleCreateNote}
          handleDeleteNote={handleDeleteNote}
          handleExport={handleExport}
          handleImport={handleImport}
          selectedNotebookId={selectedNotebookId}
          isHomeMenuOpen={isHomeMenuOpen}
          setIsHomeMenuOpen={setIsHomeMenuOpen}
          search={search}
          setSearch={setSearch}
          formatNoteDate={formatNoteDate}
          createNoteSnippet={createNoteSnippet}
        />
      ) : (
        <EditorView
          selectedNote={selectedNote}
          updateNote={updateNote}
          editorRef={editorRef}
          editorShellRef={editorShellRef}
          handleEditorMouseMove={handleEditorMouseMove}
          isBlockMenuOpen={isBlockMenuOpen}
          setIsBlockMenuOpen={setIsBlockMenuOpen}
          blockInsertTarget={blockInsertTarget}
          insertBlockBelowCurrentTarget={insertBlockBelowCurrentTarget}
          blockInsertOptions={BLOCK_INSERT_OPTIONS}
          error={error}
          setError={setError}
          editorPlugins={editorPlugins}
        />
      )}
    </div>
  );
}
