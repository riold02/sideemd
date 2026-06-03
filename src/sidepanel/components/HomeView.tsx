import {
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type MouseEvent,
} from 'react';
import {
  BookCopy,
  Download,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Note } from '../../lib/types';
import type {
  HomeViewActions,
  HomeViewFormatters,
  HomeViewState,
} from '../types';
import HomeNoteFilters from './HomeNoteFilters';
import HomeTreeNode, { type HomeTreeNodeData } from './HomeTreeNode';

interface Props {
  state: HomeViewState;
  actions: HomeViewActions;
  formatters: HomeViewFormatters;
}

type NoteScope = 'all' | 'pinned' | 'favorite';

function clampTitle(value: string, fallback: string) {
  return value.trim() || fallback;
}

export default function HomeView({ state, actions, formatters }: Props) {
  const {
    activeNoteId,
    selectedNotebookId,
    notebooks,
    notesById,
    rootNoteIds,
    childOrderByNote,
    isHomeMenuOpen,
    search,
    noteTagFilter,
    tags,
    showTrash,
  } = state;
  const {
    openNoteTab,
    handleCreateNote,
    handleRenameNote,
    handleMoveNote,
    handleCreateSubpage,
    handleCreateNotebook,
    handleRenameNotebook,
    handleDeleteNotebook,
    handleMoveNotebook,
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
  const [collapsedNoteIds, setCollapsedNoteIds] = useState<string[]>([]);
  const [draftNotebookName, setDraftNotebookName] = useState('');
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [editingNotebookId, setEditingNotebookId] = useState('');
  const [draftNoteTitle, setDraftNoteTitle] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');
  const [creatingParentId, setCreatingParentId] = useState<string | 'root' | null>(
    null
  );
  const [noteScope, setNoteScope] = useState<NoteScope>('all');
  const [draggedNotebookId, setDraggedNotebookId] = useState('');
  const [draggedNoteId, setDraggedNoteId] = useState('');
  const notebookRenameTimer = useRef<number | null>(null);
  const noteRenameTimer = useRef<number | null>(null);

  const searchQuery = search.trim().toLowerCase();
  const normalizedTag = noteTagFilter.trim().toLowerCase();
  const hasFilters = Boolean(searchQuery || normalizedTag);
  const hasTreeFilters = hasFilters || noteScope !== 'all';
  const selectedNotebook =
    notebooks.find((notebook) => notebook.id === selectedNotebookId) ?? null;
  const scopedNotes = Object.values(notesById).filter(
    (note) =>
      note.notebookId === selectedNotebookId &&
      Boolean(note.deletedAt) === showTrash
  );
  const pinnedCount = scopedNotes.filter((note) => note.pinned).length;
  const favoriteCount = scopedNotes.filter((note) => note.favorite).length;

  const visibleTree = useMemo(() => {
    function matchesScope(note: Note) {
      if (noteScope === 'pinned') return Boolean(note.pinned);
      if (noteScope === 'favorite') return Boolean(note.favorite);
      return true;
    }

    function buildNode(noteId: string): HomeTreeNodeData | null {
      const note = notesById[noteId];
      if (
        !note ||
        note.notebookId !== selectedNotebookId ||
        Boolean(note.deletedAt) !== showTrash
      ) {
        return null;
      }

      const children = (childOrderByNote[noteId] ?? [])
        .map((childId) => buildNode(childId))
        .filter((node): node is HomeTreeNodeData => Boolean(node));

      if (!hasTreeFilters) {
        return { note, children };
      }

      const matchesQuery =
        !searchQuery ||
        note.title.toLowerCase().includes(searchQuery) ||
        note.contentMarkdown.toLowerCase().includes(searchQuery);
      const matchesTag =
        !normalizedTag ||
        note.tags?.some((tag) => tag.toLowerCase() === normalizedTag);
      const matchesNoteScope = matchesScope(note);

      return matchesNoteScope && matchesQuery && matchesTag || children.length > 0
        ? { note, children }
        : null;
    }

    return rootNoteIds
      .map((noteId) => buildNode(noteId))
      .filter((node): node is HomeTreeNodeData => Boolean(node));
  }, [
    childOrderByNote,
    hasTreeFilters,
    normalizedTag,
    notesById,
    rootNoteIds,
    searchQuery,
    selectedNotebookId,
    showTrash,
    noteScope,
  ]);

  function toggleCollapsed(noteId: string) {
    setCollapsedNoteIds((ids) =>
      ids.includes(noteId) ? ids.filter((id) => id !== noteId) : [...ids, noteId]
    );
  }

  function beginNotebookCreate() {
    setCreatingNotebook(true);
    setEditingNotebookId('');
    setDraftNotebookName('');
  }

  function beginNotebookRename() {
    const notebook = notebooks.find((item) => item.id === selectedNotebookId);
    if (!notebook) return;
    setEditingNotebookId(notebook.id);
    setCreatingNotebook(false);
    setDraftNotebookName(notebook.name);
  }

  async function commitNotebookForm() {
    const value = clampTitle(draftNotebookName, 'Untitled Notebook');
    if (creatingNotebook) {
      await handleCreateNotebook(value);
    } else if (editingNotebookId) {
      await handleRenameNotebook(value);
    }
    setCreatingNotebook(false);
    setEditingNotebookId('');
    setDraftNotebookName('');
  }

  async function submitNotebookForm(event: FormEvent) {
    event.preventDefault();
    await commitNotebookForm();
  }

  function handleNotebookRenameInput(value: string) {
    setDraftNotebookName(value);
    if (!editingNotebookId) return;
    if (notebookRenameTimer.current) {
      window.clearTimeout(notebookRenameTimer.current);
    }
    notebookRenameTimer.current = window.setTimeout(() => {
      void handleRenameNotebook(clampTitle(value, 'Untitled Notebook'));
    }, 120);
  }

  function beginRootCreate() {
    setCreatingParentId('root');
    setEditingNoteId('');
    setDraftNoteTitle('');
  }

  function beginSubpageCreate(parentNoteId: string) {
    setCreatingParentId(parentNoteId);
    setEditingNoteId('');
    setDraftNoteTitle('');
    setCollapsedNoteIds((ids) => ids.filter((id) => id !== parentNoteId));
  }

  function beginNoteRename(note: Note) {
    setEditingNoteId(note.id);
    setCreatingParentId(null);
    setDraftNoteTitle(note.title);
  }

  async function commitRootPage() {
    await handleCreateNote(clampTitle(draftNoteTitle, 'Untitled Note'));
    setCreatingParentId(null);
    setDraftNoteTitle('');
  }

  async function submitRootPage(event: FormEvent) {
    event.preventDefault();
    await commitRootPage();
  }

  async function commitSubpage(parentNoteId: string) {
    await handleCreateSubpage(parentNoteId, clampTitle(draftNoteTitle, 'Untitled Note'));
    setCreatingParentId(null);
    setDraftNoteTitle('');
  }

  async function submitSubpage(event: FormEvent, parentNoteId: string) {
    event.preventDefault();
    await commitSubpage(parentNoteId);
  }

  async function commitRename(noteId: string) {
    await handleRenameNote(noteId, clampTitle(draftNoteTitle, 'Untitled Note'));
    setEditingNoteId('');
    setDraftNoteTitle('');
  }

  async function submitRename(event: FormEvent, noteId: string) {
    event.preventDefault();
    await commitRename(noteId);
  }

  function handleNoteRenameInput(noteId: string, value: string) {
    setDraftNoteTitle(value);
    if (noteRenameTimer.current) {
      window.clearTimeout(noteRenameTimer.current);
    }
    noteRenameTimer.current = window.setTimeout(() => {
      void handleRenameNote(noteId, clampTitle(value, 'Untitled Note'));
    }, 120);
  }

  function cancelNoteRename() {
    setEditingNoteId('');
    setDraftNoteTitle('');
  }

  function stopInlineEvent(event: MouseEvent | DragEvent | FormEvent) {
    event.stopPropagation();
  }

  function getNoteMeta(note: Note) {
    const snippet = createNoteSnippet(note.contentMarkdown);
    const parentTitle = note.parentNoteId
      ? notesById[note.parentNoteId]?.title
      : '';

    if (parentTitle) {
      if (!note.contentMarkdown.trim() || snippet === 'Untitled Note') {
        return `Page in ${parentTitle}`;
      }
      return `${parentTitle} · ${snippet}`;
    }

    if (!note.contentMarkdown.trim() || snippet === 'Untitled Note') {
      return formatNoteDate(note.updatedAt);
    }

    return `${formatNoteDate(note.updatedAt)} - ${snippet}`;
  }

  function siblingIdsFor(note: Note) {
    return note.parentNoteId
      ? childOrderByNote[note.parentNoteId] ?? []
      : visibleTree.map((node) => node.note.id);
  }

  async function handleNotebookDrop(
    event: DragEvent<HTMLButtonElement>,
    notebookId: string,
    notebookIndex: number
  ) {
    event.preventDefault();
    if (draggedNotebookId) {
      await handleMoveNotebook(draggedNotebookId, notebookIndex);
      setDraggedNotebookId('');
      return;
    }
    if (draggedNoteId) {
      await handleMoveNote(draggedNoteId, {
        notebookId,
        parentNoteId: null,
        index: 0,
      });
      setDraggedNoteId('');
    }
  }

  async function handleNoteDrop(
    event: DragEvent<HTMLDivElement>,
    note: Note,
    index: number
  ) {
    event.preventDefault();
    if (!draggedNoteId || draggedNoteId === note.id) return;

    await handleMoveNote(draggedNoteId, {
      notebookId: note.notebookId,
      parentNoteId: note.parentNoteId,
      index,
    });
    setDraggedNoteId('');
  }

  async function handleRootDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!draggedNoteId || !selectedNotebookId) return;
    await handleMoveNote(draggedNoteId, {
      notebookId: selectedNotebookId,
      parentNoteId: null,
      index: 0,
    });
    setDraggedNoteId('');
  }

  function renderNotebookChip(notebook: HomeViewState['notebooks'][number], index: number) {
    const isEditing = editingNotebookId === notebook.id;
    if (isEditing) {
      return (
        <form
          key={notebook.id}
          className="inline-rename-form"
          onSubmit={submitNotebookForm}
          onClick={stopInlineEvent}
          onMouseDown={stopInlineEvent}
        >
          <input
            autoFocus
            value={draftNotebookName}
            onChange={(event) => handleNotebookRenameInput(event.target.value)}
            onBlur={() => {
              setEditingNotebookId('');
              setDraftNotebookName('');
            }}
            aria-label="Notebook name"
          />
        </form>
      );
    }

    return (
      <button
        key={notebook.id}
        className={`notebook-chip ${selectedNotebookId === notebook.id ? 'active' : ''}`}
        onClick={() => setSelectedNotebookId(notebook.id)}
        aria-label={`Open notebook ${notebook.name}`}
        aria-pressed={selectedNotebookId === notebook.id}
        draggable
        onDragStart={() => setDraggedNotebookId(notebook.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => void handleNotebookDrop(event, notebook.id, index)}
      >
        <span className="notebook-chip-main">
          <BookCopy size={15} strokeWidth={2.1} />
          <span className="notebook-chip-name">{notebook.name}</span>
        </span>
        <span className="notebook-chip-count">{notebook.noteCount}</span>
      </button>
    );
  }

  return (
    <main className="file-browser">
      <section className="browser-column">
        <div className="home-header">
          <div className="notes-title-block">
            <h2>Notes</h2>
            <p>
              {selectedNotebook
                ? `${selectedNotebook.name} · ${visibleTree.length} root page${visibleTree.length === 1 ? '' : 's'}`
                : 'Create a notebook to start organizing pages'}
            </p>
          </div>
          <div className="home-actions">
            <button
              className="primary-note-button"
              onClick={beginRootCreate}
              disabled={!selectedNotebookId}
            >
              <Plus size={16} strokeWidth={2.4} />
              Page
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
                      onChange={(event) => void handleImport(event)}
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
                onClick={beginNotebookCreate}
                aria-label="Create notebook"
                title="Create notebook"
              >
                <Plus size={16} strokeWidth={2.3} />
              </button>
              <button
                className="icon-button compact"
                onClick={beginNotebookRename}
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
          {creatingNotebook ? (
            <form
              className="inline-rename-form"
              onSubmit={submitNotebookForm}
              onClick={stopInlineEvent}
              onMouseDown={stopInlineEvent}
            >
              <input
                autoFocus
                value={draftNotebookName}
                onChange={(event) => setDraftNotebookName(event.target.value)}
                placeholder="Notebook name"
                aria-label="Notebook name"
              />
              <button type="button" onClick={() => void commitNotebookForm()}>
                Add
              </button>
            </form>
          ) : null}
          <div className="notebook-list" role="list">
            {notebooks.map((notebook, index) => renderNotebookChip(notebook, index))}
          </div>
        </section>

        <label className="search-field">
          <Search size={17} strokeWidth={2.1} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes..."
            className="search-input"
          />
        </label>

        <HomeNoteFilters
          showTrash={showTrash}
          noteScope={noteScope}
          pinnedCount={pinnedCount}
          favoriteCount={favoriteCount}
          noteTagFilter={noteTagFilter}
          tags={tags}
          onShowTrashChange={setShowTrash}
          onNoteScopeChange={setNoteScope}
          onTagFilterChange={setNoteTagFilter}
        />

        {creatingParentId === 'root' ? (
          <form
            className="inline-tree-form root-page-form"
            onSubmit={submitRootPage}
            onClick={stopInlineEvent}
            onMouseDown={stopInlineEvent}
          >
            <input
              autoFocus
              value={draftNoteTitle}
              onChange={(event) => setDraftNoteTitle(event.target.value)}
              placeholder="Page title"
              aria-label="Page title"
            />
            <button type="button" onClick={() => void commitRootPage()}>
              Add
            </button>
          </form>
        ) : null}

        <div
          className="tree-root-dropzone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => void handleRootDrop(event)}
        >
          Drop here to move a page to the notebook root
        </div>

        <ul className="note-tree">
          {visibleTree.length > 0 ? (
            visibleTree.map((node) => (
              <HomeTreeNode
                key={node.note.id}
                node={node}
                depth={0}
                activeNoteId={activeNoteId}
                selectedNotebookId={selectedNotebookId}
                showTrash={showTrash}
                childOrderByNote={childOrderByNote}
                notesById={notesById}
                collapsedNoteIds={collapsedNoteIds}
                editingNoteId={editingNoteId}
                creatingParentId={creatingParentId}
                draftNoteTitle={draftNoteTitle}
                getNoteMeta={getNoteMeta}
                siblingIdsFor={siblingIdsFor}
                onToggleCollapsed={toggleCollapsed}
                onOpenNote={openNoteTab}
                onDragStart={setDraggedNoteId}
                onNoteDrop={handleNoteDrop}
                onBeginSubpageCreate={beginSubpageCreate}
                onBeginNoteRename={beginNoteRename}
                onRenameInput={handleNoteRenameInput}
                onRenameSubmit={submitRename}
                onCancelRename={cancelNoteRename}
                onDeleteNote={(noteId) => void handleDeleteNote(noteId)}
                onRestoreNote={(noteId) => void handleRestoreNote(noteId)}
                onUpdateMetadata={(noteId, updates) =>
                  void updateNoteMetadata(noteId, updates)
                }
                onSubpageInput={setDraftNoteTitle}
                onSubpageSubmit={submitSubpage}
                onCommitSubpage={(noteId) => void commitSubpage(noteId)}
                onStopInlineEvent={stopInlineEvent}
              />
            ))
          ) : (
            <li className="list-empty-state">
              {showTrash
                ? 'Trash is empty.'
                : hasTreeFilters
                  ? 'No pages match the current filters.'
                  : 'No pages in this notebook yet.'}
            </li>
          )}
        </ul>
      </section>
    </main>
  );
}
