import {
  useCallback,
  useEffect,
  useState,
  type RefCallback,
  type RefObject,
} from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import {
  applyBackgroundColor,
  applyQuickFormat,
  applyTextColor,
  type QuickFormat,
} from '../utils/editorFormat';
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

  const updateToolbarPosition = useCallback(
    (toolbarWidth?: number) => {
      const shell = editorShellRef.current;
      if (!shell) {
        setSelectionToolbar(null);
        return;
      }
      setSelectionToolbar(getSelectionToolbarPosition(shell, toolbarWidth));
    },
    [editorShellRef]
  );

  const syncToolbarFromSelection = useCallback(() => {
    updateToolbarPosition();
  }, [updateToolbarPosition]);

  const selectionToolbarRef: RefCallback<HTMLDivElement> = useCallback(
    (element) => {
      if (!element) return;
      const width = element.getBoundingClientRect().width;
      if (width > 0) updateToolbarPosition(width);
    },
    [updateToolbarPosition]
  );

  useEffect(() => {
    if (!noteId) {
      setSelectionToolbar(null);
      return;
    }

    document.addEventListener('selectionchange', syncToolbarFromSelection);

    const shell = editorShellRef.current;
    shell?.addEventListener('mouseup', syncToolbarFromSelection);
    shell?.addEventListener('keyup', syncToolbarFromSelection);

    const editorArea = shell?.closest('.editor-area');
    editorArea?.addEventListener('scroll', syncToolbarFromSelection, {
      passive: true,
    });

    return () => {
      document.removeEventListener('selectionchange', syncToolbarFromSelection);
      shell?.removeEventListener('mouseup', syncToolbarFromSelection);
      shell?.removeEventListener('keyup', syncToolbarFromSelection);
      editorArea?.removeEventListener('scroll', syncToolbarFromSelection);
    };
  }, [noteId, editorShellRef, syncToolbarFromSelection]);

  const applySelectionFormat = useCallback(
    (format: QuickFormat) => {
      if (!editorRef.current) return;
      applyQuickFormat(editorRef.current, format);
      window.requestAnimationFrame(syncToolbarFromSelection);
    },
    [editorRef, syncToolbarFromSelection]
  );

  const applySelectionTextColor = useCallback(
    (color: string) => {
      if (!editorRef.current) return;
      applyTextColor(editorRef.current, color);
      window.requestAnimationFrame(syncToolbarFromSelection);
    },
    [editorRef, syncToolbarFromSelection]
  );

  const applySelectionBackgroundColor = useCallback(
    (color: string) => {
      if (!editorRef.current) return;
      applyBackgroundColor(editorRef.current, color);
      window.requestAnimationFrame(syncToolbarFromSelection);
    },
    [editorRef, syncToolbarFromSelection]
  );

  return {
    selectionToolbar,
    applySelectionFormat,
    applySelectionTextColor,
    applySelectionBackgroundColor,
    selectionToolbarRef,
  };
}
