import type { MDXEditorMethods, MDXEditorProps } from '@mdxeditor/editor';
import type React from 'react';
import type { AppState, Note } from '../lib/types';
import type { QuickFormat } from './utils/editorFormat';

export interface HomeViewState {
  filteredNotes: Note[];
  activeNoteId: string;
  selectedNotebookId: string;
  notebooks: Array<{
    id: string;
    name: string;
    noteCount: number;
  }>;
  notesById: AppState['notes'];
  rootNoteIds: string[];
  childOrderByNote: AppState['childOrderByNote'];
  isHomeMenuOpen: boolean;
  search: string;
  noteTagFilter: string;
  tags: string[];
  showTrash: boolean;
}

export interface HomeViewActions {
  openNoteTab: (id: string) => void;
  handleCreateNote: (title?: string) => Promise<void> | void;
  handleRenameNote: (id: string, title: string) => Promise<void> | void;
  handleMoveNote: (
    id: string,
    destination: {
      notebookId: string;
      parentNoteId: string | null;
      index: number;
    }
  ) => Promise<void> | void;
  handleCreateSubpage: (
    parentNoteId: string,
    title?: string
  ) => Promise<Note | null> | Note | null | void;
  handleCreateNotebook: (name?: string) => Promise<void> | void;
  handleRenameNotebook: (name: string) => Promise<void> | void;
  handleDeleteNotebook: () => Promise<void> | void;
  handleMoveNotebook: (id: string, index: number) => Promise<void> | void;
  handleDeleteNote: (id: string) => Promise<void> | void;
  handleRestoreNote: (id: string) => Promise<void> | void;
  updateNoteMetadata: (
    id: string,
    updates: Partial<Pick<Note, 'tags' | 'pinned' | 'favorite'>>
  ) => Promise<void> | void;
  handleExport: () => Promise<void> | void;
  handleImport: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void> | void;
  toggleHomeMenu: () => void;
  setSelectedNotebookId: (value: string) => void;
  setSearch: (value: string) => void;
  setNoteTagFilter: (value: string) => void;
  setShowTrash: (value: boolean) => void;
}

export interface HomeViewFormatters {
  formatNoteDate: (value: string) => string;
  createNoteSnippet: (markdown: string) => string;
}

export interface TablineState {
  activeTab: string;
  openNoteIds: string[];
  notesById: AppState['notes'];
}

export interface TablineActions {
  openNoteTab: (id: string) => void;
  closeNoteTab: (id: string) => Promise<void> | void;
  handleCreateNote: () => Promise<void> | void;
  onViewClick: (view: string) => void;
  onCloseSidebar: () => void;
}

export interface EditorViewState {
  selectedNote: Note | null;
  noteAncestors: Note[];
  isBlockMenuOpen: boolean;
  blockInsertTarget: { top: number; signature: string } | null;
  selectionToolbar: { top: number; left: number } | null;
  wikilinkMenu: {
    top: number;
    left: number;
    options: Array<{
      noteId: string;
      title: string;
      kind: 'existing' | 'create';
    }>;
  } | null;
  error: string;
}

export interface EditorViewActions {
  updateNote: (
    id: string,
    updates: Partial<Pick<Note, 'title' | 'contentMarkdown'>>
  ) => void;
  handleEditorMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  setIsBlockMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setBlockInsertTarget: React.Dispatch<
    React.SetStateAction<{ top: number; signature: string } | null>
  >;
  insertBlockBelowCurrentTarget: (md: string) => void;
  applyQuickFormatFromMenu: (format: QuickFormat) => void;
  applyTextColorFromMenu: (color: string) => void;
  applyBackgroundColorFromMenu: (color: string) => void;
  applySelectionFormat: (format: QuickFormat) => void;
  applySelectionTextColor: (color: string) => void;
  applySelectionBackgroundColor: (color: string) => void;
  selectionToolbarRef: (element: HTMLDivElement | null) => void;
  onHomeClick: () => void;
  createSubnoteAtCurrentBlock: () => void | Promise<void>;
  onSelectWikilink: (option: {
    noteId: string;
    title: string;
    kind: 'existing' | 'create';
  }) => void;
  onOpenWikilinkMenu: () => void;
  openNoteTab: (noteId: string) => void;
  setError: (value: string) => void;
}

export interface EditorViewConfig {
  editorRef: React.RefObject<MDXEditorMethods>;
  editorShellRef: React.RefObject<HTMLDivElement>;
  blockInsertOptions: ReadonlyArray<{
    label: string;
    markdown: string;
    icon: string;
    section: 'Basic Text' | 'Lists' | 'Advanced Layout';
  }>;
  formatOptions: ReadonlyArray<{
    label: string;
    format: QuickFormat;
    icon: string;
    section: 'Text Style';
  }>;
  editorPlugins: NonNullable<MDXEditorProps['plugins']>;
}
