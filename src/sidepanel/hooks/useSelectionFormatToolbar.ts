import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import { applyQuickFormat, type QuickFormat } from '../utils/editorFormat';
import {
  getSelectionToolbarPosition,
  type SelectionToolbarPosition,
} from '../utils/selectionToolbar';

interface Params {
  noteId: string | undefined;
  editorShellRef: RefObject<HTMLDivElement>;
  editorRef: RefObject<MDXEditorMethods>;
}

export function useSelectionFormatToolbar({
  noteId,
  editorShellRef,
  editorRef,
}: Params) {
  const [selectionToolbar, setSelectionToolbar] =
    useState<SelectionToolbarPosition | null>(null);

  const syncToolbar = useCallback(() => {
    const shell = editorShellRef.current;
    if (!shell) {
      setSelectionToolbar(null);
      return;
    }
    setSelectionToolbar(getSelectionToolbarPosition(shell));
  }, [editorShellRef]);

  useEffect(() => {
    if (!noteId) {
      setSelectionToolbar(null);
      return;
    }

    document.addEventListener('selectionchange', syncToolbar);

    const shell = editorShellRef.current;
    shell?.addEventListener('mouseup', syncToolbar);
    shell?.addEventListener('keyup', syncToolbar);

    const editorArea = shell?.closest('.editor-area');
    editorArea?.addEventListener('scroll', syncToolbar, { passive: true });

    return () => {
      document.removeEventListener('selectionchange', syncToolbar);
      shell?.removeEventListener('mouseup', syncToolbar);
      shell?.removeEventListener('keyup', syncToolbar);
      editorArea?.removeEventListener('scroll', syncToolbar);
    };
  }, [noteId, editorShellRef, syncToolbar]);

  const applySelectionFormat = useCallback(
    (format: QuickFormat) => {
      if (!editorRef.current) return;
      applyQuickFormat(editorRef.current, format);
      window.requestAnimationFrame(syncToolbar);
    },
    [editorRef, syncToolbar]
  );

  return { selectionToolbar, applySelectionFormat };
}
