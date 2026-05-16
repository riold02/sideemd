import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Home } from "lucide-react";
import {
  MDXEditor,
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

export default function App() {
  const [state, setState] = useState<AppState>(createDefaultState());
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>(HOME_TAB);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const saveTimer = useRef<number | null>(null);

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

  async function handleCreateNote() {
    const notebookId = selectedNotebookId || state.notebookOrder[0];
    if (!notebookId) {
      return;
    }

    const note = await repository.createNote(notebookId, "Untitled Note");
    patchState(await repository.getState());
    setOpenNoteIds((ids) => (ids.includes(note.id) ? ids : [...ids, note.id]));
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
            <div className="section-header">
              <h2>Notes</h2>
              <button onClick={() => void handleCreateNote()} disabled={!selectedNotebookId}>
                + Note
              </button>
            </div>

            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="search-input" />

            <ul className="note-list">
              {filteredNotes.map((note) => (
                <li key={note.id} className={openNoteIds.includes(note.id) ? "active" : ""}>
                  <button className="name" onClick={() => openNoteTab(note.id)}>
                    {note.title}
                  </button>
                  <button onClick={() => void handleDeleteNote(note.id)}>Del</button>
                </li>
              ))}
            </ul>

            <div className="footer-actions">
              <button onClick={() => void handleExport()}>Export</button>
              <label className="import-label">
                Import
                <input type="file" accept="application/json" onChange={(e) => void handleImport(e)} />
              </label>
            </div>
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

              <div className="visual-editor-shell">
                <MDXEditor
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
