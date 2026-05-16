import { useMemo, type RefObject } from 'react';
import type { MDXEditorMethods, MDXEditorProps } from '@mdxeditor/editor';
import type { Note } from '../../lib/types';
import {
  BLOCK_INSERT_OPTIONS,
  HOME_TAB,
  QUICK_MENU_FORMAT_OPTIONS,
  editorPlugins,
} from '../editorConfig';
import type { EditorViewActions, EditorViewState } from '../types';
import type { WikilinkOption } from './useWikilinkEditor';
import type { QuickFormat } from '../utils/editorFormat';

interface Params {
  selectedNote: Note | null;
  selectedNoteAncestors: Note[];
  selectedNoteSubnotes: Note[];
  isBlockMenuOpen: boolean;
  blockInsertTarget: { top: number; signature: string } | null;
  selectionToolbar: { top: number; left: number } | null;
  wikilinkMenu: EditorViewState['wikilinkMenu'];
  error: string;
  editorRef: RefObject<MDXEditorMethods>;
  editorShellRef: RefObject<HTMLDivElement>;
  setActiveTab: (tab: string) => void;
  updateNote: EditorViewActions['updateNote'];
  handleEditorMouseMove: EditorViewActions['handleEditorMouseMove'];
  setIsBlockMenuOpen: EditorViewActions['setIsBlockMenuOpen'];
  setBlockInsertTarget: EditorViewActions['setBlockInsertTarget'];
  insertBlockBelowCurrentTarget: EditorViewActions['insertBlockBelowCurrentTarget'];
  applyQuickFormatFromMenu: (format: QuickFormat) => void;
  applySelectionFormat: (format: QuickFormat) => void;
  applySelectionTextColor: (color: string) => void;
  applySelectionBackgroundColor: (color: string) => void;
  applyTextColorFromMenu: (color: string) => void;
  applyBackgroundColorFromMenu: (color: string) => void;
  selectionToolbarRef: EditorViewActions['selectionToolbarRef'];
  handleCreateSubnote: (parentNoteId: string, title?: string) => Promise<Note>;
  handleSelectWikilink: (option: WikilinkOption) => void | Promise<void>;
  openWikilinkMenu: (query: string) => void;
  openNoteTab: (noteId: string) => void;
  setError: (value: string) => void;
}

export function useEditorViewProps({
  selectedNote,
  selectedNoteAncestors,
  selectedNoteSubnotes,
  isBlockMenuOpen,
  blockInsertTarget,
  selectionToolbar,
  wikilinkMenu,
  error,
  editorRef,
  editorShellRef,
  setActiveTab,
  updateNote,
  handleEditorMouseMove,
  setIsBlockMenuOpen,
  setBlockInsertTarget,
  insertBlockBelowCurrentTarget,
  applyQuickFormatFromMenu,
  applySelectionFormat,
  applySelectionTextColor,
  applySelectionBackgroundColor,
  applyTextColorFromMenu,
  applyBackgroundColorFromMenu,
  selectionToolbarRef,
  handleCreateSubnote,
  handleSelectWikilink,
  openWikilinkMenu,
  openNoteTab,
  setError,
}: Params) {
  const state = useMemo<EditorViewState>(
    () => ({
      selectedNote,
      noteAncestors: selectedNoteAncestors,
      subnotes: selectedNoteSubnotes,
      isBlockMenuOpen,
      blockInsertTarget,
      selectionToolbar,
      wikilinkMenu,
      error,
    }),
    [
      selectedNote,
      selectedNoteAncestors,
      selectedNoteSubnotes,
      isBlockMenuOpen,
      blockInsertTarget,
      selectionToolbar,
      wikilinkMenu,
      error,
    ]
  );

  const actions = useMemo<EditorViewActions>(
    () => ({
      updateNote,
      handleEditorMouseMove,
      setIsBlockMenuOpen,
      setBlockInsertTarget,
      insertBlockBelowCurrentTarget,
      applyQuickFormatFromMenu,
      applySelectionFormat,
      applySelectionTextColor,
      applySelectionBackgroundColor,
      applyTextColorFromMenu,
      applyBackgroundColorFromMenu,
      selectionToolbarRef,
      onHomeClick: () => setActiveTab(HOME_TAB),
      onCreateSubnote: () => {
        if (selectedNote) void handleCreateSubnote(selectedNote.id);
      },
      onSelectWikilink: (option) => {
        void handleSelectWikilink(option);
      },
      onOpenWikilinkMenu: () => openWikilinkMenu(''),
      openNoteTab,
      setError,
    }),
    [
      updateNote,
      handleEditorMouseMove,
      setIsBlockMenuOpen,
      setBlockInsertTarget,
      insertBlockBelowCurrentTarget,
      applyQuickFormatFromMenu,
      applySelectionFormat,
      applySelectionTextColor,
      applySelectionBackgroundColor,
      applyTextColorFromMenu,
      applyBackgroundColorFromMenu,
      selectionToolbarRef,
      setActiveTab,
      selectedNote,
      handleCreateSubnote,
      handleSelectWikilink,
      openWikilinkMenu,
      openNoteTab,
      setError,
    ]
  );

  const config = useMemo(
    () => ({
      editorRef,
      editorShellRef,
      blockInsertOptions: BLOCK_INSERT_OPTIONS,
      formatOptions: QUICK_MENU_FORMAT_OPTIONS,
      editorPlugins: editorPlugins as NonNullable<MDXEditorProps['plugins']>,
    }),
    [editorRef, editorShellRef]
  );

  return { state, actions, config };
}
