import { useEffect, type RefObject } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import {
  isSlashTriggerBlock,
  normalizeBlockText,
  resolveBlockInsertHover,
} from '../utils/markdown';

interface Params {
  noteId: string | undefined;
  editorShellRef: RefObject<HTMLDivElement>;
  editorRef: RefObject<MDXEditorMethods>;
  isBlockMenuOpenRef: RefObject<boolean>;
  openQuickMenuFromElement: (targetElement: Element) => boolean;
  closeQuickMenu: () => void;
}

export function useSlashQuickMenu({
  noteId,
  editorShellRef,
  editorRef,
  isBlockMenuOpenRef,
  openQuickMenuFromElement,
  closeQuickMenu,
}: Params) {
  useEffect(() => {
    if (!noteId) return;
    let cancelled = false;
    let detach: (() => void) | null = null;

    function handleSlashKeyDown(event: KeyboardEvent) {
      if (
        event.key !== '/' ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const shell = editorShellRef.current;
      if (!shell) return;

      const editorContent = shell.querySelector('.visual-editor-content');
      if (
        !(event.target instanceof Node) ||
        !editorContent?.contains(event.target)
      ) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
        return;
      }

      const anchorNode = selection.anchorNode;
      const anchorElement =
        anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;
      if (!anchorElement) return;

      const hoverTarget = resolveBlockInsertHover(anchorElement, shell);
      if (!hoverTarget) return;

      const blockText = normalizeBlockText(
        hoverTarget.anchor.textContent ?? ''
      );
      if (!isSlashTriggerBlock(blockText)) return;

      event.preventDefault();
      event.stopPropagation();

      if (isBlockMenuOpenRef.current) {
        editorRef.current?.insertMarkdown('/');
        closeQuickMenu();
        return;
      }

      openQuickMenuFromElement(hoverTarget.anchor);
    }

    function attachListener() {
      if (cancelled || detach) return;
      const shell = editorShellRef.current;
      if (!shell) return;
      shell.addEventListener('keydown', handleSlashKeyDown, true);
      detach = () =>
        shell.removeEventListener('keydown', handleSlashKeyDown, true);
    }

    attachListener();
    const retryId = detach
      ? null
      : window.requestAnimationFrame(() => attachListener());

    return () => {
      cancelled = true;
      if (retryId !== null) window.cancelAnimationFrame(retryId);
      detach?.();
    };
  }, [
    noteId,
    editorShellRef,
    editorRef,
    isBlockMenuOpenRef,
    openQuickMenuFromElement,
    closeQuickMenu,
  ]);
}
