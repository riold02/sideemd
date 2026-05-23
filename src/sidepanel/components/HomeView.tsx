import {
  BookCopy,
  FileText,
  Download,
  Upload,
  Plus,
  MoreVertical,
  Pencil,
  Pin,
  RotateCcw,
  Search,
  Star,
  Tag,
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
    notebooks,
    isHomeMenuOpen,
    search,
    noteTagFilter,
    tags,
    showTrash,
  } = state;
  const {
    openNoteTab,
    handleCreateNote,
    handleCreateNotebook,
    handleRenameNotebook,
    handleDeleteNotebook,
    handleDeleteNote,
    handleRestoreNote,
    updateNoteMetadata,
    handleExport,
    handleImport,
    toggleHomeMenu,
    setSelectedNotebookId,
    setSearch,
    setNoteTagFilter,
    setShowTrash,
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

        <section className="notebook-panel" aria-label="Notebooks">
          <div className="section-header">
            <h2>Notebooks</h2>
            <div className="home-actions">
              <button
                className="icon-button compact"
                onClick={() => void handleCreateNotebook()}
                aria-label="Create notebook"
                title="Create notebook"
              >
                <Plus size={16} strokeWidth={2.3} />
              </button>
              <button
                className="icon-button compact"
                onClick={() => void handleRenameNotebook()}
                aria-label="Rename selected notebook"
                title="Rename selected notebook"
                disabled={!selectedNotebookId}
              >
                <Pencil size={15} strokeWidth={2.2} />
              </button>
              <button
                className="icon-button compact"
                onClick={() => void handleDeleteNotebook()}
                aria-label="Delete selected notebook"
                title="Delete selected notebook"
                disabled={!selectedNotebookId}
              >
                <Trash2 size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
          <div className="notebook-list" role="list">
            {notebooks.map((notebook) => (
              <button
                key={notebook.id}
                className={`notebook-chip ${selectedNotebookId === notebook.id ? 'active' : ''}`}
                onClick={() => setSelectedNotebookId(notebook.id)}
                aria-label={`Open notebook ${notebook.name}`}
                aria-pressed={selectedNotebookId === notebook.id}
              >
                <span className="notebook-chip-main">
                  <BookCopy size={15} strokeWidth={2.1} />
                  <span className="notebook-chip-name">{notebook.name}</span>
                </span>
                <span className="notebook-chip-count">{notebook.noteCount}</span>
              </button>
            ))}
          </div>
        </section>

        <label className="search-field">
          <Search size={17} strokeWidth={2.1} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="search-input"
          />
        </label>

        <div className="note-filter-row">
          <div className="segmented-control" aria-label="Note visibility">
            <button
              className={!showTrash ? 'active' : ''}
              onClick={() => setShowTrash(false)}
            >
              Active
            </button>
            <button
              className={showTrash ? 'active' : ''}
              onClick={() => setShowTrash(true)}
            >
              Trash
            </button>
          </div>
          <select
            aria-label="Filter notes by tag"
            value={noteTagFilter}
            onChange={(event) => setNoteTagFilter(event.target.value)}
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

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
                  {note.tags?.length ? (
                    <span className="tag-row">
                      {note.tags.map((tag) => (
                        <span className="tag-chip" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </button>
              <span className="note-row-actions">
                {!showTrash ? (
                  <>
                    <button
                      className={`note-tool-button ${note.pinned ? 'active' : ''}`}
                      onClick={() =>
                        void updateNoteMetadata(note.id, {
                          pinned: !note.pinned,
                        })
                      }
                      aria-label={`${note.pinned ? 'Unpin' : 'Pin'} ${note.title}`}
                    >
                      <Pin size={15} strokeWidth={2.1} />
                    </button>
                    <button
                      className={`note-tool-button ${note.favorite ? 'active' : ''}`}
                      onClick={() =>
                        void updateNoteMetadata(note.id, {
                          favorite: !note.favorite,
                        })
                      }
                      aria-label={`${note.favorite ? 'Unfavorite' : 'Favorite'} ${note.title}`}
                    >
                      <Star size={15} strokeWidth={2.1} />
                    </button>
                    <button
                      className="note-tool-button"
                      onClick={() => {
                        const tags = window
                          .prompt(
                            'Tags separated by commas',
                            note.tags?.join(', ') ?? ''
                          )
                          ?.split(',')
                          .map((tag) => tag.trim())
                          .filter(Boolean);
                        if (tags) {
                          void updateNoteMetadata(note.id, { tags });
                        }
                      }}
                      aria-label={`Tag ${note.title}`}
                    >
                      <Tag size={15} strokeWidth={2.1} />
                    </button>
                    <button
                      className="note-delete-button"
                      onClick={() => void handleDeleteNote(note.id)}
                      aria-label={`Delete ${note.title}`}
                    >
                      <Trash2 size={16} strokeWidth={2.1} />
                    </button>
                  </>
                ) : (
                  <button
                    className="note-tool-button"
                    onClick={() => void handleRestoreNote(note.id)}
                    aria-label={`Restore ${note.title}`}
                  >
                    <RotateCcw size={16} strokeWidth={2.1} />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
