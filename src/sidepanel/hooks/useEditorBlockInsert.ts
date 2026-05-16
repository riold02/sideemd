import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import type React from 'react';
import type { Note } from '../../lib/types';
import {
  insertMarkdownAfterBlock,
  resolveBlockInsertHover,
} from '../utils/markdown';
import { applyQuickFormat, type QuickFormat } from '../utils/editorFormat';

interface Params {
  editorShellRef: React.RefObject<HTMLDivElement>;
  editorRef: React.RefObject<MDXEditorMethods>;
  selectedNote: Note | null;
  updateNote: (
    id: string,
    updates: Partial<Pick<Note, 'title' | 'contentMarkdown'>>
  ) => void;
}

export function useEditorBlockInsert({
  editorShellRef,
  editorRef,
  selectedNote,
  updateNote,
}: Params) {
  const [blockInsertTarget, setBlockInsertTarget] = useState<{
    top: number;
    signature: string;
  } | null>(null);
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!isBlockMenuOpen) return;
      if (!(event.target instanceof Element)) return;
      const clickedInsideInsertControl = Boolean(
        event.target.closest(
          '.block-insert-control, .block-insert-menu, .block-insert-button'
        )
      );
      if (!clickedInsideInsertControl) {
        setIsBlockMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isBlockMenuOpen]);

  function handleEditorMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    const shell = editorShellRef.current;
    if (!shell) return;
    if (isBlockMenuOpen) return;
    const controlElement =
      event.target instanceof Element
        ? event.target.closest(
            '.block-insert-control, .block-insert-menu, .block-insert-button'
          )
        : null;
    const hoverTarget =
      event.target instanceof Element
        ? resolveBlockInsertHover(event.target, shell)
        : null;
    if (!hoverTarget) {
      if (controlElement && shell.contains(controlElement)) {
        // Preserve current target when moving from block text to insert controls.
        return;
      }
      if (!isBlockMenuOpen) setBlockInsertTarget(null);
      return;
    }
    const shellRect = shell.getBoundingClientRect();
    const anchorRect = hoverTarget.anchor.getBoundingClientRect();
    setBlockInsertTarget({
      top: anchorRect.top - shellRect.top + anchorRect.height / 2,
      signature: hoverTarget.signature,
    });
  }

  function openQuickMenuFromElement(targetElement: Element) {
    const shell = editorShellRef.current;
    if (!shell) return;
    const hoverTarget = resolveBlockInsertHover(targetElement, shell);
    if (!hoverTarget) return;
    const shellRect = shell.getBoundingClientRect();
    const anchorRect = hoverTarget.anchor.getBoundingClientRect();
    setBlockInsertTarget({
      top: anchorRect.top - shellRect.top + anchorRect.height / 2,
      signature: hoverTarget.signature,
    });
    setIsBlockMenuOpen(true);
  }

  function closeQuickMenu() {
    setIsBlockMenuOpen(false);
    setBlockInsertTarget(null);
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
    closeQuickMenu();
  }

  function applyQuickFormatFromMenu(format: QuickFormat) {
    if (!editorRef.current) return;
    applyQuickFormat(editorRef.current, format);
    closeQuickMenu();
  }

  function handleEditorKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
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

    if (isBlockMenuOpen) {
      event.preventDefault();
      editorRef.current?.insertMarkdown('/');
      closeQuickMenu();
      return;
    }

    event.preventDefault();
    openQuickMenuFromElement(editableBlock);
  }

  return {
    isBlockMenuOpen,
    setIsBlockMenuOpen,
    blockInsertTarget,
    setBlockInsertTarget,
    handleEditorMouseMove,
    handleEditorKeyDown,
    insertBlockBelowCurrentTarget,
    applyQuickFormatFromMenu,
    openQuickMenuFromElement,
    closeQuickMenu,
  };
}
