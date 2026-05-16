import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import type { AppState, Note } from '../../lib/types';
import {
  buildNoteLinkMarkdown,
  parseSideemdNoteUrl,
} from '../../lib/noteLinks';
import {
  findNoteByTitleInSubtree,
  getDirectChildren,
} from '../../lib/noteTree';

export interface WikilinkOption {
  noteId: string;
  title: string;
  kind: 'existing' | 'create';
}

interface Params {
  noteId: string | undefined;
  editorShellRef: RefObject<HTMLDivElement>;
  editorRef: RefObject<MDXEditorMethods>;
  state: AppState;
  openNoteTab: (noteId: string) => void;
  createSubnote: (title: string) => Promise<Note | null>;
}

function getTextBeforeCursor(): string {
  const selection = window.getSelection();
  if (!selection?.anchorNode || selection.anchorOffset < 1) return '';
  const { anchorNode, anchorOffset } = selection;
  if (anchorNode.nodeType === Node.TEXT_NODE) {
    return anchorNode.textContent?.slice(0, anchorOffset) ?? '';
  }
  return '';
}

export function useWikilinkEditor({
  noteId,
  editorShellRef,
  editorRef,
  state,
  openNoteTab,
  createSubnote,
}: Params) {
  const [wikilinkMenu, setWikilinkMenu] = useState<{
    top: number;
    left: number;
    options: WikilinkOption[];
  } | null>(null);

  const hideWikilinkMenu = useCallback(() => {
    setWikilinkMenu(null);
  }, []);

  const resolveWikilinkOptions = useCallback(
    (query: string): WikilinkOption[] => {
      if (!noteId) return [];
      const children = getDirectChildren(state, noteId);
      const normalized = query.trim().toLowerCase();
      const matches = children.filter((child) =>
        child.title.toLowerCase().includes(normalized)
      );
      const options: WikilinkOption[] = matches.map((child) => ({
        noteId: child.id,
        title: child.title,
        kind: 'existing',
      }));
      const exact = children.some(
        (child) => child.title.trim().toLowerCase() === normalized
      );
      if (query.trim() && !exact) {
        options.push({
          noteId: '',
          title: query.trim(),
          kind: 'create',
        });
      } else if (!query.trim() && children.length === 0) {
        options.push({
          noteId: '',
          title: 'Untitled Note',
          kind: 'create',
        });
      }
      return options;
    },
    [noteId, state]
  );

  const openWikilinkMenu = useCallback(
    (query: string) => {
      const shell = editorShellRef.current;
      const selection = window.getSelection();
      if (!shell || !selection || selection.rangeCount === 0) return;

      const options = resolveWikilinkOptions(query);
      if (options.length === 0) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();

      setWikilinkMenu({
        top: rect.bottom - shellRect.top + 6,
        left: Math.max(8, rect.left - shellRect.left),
        options,
      });
    },
    [editorShellRef, resolveWikilinkOptions]
  );

  const insertNoteLink = useCallback(
    (targetNoteId: string, title: string) => {
      if (!editorRef.current) return;
      const note = state.notes[targetNoteId];
      const linkTitle = title || note?.title || 'Untitled Note';
      editorRef.current.insertMarkdown(
        buildNoteLinkMarkdown(linkTitle, targetNoteId)
      );
      editorRef.current.focus();
      hideWikilinkMenu();
    },
    [editorRef, hideWikilinkMenu, state.notes]
  );

  const handleSelectWikilink = useCallback(
    async (option: WikilinkOption) => {
      if (!noteId) return;
      if (option.kind === 'existing') {
        insertNoteLink(option.noteId, option.title);
        return;
      }

      const existing = findNoteByTitleInSubtree(state, noteId, option.title);
      if (existing) {
        insertNoteLink(existing.id, existing.title);
        return;
      }

      const created = await createSubnote(option.title);
      if (created) {
        insertNoteLink(created.id, created.title);
      }
    },
    [createSubnote, insertNoteLink, noteId, state]
  );

  useEffect(() => {
    if (!noteId) return;
    const editorShell = editorShellRef.current;
    if (!editorShell) return;
    const shellRoot = editorShell;

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.wikilink-menu')) return;

      const anchor = target.closest('a');
      if (anchor) {
        const linkedNoteId = parseSideemdNoteUrl(anchor.getAttribute('href'));
        if (linkedNoteId && state.notes[linkedNoteId]) {
          event.preventDefault();
          openNoteTab(linkedNoteId);
          return;
        }
      }

      hideWikilinkMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.target instanceof Node)) return;
      const content = shellRoot.querySelector('.visual-editor-content');
      if (!content?.contains(event.target)) return;

      if (event.key === 'Escape') {
        hideWikilinkMenu();
        return;
      }

      if (event.key === '[' && !event.metaKey && !event.ctrlKey) {
        const before = getTextBeforeCursor();
        if (before.endsWith('[')) {
          event.preventDefault();
          openWikilinkMenu('');
        }
      }
    }

    shellRoot.addEventListener('click', handleClick, true);
    shellRoot.addEventListener('keydown', handleKeyDown, true);
    return () => {
      shellRoot.removeEventListener('click', handleClick, true);
      shellRoot.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    editorShellRef,
    hideWikilinkMenu,
    noteId,
    openNoteTab,
    openWikilinkMenu,
    state.notes,
  ]);

  return {
    wikilinkMenu,
    hideWikilinkMenu,
    handleSelectWikilink,
    insertNoteLink,
    openWikilinkMenu,
    resolveWikilinkOptions,
  };
}
