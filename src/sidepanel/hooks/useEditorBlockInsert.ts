import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import type React from 'react';
import { buildNoteLinkMarkdown } from '../../lib/noteLinks';
import type { Note } from '../../lib/types';
import {
  BLOCK_INSERT_SELECTOR,
  getBlockInsertSignature,
  insertMarkdownAfterBlock,
  isEditableBlockElement,
  isEmptyBlockSignature,
  replaceBlockWithMarkdown,
  resolveBlockInsertHover,
} from '../utils/markdown';
import {
  applyBackgroundColor,
  applyQuickFormat,
  applyTextColor,
  type QuickFormat,
} from '../utils/editorFormat';
import { useSlashQuickMenu } from './useSlashQuickMenu';

interface Params {
  editorShellRef: React.RefObject<HTMLDivElement>;
  editorRef: React.RefObject<MDXEditorMethods>;
  selectedNote: Note | null;
  updateNote: (
    id: string,
    updates: Partial<Pick<Note, 'title' | 'contentMarkdown'>>
  ) => void;
  createSubnote: (title?: string) => Promise<Note | null>;
}

export function useEditorBlockInsert({
  editorShellRef,
  editorRef,
  selectedNote,
  updateNote,
  createSubnote,
}: Params) {
  const [blockInsertTarget, setBlockInsertTarget] = useState<{
    top: number;
    signature: string;
    placeAbove: boolean;
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

  function resolveMenuPlacement(shell: HTMLDivElement, top: number) {
    const estimatedMenuHeight = 320;
    const gapFromButton = 34;
    const availableBelow = shell.clientHeight - top;
    const availableAbove = top;
    return (
      availableBelow < estimatedMenuHeight + gapFromButton &&
      availableAbove > availableBelow
    );
  }

  const openQuickMenuFromElement = useCallback(
    (targetElement: Element): boolean => {
      const shell = editorShellRef.current;
      if (!shell) return false;

      let hoverTarget = resolveBlockInsertHover(targetElement, shell);
      if (!hoverTarget) {
        const block =
          targetElement.closest(BLOCK_INSERT_SELECTOR) ??
          (isEditableBlockElement(targetElement) ? targetElement : null);
        if (block && shell.contains(block)) {
          const signature = getBlockInsertSignature(block);
          if (signature) {
            hoverTarget = { block, anchor: block, signature };
          }
        }
      }
      if (!hoverTarget) return false;

      const shellRect = shell.getBoundingClientRect();
      const anchorRect = hoverTarget.anchor.getBoundingClientRect();
      const top = anchorRect.top - shellRect.top + anchorRect.height / 2;
      setBlockInsertTarget({
        top,
        signature: hoverTarget.signature,
        placeAbove: resolveMenuPlacement(shell, top),
      });
      setIsBlockMenuOpen(true);
      return true;
    },
    [editorShellRef]
  );

  const closeQuickMenu = useCallback(() => {
    setIsBlockMenuOpen(false);
    setBlockInsertTarget(null);
  }, []);

  useSlashQuickMenu({
    noteId: selectedNote?.id,
    editorShellRef,
    editorRef,
    isBlockMenuOpenRef,
    openQuickMenuFromElement,
    closeQuickMenu,
  });

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
    const top = anchorRect.top - shellRect.top + anchorRect.height / 2;
    setBlockInsertTarget({
      top,
      signature: hoverTarget.signature,
      placeAbove: resolveMenuPlacement(shell, top),
    });
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

  function applyTextColorFromMenu(color: string) {
    if (!editorRef.current) return;
    applyTextColor(editorRef.current, color);
    closeQuickMenu();
  }

  function applyBackgroundColorFromMenu(color: string) {
    if (!editorRef.current) return;
    applyBackgroundColor(editorRef.current, color);
    closeQuickMenu();
  }

  async function createSubnoteAtCurrentBlock() {
    if (!selectedNote || !blockInsertTarget) return;

    const requestedTitle = window.prompt('Page title', '');
    if (requestedTitle === null) {
      closeQuickMenu();
      return;
    }

    const created = await createSubnote(requestedTitle.trim() || 'Untitled Page');
    if (!created) return;

    const linkLine = `- ${buildNoteLinkMarkdown(created.title, created.id)}`;
    const { signature } = blockInsertTarget;

    if (isEmptyBlockSignature(signature) && editorRef.current) {
      editorRef.current.insertMarkdown(linkLine);
      const nextMarkdown = editorRef.current.getMarkdown();
      updateNote(selectedNote.id, { contentMarkdown: nextMarkdown });
      closeQuickMenu();
      return;
    }

    const nextMarkdown = replaceBlockWithMarkdown(
      selectedNote.contentMarkdown,
      signature,
      linkLine
    );
    updateNote(selectedNote.id, { contentMarkdown: nextMarkdown });
    editorRef.current?.setMarkdown(nextMarkdown);
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
    applyTextColorFromMenu,
    applyBackgroundColorFromMenu,
    createSubnoteAtCurrentBlock,
    openQuickMenuFromElement,
    closeQuickMenu,
  };
}
