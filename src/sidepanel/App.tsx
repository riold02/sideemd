import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent } from "react";
import { Download, FileText, Home, MoreVertical, Plus, Search, Trash2, Upload } from "lucide-react";
import {
  MDXEditor,
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
  thematicBreakPlugin
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { ChromeStorageRepository } from "../lib/storage";
import { AppState, Note } from "../lib/types";
import { createDefaultState } from "../lib/state";
import { mergeImportedState, parseImport, replaceImportedState, serializeState } from "../lib/importExport";

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
  codeBlockPlugin({ defaultCodeBlockLanguage: "txt" }),
  codeMirrorPlugin({
    codeBlockLanguages: {
      txt: "Plain text",
      ts: "TypeScript",
      tsx: "TSX",
      js: "JavaScript",
      jsx: "JSX",
      json: "JSON",
      md: "Markdown",
      bash: "Bash"
    }
  }),
  markdownShortcutPlugin()
];

const HOME_TAB = "home";
const BLOCK_INSERT_OPTIONS = [
  { label: "Paragraph", markdown: "New paragraph" },
  { label: "Heading 1", markdown: "# New heading" },
  { label: "Heading 2", markdown: "## New heading" },
  { label: "Bulleted list", markdown: "- New item" },
  { label: "Numbered list", markdown: "1. New item" },
  { label: "Task", markdown: "- [ ] New task" },
  { label: "Quote", markdown: "> New quote" },
  { label: "Code block", markdown: "```txt\nNew code\n```" },
  { label: "Table", markdown: "| Column | Value |\n| --- | --- |\n| Item | Detail |" },
  { label: "Divider", markdown: "---" }
];

interface BlockInsertTarget {
  top: number;
  signature: string;
}

