import { useEffect, type RefObject } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import type { Note } from '../../lib/types';
import {
  looksLikeMarkdownPaste,
  prepareMarkdownForEditor,
} from '../utils/markdown';

interface Params {
  noteId: string | undefined;
  editorShellRef: RefObject<HTMLDivElement>;
  editorRef: RefObject<MDXEditorMethods>;
  selectedNote: Note | null;
  updateNote: (
    id: string,
    updates: Partial<Pick<Note, 'contentMarkdown'>>
  ) => void;
}

export function isNoteMostlyEmpty(markdown: string): boolean {
  const stripped = markdown
    .replace(/[#>*\-\[\]`]/g, '')
    .replace(/\s+/g, '')
    .trim();
  return stripped.length === 0;
}

/** Only replace the whole note when it has no real content; otherwise insert at cursor. */
export function shouldReplaceNoteOnPaste(currentMarkdown: string): boolean {
  return isNoteMostlyEmpty(currentMarkdown);
}

export function useMarkdownPaste({
  noteId,
  editorShellRef,
  editorRef,
  selectedNote,
  updateNote,
}: Params) {
  useEffect(() => {
    if (!noteId) return;

    const shellNode = editorShellRef.current;
    if (!shellNode) return;
    const root: HTMLDivElement = shellNode;

    function handlePaste(event: ClipboardEvent) {
      if (!(event.target instanceof Node)) return;
      const content = root.querySelector('.visual-editor-content');
      if (!content?.contains(event.target)) return;

      const plain = event.clipboardData?.getData('text/plain') ?? '';
      if (!plain || !looksLikeMarkdownPaste(plain)) return;

      const editor = editorRef.current;
      if (!editor || !selectedNote) return;

      event.preventDefault();
      event.stopPropagation();

      const prepared = prepareMarkdownForEditor(plain);
      const current = editor.getMarkdown();

      if (shouldReplaceNoteOnPaste(current)) {
        editor.setMarkdown(prepared);
      } else {
        editor.insertMarkdown(prepared);
      }

      const nextMarkdown = editor.getMarkdown();
      updateNote(selectedNote.id, { contentMarkdown: nextMarkdown });
      editor.focus();
    }

    root.addEventListener('paste', handlePaste, true);
    return () => root.removeEventListener('paste', handlePaste, true);
  }, [editorRef, editorShellRef, noteId, selectedNote, updateNote]);
}
