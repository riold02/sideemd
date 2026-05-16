import { Plus } from 'lucide-react';
import { MDXEditor } from '@mdxeditor/editor';
import QuickInsertMenu from './QuickInsertMenu';
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
  const { selectedNote, isBlockMenuOpen, blockInsertTarget, error } = state;
  const {
    updateNote,
    handleEditorMouseMove,
    handleEditorKeyDown,
    setIsBlockMenuOpen,
    insertBlockBelowCurrentTarget,
    applyQuickFormatFromMenu,
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
          <div className="editor-breadcrumb" aria-label="Current note">
            Home <span>&gt;</span> {selectedNote.title}
          </div>

          <div
            className="visual-editor-shell"
            ref={editorShellRef}
            onMouseMove={handleEditorMouseMove}
            onKeyDown={handleEditorKeyDown}
            onMouseLeave={() => {
              if (!isBlockMenuOpen) setIsBlockMenuOpen(false);
            }}
          >
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
                  />
                ) : null}
              </div>
            ) : null}

            <MDXEditor
              ref={editorRef}
              key={selectedNote.id}
              markdown={selectedNote.contentMarkdown}
              onChange={(markdown) => {
                updateNote(selectedNote.id, { contentMarkdown: markdown });
                updateTitleFromMarkdown(markdown);
              }}
              onError={({ error }) => setError(error)}
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
