import { useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import type React from 'react';
import type { Note } from '../../lib/types';
import {
  insertMarkdownAfterBlock,
  isEditableBlockElement,
  normalizeBlockText,
} from '../utils/markdown';

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

  return {
    isBlockMenuOpen,
    setIsBlockMenuOpen,
    blockInsertTarget,
    handleEditorMouseMove,
    insertBlockBelowCurrentTarget,
  };
}
