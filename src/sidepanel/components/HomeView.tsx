import {
  FileText,
  Download,
  Upload,
  Plus,
  MoreVertical,
  Search,
  Trash2,
} from 'lucide-react';
import type {
  HomeViewActions,
  HomeViewFormatters,
  HomeViewState,
} from '../types';

interface Props {
  state: HomeViewState;
  actions: HomeViewActions;
  formatters: HomeViewFormatters;
}

export default function HomeView({ state, actions, formatters }: Props) {
  const {
    filteredNotes,
    activeNoteId,
    selectedNotebookId,
    isHomeMenuOpen,
    search,
  } = state;
  const {
    openNoteTab,
    handleCreateNote,
    handleDeleteNote,
    handleExport,
    handleImport,
    toggleHomeMenu,
    setSearch,
  } = actions;
  const { formatNoteDate, createNoteSnippet } = formatters;

  return (
    <main className="file-browser">
      <section className="browser-column">
        <div className="home-header">
          <h2>Notes</h2>
          <div className="home-actions">
            <button
              className="primary-note-button"
              onClick={() => void handleCreateNote()}
              disabled={!selectedNotebookId}
            >
              <Plus size={16} strokeWidth={2.4} />
              Note
            </button>
            <div className="home-menu">
              <button
                className="icon-button"
                onClick={toggleHomeMenu}
                aria-label="Open note actions"
              >
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
                    <input
                      type="file"
                      accept="application/json"
                      onChange={(e) => void handleImport(e)}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <label className="search-field">
          <Search size={17} strokeWidth={2.1} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="search-input"
          />
        </label>

        <ul className="note-list">
          {filteredNotes.map((note) => (
            <li
              key={note.id}
              className={activeNoteId === note.id ? 'active' : ''}
            >
              <button
                className="note-row-main"
                onClick={() => openNoteTab(note.id)}
                aria-label={`Open ${note.title}`}
              >
                <FileText
                  className="note-row-icon"
                  size={17}
                  strokeWidth={2.1}
                />
                <span className="note-row-copy">
                  <span className="note-row-title">{note.title}</span>
                  <span className="note-row-meta">
                    {formatNoteDate(note.updatedAt)} -{' '}
                    {createNoteSnippet(note.contentMarkdown)}
                  </span>
                </span>
              </button>
              <button
                className="note-delete-button"
                onClick={() => void handleDeleteNote(note.id)}
                aria-label={`Delete ${note.title}`}
              >
                <Trash2 size={16} strokeWidth={2.1} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
