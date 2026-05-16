import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import type React from 'react';
import type { Note } from '../../lib/types';
import {
  insertMarkdownAfterBlock,
  isEmptyBlockSignature,
  isSlashTriggerBlock,
  normalizeBlockText,
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
  const isBlockMenuOpenRef = useRef(isBlockMenuOpen);
  isBlockMenuOpenRef.current = isBlockMenuOpen;

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

  useLayoutEffect(() => {
    if (!selectedNote) return;

    function getEditorKeyTarget(): HTMLElement | null {
      const shell = editorShellRef.current;
      if (!shell) return null;
      return (
        shell.querySelector<HTMLElement>('.visual-editor-content') ?? shell
      );
    }

    function handleSlashKey(event: KeyboardEvent) {
      const shell = editorShellRef.current;
      if (!shell || event.key !== '/' || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target =
        event.target instanceof Element
          ? event.target
          : document.activeElement instanceof Element
            ? document.activeElement
            : null;
      if (!target) return;

      const editableBlock = target.closest('p,h1,h2,h3,h4,h5,h6,li,blockquote');
      if (!editableBlock || !shell.contains(editableBlock)) return;

      const blockText = normalizeBlockText(editableBlock.textContent ?? '');
      if (!isSlashTriggerBlock(blockText)) return;

      if (isBlockMenuOpenRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        editorRef.current?.insertMarkdown('/');
        setIsBlockMenuOpen(false);
        setBlockInsertTarget(null);
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      const hoverTarget = resolveBlockInsertHover(editableBlock, shell);
      if (!hoverTarget) return;
      const shellRect = shell.getBoundingClientRect();
      const anchorRect = hoverTarget.anchor.getBoundingClientRect();
      setBlockInsertTarget({
        top: anchorRect.top - shellRect.top + anchorRect.height / 2,
        signature: hoverTarget.signature,
      });
      setIsBlockMenuOpen(true);
    }

    let keyTarget: HTMLElement | null = null;
    let rafId = 0;

    function bindKeyTarget() {
      if (keyTarget) {
        keyTarget.removeEventListener('keydown', handleSlashKey, true);
      }
      keyTarget = getEditorKeyTarget();
      keyTarget?.addEventListener('keydown', handleSlashKey, true);
    }

    bindKeyTarget();
    rafId = requestAnimationFrame(bindKeyTarget);

    return () => {
      cancelAnimationFrame(rafId);
      keyTarget?.removeEventListener('keydown', handleSlashKey, true);
    };
  }, [selectedNote?.id, editorRef, editorShellRef]);

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
    if (
      isEmptyBlockSignature(blockInsertTarget.signature) &&
      editorRef.current
    ) {
      editorRef.current.insertMarkdown(markdown);
      const nextMarkdown = editorRef.current.getMarkdown();
      updateNote(selectedNote.id, { contentMarkdown: nextMarkdown });
      closeQuickMenu();
      return;
    }
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

  return {
    isBlockMenuOpen,
    setIsBlockMenuOpen,
    blockInsertTarget,
    setBlockInsertTarget,
    handleEditorMouseMove,
    insertBlockBelowCurrentTarget,
    applyQuickFormatFromMenu,
    openQuickMenuFromElement,
    closeQuickMenu,
  };
}
