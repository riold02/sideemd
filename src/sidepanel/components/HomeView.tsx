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
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  MoreVertical,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Star,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Note } from '../../lib/types';
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

interface TreeNode {
  note: Note;
  children: TreeNode[];
}

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
  const [draggedNotebookId, setDraggedNotebookId] = useState('');
  const [draggedNoteId, setDraggedNoteId] = useState('');
  const notebookRenameTimer = useRef<number | null>(null);
  const noteRenameTimer = useRef<number | null>(null);

  const searchQuery = search.trim().toLowerCase();
  const normalizedTag = noteTagFilter.trim().toLowerCase();
  const hasFilters = Boolean(searchQuery || normalizedTag);

  const visibleTree = useMemo(() => {
    function buildNode(noteId: string): TreeNode | null {
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
        .filter((node): node is TreeNode => Boolean(node));

      if (!hasFilters) {
        return { note, children };
      }

      const matchesQuery =
        !searchQuery ||
        note.title.toLowerCase().includes(searchQuery) ||
        note.contentMarkdown.toLowerCase().includes(searchQuery);
      const matchesTag =
        !normalizedTag ||
        note.tags?.some((tag) => tag.toLowerCase() === normalizedTag);

      return matchesQuery && matchesTag || children.length > 0
        ? { note, children }
        : null;
    }

    return rootNoteIds
      .map((noteId) => buildNode(noteId))
      .filter((node): node is TreeNode => Boolean(node));
  }, [
    childOrderByNote,
    hasFilters,
    normalizedTag,
    notesById,
    rootNoteIds,
    searchQuery,
    selectedNotebookId,
    showTrash,
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

  function renderTreeNode(node: TreeNode, depth: number) {
    const { note, children } = node;
    const hasAnyChildren = (childOrderByNote[note.id] ?? []).some((childId) => {
      const child = notesById[childId];
      return (
        Boolean(child) &&
        child.notebookId === selectedNotebookId &&
        Boolean(child.deletedAt) === showTrash
      );
    });
    const isCollapsed = collapsedNoteIds.includes(note.id);
    const siblingIds = siblingIdsFor(note);
    const targetIndex = siblingIds.indexOf(note.id);

    return (
      <li key={note.id} className="note-tree-node">
        <div
          className={`note-tree-row ${activeNoteId === note.id ? 'active' : ''}`}
          style={{ paddingLeft: `${depth * 18}px` }}
          draggable
          onDragStart={() => setDraggedNoteId(note.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => void handleNoteDrop(event, note, targetIndex)}
        >
          <button
            className="tree-toggle-button"
            onClick={() => toggleCollapsed(note.id)}
            aria-label={hasAnyChildren ? `${isCollapsed ? 'Expand' : 'Collapse'} ${note.title}` : `${note.title} has no subpages`}
            disabled={!hasAnyChildren}
          >
            {hasAnyChildren ? (
              isCollapsed ? (
                <ChevronRight size={14} strokeWidth={2.2} />
              ) : (
                <ChevronDown size={14} strokeWidth={2.2} />
              )
            ) : (
              <span className="tree-toggle-spacer" />
            )}
          </button>
          {editingNoteId === note.id ? (
            <form
              className="note-tree-main inline-tree-form"
              onSubmit={(event) => void submitRename(event, note.id)}
              onClick={stopInlineEvent}
              onMouseDown={stopInlineEvent}
            >
              <input
                autoFocus
                value={draftNoteTitle}
                onChange={(event) =>
                  handleNoteRenameInput(note.id, event.target.value)
                }
                onBlur={() => {
                  setEditingNoteId('');
                  setDraftNoteTitle('');
                }}
                aria-label={`Rename ${note.title}`}
              />
            </form>
          ) : (
            <button
              className="note-tree-main"
              onClick={() => openNoteTab(note.id)}
              aria-label={`Open ${note.title}`}
            >
              <FileText className="note-row-icon" size={16} strokeWidth={2.1} />
                <span className="note-row-copy">
                  <span className="note-row-title">{note.title}</span>
                  <span className="note-row-meta">{getNoteMeta(note)}</span>
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
          )}
          <span className="note-row-actions">
            {!showTrash ? (
              <>
                <button
                  className="note-tool-button"
                  onClick={() => beginSubpageCreate(note.id)}
                  aria-label={`Create page under ${note.title}`}
                >
                  <Plus size={15} strokeWidth={2.1} />
                </button>
                <button
                  className="note-tool-button"
                  onClick={() => beginNoteRename(note)}
                  aria-label={`Rename ${note.title}`}
                >
                  <Pencil size={15} strokeWidth={2.1} />
                </button>
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
                    const nextTags = window
                      .prompt(
                        'Tags separated by commas',
                        note.tags?.join(', ') ?? ''
                      )
                      ?.split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean);
                    if (nextTags) {
                      void updateNoteMetadata(note.id, { tags: nextTags });
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
        </div>

        {creatingParentId === note.id ? (
          <form
            className="inline-tree-form tree-child-form"
            style={{ marginLeft: `${depth * 18 + 28}px` }}
            onSubmit={(event) => void submitSubpage(event, note.id)}
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
            <button type="button" onClick={() => void commitSubpage(note.id)}>
              Add
            </button>
          </form>
        ) : null}

        {hasAnyChildren && !isCollapsed ? (
          <ul className="note-tree-children">
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <main className="file-browser">
      <section className="browser-column">
        <div className="home-header">
          <h2>Notes</h2>
          <div className="home-actions">
            <button
              className="primary-note-button"
              onClick={beginRootCreate}
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
          {visibleTree.map((node) => renderTreeNode(node, 0))}
        </ul>
      </section>
    </main>
  );
}