function normalizeBlockText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isEditableBlockElement(element: Element): boolean {
  return ["P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "BLOCKQUOTE", "PRE", "TABLE", "HR"].includes(element.tagName);
}

function markdownLineMatchesBlock(line: string, signature: string): boolean {
  const normalizedLine = normalizeBlockText(line.replace(/^#{1,6}\s+/, "").replace(/^>\s?/, "").replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "").replace(/^- \[[ xX]\]\s+/, ""));

  return normalizedLine.length > 0 && (normalizedLine === signature || normalizedLine.includes(signature) || signature.includes(normalizedLine));
}

function insertMarkdownAfterBlock(markdown: string, signature: string, blockMarkdown: string): string {
  const insertText = `\n\n${blockMarkdown}\n`;
  const lines = markdown.split("\n");
  const matchIndex = lines.findIndex((line) => markdownLineMatchesBlock(line, signature));

  if (matchIndex === -1) {
    return `${markdown.trimEnd()}${insertText}`;
  }

  const nextLines = [...lines];
  nextLines.splice(matchIndex + 1, 0, "", blockMarkdown);
  return nextLines.join("\n");
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, " code sample ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[`*_~>#|[\]-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createNoteSnippet(markdown: string): string {
  const text = stripMarkdown(markdown);
  return text.length > 72 ? `${text.slice(0, 72).trim()}...` : text || "No content yet";
}

function formatNoteDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

export default function App() {
  const [state, setState] = useState<AppState>(createDefaultState());
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>(HOME_TAB);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [activeNoteId, setActiveNoteId] = useState<string>("");
  const [isHomeMenuOpen, setIsHomeMenuOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const editorRef = useRef<MDXEditorMethods>(null);
  const editorShellRef = useRef<HTMLDivElement>(null);
  const [blockInsertTarget, setBlockInsertTarget] = useState<BlockInsertTarget | null>(null);
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false);

  useEffect(() => {
    async function loadState() {
      try {
        const loaded = await repository.getState();
        setState(loaded);
        const firstNotebookId = loaded.notebookOrder[0] ?? "";
        setSelectedNotebookId(firstNotebookId);
        setActiveTab(HOME_TAB);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load notes");
      } finally {
        setLoading(false);
      }
    }

    void loadState();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(() => {
      void repository.saveState(state);
    }, 350);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [state, loading]);

  const selectedNote = activeTab === HOME_TAB ? null : (state.notes[activeTab] ?? null);

  const currentNoteIds = selectedNotebookId ? state.noteOrderByNotebook[selectedNotebookId] ?? [] : [];
  const currentNotes = currentNoteIds.map((id) => state.notes[id]).filter(Boolean);
  const allNotes = Object.values(state.notes);

  const filteredNotes = useMemo(() => {
    if (!search.trim()) {
      return currentNotes;
    }

    const q = search.toLowerCase();
    return allNotes.filter((note) => note.title.toLowerCase().includes(q) || note.contentMarkdown.toLowerCase().includes(q));
  }, [currentNotes, allNotes, search]);

  function patchState(next: AppState) {
    setState(next);
  }

  function openNoteTab(noteId: string) {
    const note = state.notes[noteId];
    if (!note) {
      return;
    }

    setOpenNoteIds((ids) => (ids.includes(noteId) ? ids : [...ids, noteId]));
    setSelectedNotebookId(note.notebookId);
    setActiveNoteId(noteId);
    setActiveTab(noteId);
  }

  function closeNoteTab(noteId: string) {
    setOpenNoteIds((ids) => ids.filter((id) => id !== noteId));
    if (activeTab === noteId) {
      setActiveTab(HOME_TAB);
    }
  }

  function syncOpenTabs(next: AppState) {
    setOpenNoteIds((ids) => ids.filter((id) => Boolean(next.notes[id])));
    if (activeTab !== HOME_TAB && !next.notes[activeTab]) {
      setActiveTab(HOME_TAB);
    }
  }

  function updateNote(noteId: string, updates: Partial<Pick<Note, "title" | "contentMarkdown">>) {
    const existing = state.notes[noteId];
    if (!existing) {
      return;
    }

    patchState({
      ...state,
      notes: {
        ...state.notes,
        [noteId]: {
          ...existing,
          ...updates,
          title: (updates.title ?? existing.title).trim() || "Untitled Note",
          updatedAt: new Date().toISOString()
        }
      }
    });
  }

  function handleEditorMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    const shell = editorShellRef.current;
    if (!shell) {
      return;
    }

    const targetElement = event.target instanceof Element ? event.target.closest("p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,table,hr") : null;
    if (!targetElement || !shell.contains(targetElement) || !isEditableBlockElement(targetElement)) {
      if (!isBlockMenuOpen) {
        setBlockInsertTarget(null);
      }
      return;
    }

    const signature = normalizeBlockText(targetElement.textContent ?? targetElement.tagName.toLowerCase());
    if (!signature) {
      return;
    }

    const shellRect = shell.getBoundingClientRect();
    const blockRect = targetElement.getBoundingClientRect();
    setBlockInsertTarget({
      top: blockRect.top - shellRect.top + blockRect.height / 2,
      signature
    });
  }

  function insertBlockBelowCurrentTarget(markdown: string) {
    if (!selectedNote || !blockInsertTarget) {
      return;
    }

    const nextMarkdown = insertMarkdownAfterBlock(selectedNote.contentMarkdown, blockInsertTarget.signature, markdown);
    updateNote(selectedNote.id, { contentMarkdown: nextMarkdown });
    editorRef.current?.setMarkdown(nextMarkdown);
    setIsBlockMenuOpen(false);
  }

  async function handleCreateNote() {
    const notebookId = selectedNotebookId || state.notebookOrder[0];
    if (!notebookId) {
      return;
    }

    const note = await repository.createNote(notebookId, "Untitled Note");
    patchState(await repository.getState());
    setOpenNoteIds((ids) => (ids.includes(note.id) ? ids : [...ids, note.id]));
    setActiveNoteId(note.id);
    setActiveTab(note.id);
  }

  async function handleDeleteNote(noteId: string) {
    if (!window.confirm("Delete note?")) {
      return;
    }

    await repository.deleteNote(noteId);
    const next = await repository.getState();
    patchState(next);
    syncOpenTabs(next);
  }

  async function handleExport() {
    const payload = serializeState(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mdside-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const payload = parseImport(text);
      const mode = window.confirm("Import mode: OK = Merge, Cancel = Replace") ? "merge" : "replace";

      const next = mode === "merge" ? mergeImportedState(state, payload) : replaceImportedState(payload);
      patchState(next);
      await repository.saveState(next);

      const firstNotebookId = next.notebookOrder[0] ?? "";
      setSelectedNotebookId(firstNotebookId);
      syncOpenTabs(next);
      setActiveTab(HOME_TAB);
      setIsHomeMenuOpen(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      event.target.value = "";
    }
  }

  if (loading) {
    return <div className="loading">Loading notes...</div>;
  }

  return (
    <div className="app-shell" data-color-mode="light">
      <nav className="tabline" aria-label="Open notes">
        <button className={`home-tab ${activeTab === HOME_TAB ? "active" : ""}`} onClick={() => setActiveTab(HOME_TAB)}>
          <Home className="home-tab-icon" aria-hidden="true" size={17} strokeWidth={2.2} />
          Home
        </button>
        {openNoteIds.map((noteId) => {
          const note = state.notes[noteId];
          if (!note) {
            return null;
          }

          return (
            <div key={noteId} className={`tab note-tab ${activeTab === noteId ? "active" : ""}`}>
              <button className="tab-title" onClick={() => openNoteTab(noteId)} title={note.title}>
                {note.title}
              </button>
              <button className="tab-close" onClick={() => closeNoteTab(noteId)} aria-label={`Close ${note.title}`}>
                x
              </button>
            </div>
          );
        })}
        <button className="tab plus-tab" onClick={() => void handleCreateNote()} aria-label="Create note">
          +
        </button>
      </nav>

      {activeTab === HOME_TAB ? (
        <main className="file-browser">
          <section className="browser-column">
            <div className="home-header">
              <h2>Notes</h2>
              <div className="home-actions">
                <button className="primary-note-button" onClick={() => void handleCreateNote()} disabled={!selectedNotebookId}>
                  <Plus size={16} strokeWidth={2.4} />
                  Note
                </button>
                <div className="home-menu">
                  <button className="icon-button" onClick={() => setIsHomeMenuOpen((isOpen) => !isOpen)} aria-label="Open note actions">
                    <MoreVertical size={18} strokeWidth={2.2} />
                  </button>
                  {isHomeMenuOpen ? (
                    <div className="home-menu-panel" role="menu">
                      <button onClick={() => void handleExport()} role="menuitem">
                        <Download size={16} strokeWidth={2.2} />
                        Export
                      </button>
                      <label role="menuitem">
                        <Upload size={16} strokeWidth={2.2} />
                        Import
                        <input type="file" accept="application/json" onChange={(e) => void handleImport(e)} />
                      </label>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <label className="search-field">
              <Search size={17} strokeWidth={2.1} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="search-input" />
            </label>

            <ul className="note-list">
              {filteredNotes.map((note) => (
                <li key={note.id} className={activeNoteId === note.id ? "active" : ""}>
                  <button className="note-row-main" onClick={() => openNoteTab(note.id)} aria-label={`Open ${note.title}`}>
                    <FileText className="note-row-icon" size={17} strokeWidth={2.1} />
                    <span className="note-row-copy">
                      <span className="note-row-title">{note.title}</span>
                      <span className="note-row-meta">
                        {formatNoteDate(note.updatedAt)} - {createNoteSnippet(note.contentMarkdown)}
                      </span>
                    </span>
                  </button>
                  <button className="note-delete-button" onClick={() => void handleDeleteNote(note.id)} aria-label={`Delete ${note.title}`}>
                    <Trash2 size={16} strokeWidth={2.1} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </main>
      ) : (
        <main className="editor-area">
          {selectedNote ? (
            <>
              <input
                className="title-input"
                value={selectedNote.title}
                onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
                placeholder="Note title"
              />

              <div
                className="visual-editor-shell"
                ref={editorShellRef}
                onMouseMove={handleEditorMouseMove}
                onMouseLeave={() => {
                  if (!isBlockMenuOpen) {
                    setBlockInsertTarget(null);
                  }
                }}
              >
                {blockInsertTarget ? (
                  <div className="block-insert-control" style={{ top: blockInsertTarget.top }}>
                    <button
                      className="block-insert-button"
                      onClick={() => setIsBlockMenuOpen((isOpen) => !isOpen)}
                      aria-label="Insert block below"
                      type="button"
                    >
                      <Plus size={16} strokeWidth={2.3} />
                    </button>
                    {isBlockMenuOpen ? (
                      <div className="block-insert-menu" role="menu">
                        {BLOCK_INSERT_OPTIONS.map((option) => (
                          <button key={option.label} type="button" onClick={() => insertBlockBelowCurrentTarget(option.markdown)} role="menuitem">
                            {option.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <MDXEditor
                  ref={editorRef}
                  key={selectedNote.id}
                  markdown={selectedNote.contentMarkdown}
                  onChange={(markdown) => updateNote(selectedNote.id, { contentMarkdown: markdown })}
                  onError={({ error }) => setError(error)}
                  placeholder="Write your note..."
                  plugins={editorPlugins}
                  className="visual-editor"
                  contentEditableClassName="visual-editor-content"
                />
              </div>
            </>
          ) : (
            <div className="empty">Create or select a note to start writing.</div>
          )}

          {error ? <div className="error">{error}</div> : null}
        </main>
      )}
    </div>
  );
}
