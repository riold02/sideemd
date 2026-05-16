import { Plus } from 'lucide-react';
import { MDXEditor } from '@mdxeditor/editor';
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
    setIsBlockMenuOpen,
    insertBlockBelowCurrentTarget,
    setError,
  } = actions;
  const { editorRef, editorShellRef, blockInsertOptions, editorPlugins } =
    config;

  return (
    <main className="editor-area">
      {selectedNote ? (
        <>
          <input
            className="title-input"
            value={selectedNote.title}
            onChange={(e) =>
              updateNote(selectedNote.id, { title: e.target.value })
            }
            placeholder="Note title"
          />

          <div
            className="visual-editor-shell"
            ref={editorShellRef}
            onMouseMove={handleEditorMouseMove}
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
                  <div className="block-insert-menu" role="menu">
                    {blockInsertOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() =>
                          insertBlockBelowCurrentTarget(option.markdown)
                        }
                        role="menuitem"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <MDXEditor
              ref={editorRef}
              key={selectedNote.id}
              markdown={selectedNote.contentMarkdown}
              onChange={(markdown) =>
                updateNote(selectedNote.id, { contentMarkdown: markdown })
              }
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
