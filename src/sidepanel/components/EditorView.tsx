import { Plus } from 'lucide-react';
import { MDXEditor } from '@mdxeditor/editor';
import type { KeyboardEvent } from 'react';
import { resolveBlockInsertHover } from '../utils/markdown';
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
    setBlockInsertTarget,
    insertBlockBelowCurrentTarget,
    setError,
  } = actions;
  const { editorRef, editorShellRef, blockInsertOptions, editorPlugins } =
    config;
  const sectionOrder = ['Basic Text', 'Lists', 'Advanced Layout'] as const;

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

  function openBlockInsertFromElement(targetElement: Element) {
    if (!editorShellRef.current || !selectedNote) return;
    const hoverTarget = resolveBlockInsertHover(
      targetElement,
      editorShellRef.current
    );
    if (!hoverTarget) return;
    const shellRect = editorShellRef.current.getBoundingClientRect();
    const anchorRect = hoverTarget.anchor.getBoundingClientRect();
    setBlockInsertTarget({
      top: anchorRect.top - shellRect.top + anchorRect.height / 2,
      signature: hoverTarget.signature,
    });
    setIsBlockMenuOpen(true);
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== '/' || !editorShellRef.current) return;
    if (!(event.target instanceof Element)) return;
    const editableBlock = event.target.closest(
      'p,h1,h2,h3,h4,h5,h6,li,blockquote'
    );
    if (!editableBlock || !editorShellRef.current.contains(editableBlock)) {
      return;
    }
    const blockText = (editableBlock.textContent ?? '').trim();
    if (blockText.length > 0) return;
    event.preventDefault();
    openBlockInsertFromElement(editableBlock);
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
                  <div className="block-insert-menu" role="menu">
                    {sectionOrder.map((section) => {
                      const options = blockInsertOptions.filter(
                        (option) => option.section === section
                      );
                      if (options.length === 0) return null;
                      return (
                        <div className="block-insert-group" key={section}>
                          <div className="block-insert-group-title">
                            {section}
                          </div>
                          {options.map((option) => (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() =>
                                insertBlockBelowCurrentTarget(option.markdown)
                              }
                              role="menuitem"
                            >
                              <span className="block-option-icon" aria-hidden>
                                {option.icon}
                              </span>
                              <span>{option.label}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
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
