import { Plus } from 'lucide-react';
import { MDXEditor } from '@mdxeditor/editor';
import NoteBreadcrumb from './NoteBreadcrumb';
import QuickInsertMenu from './QuickInsertMenu';
import SelectionFormatToolbar from './SelectionFormatToolbar';
import WikilinkMenu from './WikilinkMenu';
import { prepareMarkdownForEditor } from '../utils/markdown';
import type {
  EditorViewActions,
  EditorViewConfig,
  EditorViewState,
} from '../types';

interface Props {
  state: EditorViewState;
  actions: EditorViewActions;
  config: EditorViewConfig;
}

export default function EditorView({ state, actions, config }: Props) {
  const {
    selectedNote,
    notebookName,
    noteAncestors,
    isBlockMenuOpen,
    blockInsertTarget,
    selectionToolbar,
    wikilinkMenu,
    error,
  } = state;
  const {
    updateNote,
    handleEditorMouseMove,
    setIsBlockMenuOpen,
    insertBlockBelowCurrentTarget,
    applyQuickFormatFromMenu,
    applySelectionFormat,
    applySelectionTextColor,
    applySelectionBackgroundColor,
    applyTextColorFromMenu,
    applyBackgroundColorFromMenu,
    selectionToolbarRef,
    onHomeClick,
    createSubnoteAtCurrentBlock,
    onSelectWikilink,
    openNoteTab,
    setError,
  } = actions;
  const {
    editorRef,
    editorShellRef,
    blockInsertOptions,
    formatOptions,
    editorPlugins,
  } = config;

  function updateTitleFromMarkdown(markdown: string) {
    if (!selectedNote) return;
    const firstHeading = markdown
      .split('\n')
      .find((line) => /^#\s+/.test(line))
      ?.replace(/^#\s+/, '')
      .trim();
    const nextTitle = firstHeading || 'Untitled Note';
    if (nextTitle !== selectedNote.title) {
      updateNote(selectedNote.id, { title: nextTitle });
    }
  }

  return (
    <main className="editor-area">
      {selectedNote ? (
        <>
          <NoteBreadcrumb
            notebookName={notebookName}
            ancestors={noteAncestors}
            currentTitle={selectedNote.title}
            onHomeClick={onHomeClick}
            onOpenNote={openNoteTab}
          />

          <div
            className="visual-editor-shell"
            ref={editorShellRef}
            onMouseMove={handleEditorMouseMove}
            onMouseLeave={() => {
              if (!isBlockMenuOpen) setIsBlockMenuOpen(false);
            }}
          >
            {selectionToolbar ? (
              <SelectionFormatToolbar
                top={selectionToolbar.top}
                left={selectionToolbar.left}
                options={formatOptions}
                onApplyFormat={applySelectionFormat}
                onTextColor={applySelectionTextColor}
                onBackgroundColor={applySelectionBackgroundColor}
                toolbarRef={selectionToolbarRef}
              />
            ) : null}

            {wikilinkMenu ? (
              <WikilinkMenu
                top={wikilinkMenu.top}
                left={wikilinkMenu.left}
                options={wikilinkMenu.options}
                onSelect={onSelectWikilink}
              />
            ) : null}

            {blockInsertTarget ? (
              <div
                className="block-insert-control"
                style={{ top: blockInsertTarget.top }}
              >
                <button
                  className="block-insert-button"
                  onClick={() => setIsBlockMenuOpen((s) => !s)}
                  aria-label="Insert block below"
                  type="button"
                >
                  <Plus size={16} strokeWidth={2.3} />
                </button>
                {isBlockMenuOpen ? (
                  <QuickInsertMenu
                    blockOptions={blockInsertOptions}
                    formatOptions={formatOptions}
                    onInsertBlock={insertBlockBelowCurrentTarget}
                    onApplyFormat={applyQuickFormatFromMenu}
                    onTextColor={applyTextColorFromMenu}
                    onBackgroundColor={applyBackgroundColorFromMenu}
                    onCreateSubnote={() => void createSubnoteAtCurrentBlock()}
                  />
                ) : null}
              </div>
            ) : null}

            <MDXEditor
              ref={editorRef}
              key={selectedNote.id}
              markdown={prepareMarkdownForEditor(selectedNote.contentMarkdown)}
              onChange={(markdown) => {
                updateNote(selectedNote.id, { contentMarkdown: markdown });
                updateTitleFromMarkdown(markdown);
              }}
              onError={({ error: editorError }) => setError(editorError)}
              placeholder="Write your note..."
              plugins={editorPlugins}
              className="visual-editor"
              contentEditableClassName="visual-editor-content"
            />
          </div>
        </>
      ) : (
        <div className="empty">Create or select a note to start writing.</div>
      )}

      {error ? <div className="error">{error}</div> : null}
    </main>
  );
}
