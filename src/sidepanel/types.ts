import type { MDXEditorMethods, MDXEditorProps } from '@mdxeditor/editor';
import type React from 'react';
import type { AppState, Note } from '../lib/types';

export interface HomeViewState {
  filteredNotes: Note[];
  activeNoteId: string;
  selectedNotebookId: string;
  isHomeMenuOpen: boolean;
  search: string;
}

export interface HomeViewActions {
  openNoteTab: (id: string) => void;
  handleCreateNote: () => Promise<void> | void;
  handleDeleteNote: (id: string) => Promise<void> | void;
  handleExport: () => Promise<void> | void;
  handleImport: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void> | void;
  toggleHomeMenu: () => void;
  setSearch: (value: string) => void;
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
  closeNoteTab: (id: string) => void;
  handleCreateNote: () => Promise<void> | void;
  onHomeClick: () => void;
  onCloseSidebar: () => void;
}

export interface EditorViewState {
  selectedNote: Note | null;
  isBlockMenuOpen: boolean;
  blockInsertTarget: { top: number; signature: string } | null;
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
  editorPlugins: NonNullable<MDXEditorProps['plugins']>;
}
