import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import {
  type MDXEditorMethods,
  codeBlockPlugin,
  codeMirrorPlugin,
  frontmatterPlugin,
  headingsPlugin,
  imagePlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import { ChromeStorageRepository } from '../lib/storage';
import { AppState, Note } from '../lib/types';
import { createDefaultState } from '../lib/state';
import {
  mergeImportedState,
  parseImport,
  replaceImportedState,
  serializeState,
} from '../lib/importExport';
import Tabline from './components/Tabline';
import HomeView from './components/HomeView';
import EditorView from './components/EditorView';

const repository = new ChromeStorageRepository();
const editorPlugins = [
  headingsPlugin(),
  frontmatterPlugin(),
  listsPlugin(),
  linkPlugin(),
  imagePlugin({ disableImageResize: true, disableImageSettingsButton: true }),
  quotePlugin(),
  thematicBreakPlugin(),
  tablePlugin(),
  codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
  codeMirrorPlugin({
    codeBlockLanguages: {
      txt: 'Plain text',
      ts: 'TypeScript',
      tsx: 'TSX',
      js: 'JavaScript',
      jsx: 'JSX',
      json: 'JSON',
      md: 'Markdown',
      bash: 'Bash',
    },
  }),
  markdownShortcutPlugin(),
];

const HOME_TAB = 'home';
const BLOCK_INSERT_OPTIONS = [
  { label: 'Paragraph', markdown: 'New paragraph' },
  { label: 'Heading 1', markdown: '# New heading' },
  { label: 'Heading 2', markdown: '## New heading' },
  { label: 'Bulleted list', markdown: '- New item' },
  { label: 'Numbered list', markdown: '1. New item' },
  { label: 'Task', markdown: '- [ ] New task' },
  { label: 'Quote', markdown: '> New quote' },
  { label: 'Code block', markdown: '```txt\nNew code\n```' },
  {
    label: 'Table',
    markdown: '| Column | Value |\n| --- | --- |\n| Item | Detail |',
  },
  { label: 'Divider', markdown: '---' },
];

function normalizeBlockText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isEditableBlockElement(element: Element): boolean {
  return [
    'P',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'LI',
    'BLOCKQUOTE',
    'PRE',
    'TABLE',
    'HR',
  ].includes(element.tagName);
}

function markdownLineMatchesBlock(line: string, signature: string): boolean {
  const normalizedLine = normalizeBlockText(
    line
      .replace(/^#{1,6}\s+/, '')
      .replace(/^>\s?/, '')
      .replace(/^[-*+]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .replace(/^- \[[ xX]\]\s+/, '')
  );
  return (
    normalizedLine.length > 0 &&
    (normalizedLine === signature ||
      normalizedLine.includes(signature) ||
      signature.includes(normalizedLine))
  );
}

function insertMarkdownAfterBlock(
  markdown: string,
  signature: string,
  blockMarkdown: string
): string {
  const insertText = `\n\n${blockMarkdown}\n`;
  const lines = markdown.split('\n');
  const matchIndex = lines.findIndex((line) =>
    markdownLineMatchesBlock(line, signature)
  );
  if (matchIndex === -1) return `${markdown.trimEnd()}${insertText}`;
  const nextLines = [...lines];
  nextLines.splice(matchIndex + 1, 0, '', blockMarkdown);
  return nextLines.join('\n');
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, ' code sample ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[`*_~>#|[\]-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createNoteSnippet(markdown: string): string {
  const text = stripMarkdown(markdown);
  return text.length > 72
    ? `${text.slice(0, 72).trim()}...`
    : text || 'No content yet';
}

function formatNoteDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export default function App() {
  const [state, setState] = useState<AppState>(createDefaultState());
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>(HOME_TAB);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [activeNoteId, setActiveNoteId] = useState<string>('');
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const editorRef = useRef<MDXEditorMethods>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const [blockInsertTarget, setBlockInsertTarget] = useState<{
    top: number;
    signature: string;
  } | null>(null);
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);

  useEffect(() => {
    async function loadState() {
      try {
        const loaded = await repository.getState();
        setState(loaded);
        const firstNotebookId = loaded.notebookOrder[0] ?? '';
        setSelectedNotebookId(firstNotebookId);
        setActiveTab(HOME_TAB);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    }
    void loadState();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(
      () => void repository.saveState(state),
      350
    );
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [state, loading]);

  const selectedNote =
    activeTab === HOME_TAB ? null : (state.notes[activeTab] ?? null);
  const currentNoteIds = selectedNotebookId
    ? (state.noteOrderByNotebook[selectedNotebookId] ?? [])
    : [];
  const currentNotes = currentNoteIds
    .map((id) => state.notes[id])
    .filter(Boolean);
  const allNotes = Object.values(state.notes);

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return currentNotes;
    const q = search.toLowerCase();
    return allNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.contentMarkdown.toLowerCase().includes(q)
    );
  }, [currentNotes, allNotes, search]);

  function patchState(next: AppState) {
    setState(next);
  }
  function openNoteTab(noteId: string) {
    const note = state.notes[noteId];
    if (!note) return;
    setOpenNoteIds((ids) => (ids.includes(noteId) ? ids : [...ids, noteId]));
    setSelectedNotebookId(note.notebookId);
    setActiveNoteId(noteId);
    setActiveTab(noteId);
  }
  function closeNoteTab(noteId: string) {
    setOpenNoteIds((ids) => ids.filter((id) => id !== noteId));
    if (activeTab === noteId) setActiveTab(HOME_TAB);
  }
  function syncOpenTabs(next: AppState) {
    setOpenNoteIds((ids) => ids.filter((id) => Boolean(next.notes[id])));
    if (activeTab !== HOME_TAB && !next.notes[activeTab])
      setActiveTab(HOME_TAB);
  }
  function updateNote(
    noteId: string,
    updates: Partial<Pick<Note, 'title' | 'contentMarkdown'>>
  ) {
    const existing = state.notes[noteId];
    if (!existing) return;
    patchState({
      ...state,
      notes: {
        ...state.notes,
        [noteId]: {
          ...existing,
          ...updates,
          title: (updates.title ?? existing.title).trim() || 'Untitled Note',
          updatedAt: new Date().toISOString(),
        },
      },
    });
  }

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

  async function handleCreateNote() {
    const notebookId = selectedNotebookId || state.notebookOrder[0];
    if (!notebookId) return;
    const note = await repository.createNote(notebookId, 'Untitled Note');
    patchState(await repository.getState());
    setOpenNoteIds((ids) => (ids.includes(note.id) ? ids : [...ids, note.id]));
    setActiveNoteId(note.id);
    setActiveTab(note.id);
  }
  async function handleDeleteNote(noteId: string) {
    if (!window.confirm('Delete note?')) return;
    await repository.deleteNote(noteId);
    const next = await repository.getState();
    patchState(next);
    syncOpenTabs(next);
  }
  async function handleExport() {
    const payload = serializeState(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mdside-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = parseImport(text);
      const mode = window.confirm('Import mode: OK = Merge, Cancel = Replace')
        ? 'merge'
        : 'replace';
      const next =
        mode === 'merge'
          ? mergeImportedState(state, payload)
          : replaceImportedState(payload);
      patchState(next);
      await repository.saveState(next);
      const firstNotebookId = next.notebookOrder[0] ?? '';
      setSelectedNotebookId(firstNotebookId);
      syncOpenTabs(next);
      setActiveTab(HOME_TAB);
      setIsHomeMenuOpen(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      (event.target as HTMLInputElement).value = '';
    }
  }

  if (loading) return <div className="loading">Loading notes...</div>;

  return (
    <div className="app-shell" data-color-mode="light">
      <Tabline
        activeTab={activeTab}
        openNoteIds={openNoteIds}
        state={state}
        openNoteTab={openNoteTab}
        closeNoteTab={closeNoteTab}
        handleCreateNote={handleCreateNote}
        onHomeClick={() => setActiveTab(HOME_TAB)}
      />
      {activeTab === HOME_TAB ? (
        <HomeView
          filteredNotes={filteredNotes}
          activeNoteId={activeNoteId}
          openNoteTab={openNoteTab}
          handleCreateNote={handleCreateNote}
          handleDeleteNote={handleDeleteNote}
          handleExport={handleExport}
          handleImport={handleImport}
          selectedNotebookId={selectedNotebookId}
          isHomeMenuOpen={isHomeMenuOpen}
          setIsHomeMenuOpen={setIsHomeMenuOpen}
          search={search}
          setSearch={setSearch}
          formatNoteDate={formatNoteDate}
          createNoteSnippet={createNoteSnippet}
        />
      ) : (
        <EditorView
          selectedNote={selectedNote}
          updateNote={updateNote}
          editorRef={editorRef}
          editorShellRef={editorShellRef}
          handleEditorMouseMove={handleEditorMouseMove}
          isBlockMenuOpen={isBlockMenuOpen}
          setIsBlockMenuOpen={setIsBlockMenuOpen}
          blockInsertTarget={blockInsertTarget}
          insertBlockBelowCurrentTarget={insertBlockBelowCurrentTarget}
          blockInsertOptions={BLOCK_INSERT_OPTIONS}
          error={error}
          setError={setError}
          editorPlugins={editorPlugins}
        />
      )}
    </div>
  );
}
