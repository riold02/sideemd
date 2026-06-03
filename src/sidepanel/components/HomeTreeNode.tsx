import {
  ChevronDown,
  ChevronRight,
  FileText,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  Star,
  Tag,
  Trash2,
} from 'lucide-react';
import type { DragEvent, FormEvent, MouseEvent } from 'react';
import type { Note } from '../../lib/types';

export interface HomeTreeNodeData {
  note: Note;
  children: HomeTreeNodeData[];
}

interface Props {
  node: HomeTreeNodeData;
  depth: number;
  activeNoteId: string;
  selectedNotebookId: string;
  showTrash: boolean;
  childOrderByNote: Record<string, string[]>;
  notesById: Record<string, Note>;
  collapsedNoteIds: string[];
  editingNoteId: string;
  creatingParentId: string | 'root' | null;
  draftNoteTitle: string;
  getNoteMeta: (note: Note) => string;
  siblingIdsFor: (note: Note) => string[];
  onToggleCollapsed: (noteId: string) => void;
  onOpenNote: (noteId: string) => void;
  onDragStart: (noteId: string) => void;
  onNoteDrop: (event: DragEvent<HTMLDivElement>, note: Note, index: number) => void;
  onBeginSubpageCreate: (noteId: string) => void;
  onBeginNoteRename: (note: Note) => void;
  onRenameInput: (noteId: string, value: string) => void;
  onRenameSubmit: (event: FormEvent, noteId: string) => void;
  onCancelRename: () => void;
  onDeleteNote: (noteId: string) => void;
  onRestoreNote: (noteId: string) => void;
  onUpdateMetadata: (
    noteId: string,
    updates: Partial<Pick<Note, 'tags' | 'pinned' | 'favorite'>>
  ) => void;
  onSubpageInput: (value: string) => void;
  onSubpageSubmit: (event: FormEvent, noteId: string) => void;
  onCommitSubpage: (noteId: string) => void;
  onStopInlineEvent: (event: MouseEvent | DragEvent | FormEvent) => void;
}

export default function HomeTreeNode({
  node,
  depth,
  activeNoteId,
  selectedNotebookId,
  showTrash,
  childOrderByNote,
  notesById,
  collapsedNoteIds,
  editingNoteId,
  creatingParentId,
  draftNoteTitle,
  getNoteMeta,
  siblingIdsFor,
  onToggleCollapsed,
  onOpenNote,
  onDragStart,
  onNoteDrop,
  onBeginSubpageCreate,
  onBeginNoteRename,
  onRenameInput,
  onRenameSubmit,
  onCancelRename,
  onDeleteNote,
  onRestoreNote,
  onUpdateMetadata,
  onSubpageInput,
  onSubpageSubmit,
  onCommitSubpage,
  onStopInlineEvent,
}: Props) {
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
    <li className="note-tree-node">
      <div
        className={`note-tree-row ${activeNoteId === note.id ? 'active' : ''}`}
        style={{ paddingLeft: `${depth * 18}px` }}
        draggable
        onDragStart={() => onDragStart(note.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => void onNoteDrop(event, note, targetIndex)}
      >
        <button
          className="tree-toggle-button"
          onClick={() => onToggleCollapsed(note.id)}
          aria-label={
            hasAnyChildren
              ? `${isCollapsed ? 'Expand' : 'Collapse'} ${note.title}`
              : `${note.title} has no subpages`
          }
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
            onSubmit={(event) => void onRenameSubmit(event, note.id)}
            onClick={onStopInlineEvent}
            onMouseDown={onStopInlineEvent}
          >
            <input
              autoFocus
              value={draftNoteTitle}
              onChange={(event) => onRenameInput(note.id, event.target.value)}
              onBlur={onCancelRename}
              aria-label={`Rename ${note.title}`}
            />
          </form>
        ) : (
          <button
            className="note-tree-main"
            onClick={() => onOpenNote(note.id)}
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
                onClick={() => onBeginSubpageCreate(note.id)}
                aria-label={`Create page under ${note.title}`}
              >
                <Plus size={15} strokeWidth={2.1} />
              </button>
              <button
                className="note-tool-button"
                onClick={() => onBeginNoteRename(note)}
                aria-label={`Rename ${note.title}`}
              >
                <Pencil size={15} strokeWidth={2.1} />
              </button>
              <button
                className={`note-tool-button ${note.pinned ? 'active' : ''}`}
                onClick={() =>
                  onUpdateMetadata(note.id, { pinned: !note.pinned })
                }
                aria-label={`${note.pinned ? 'Unpin' : 'Pin'} ${note.title}`}
              >
                <Pin size={15} strokeWidth={2.1} />
              </button>
              <button
                className={`note-tool-button ${note.favorite ? 'active' : ''}`}
                onClick={() =>
                  onUpdateMetadata(note.id, { favorite: !note.favorite })
                }
                aria-label={`${note.favorite ? 'Unfavorite' : 'Favorite'} ${note.title}`}
              >
                <Star size={15} strokeWidth={2.1} />
              </button>
              <button
                className="note-tool-button"
                onClick={() => {
                  const nextTags = window
                    .prompt('Tags separated by commas', note.tags?.join(', ') ?? '')
                    ?.split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean);
                  if (nextTags) {
                    onUpdateMetadata(note.id, { tags: nextTags });
                  }
                }}
                aria-label={`Tag ${note.title}`}
              >
                <Tag size={15} strokeWidth={2.1} />
              </button>
              <button
                className="note-delete-button"
                onClick={() => onDeleteNote(note.id)}
                aria-label={`Delete ${note.title}`}
              >
                <Trash2 size={16} strokeWidth={2.1} />
              </button>
            </>
          ) : (
            <button
              className="note-tool-button"
              onClick={() => onRestoreNote(note.id)}
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
          onSubmit={(event) => void onSubpageSubmit(event, note.id)}
          onClick={onStopInlineEvent}
          onMouseDown={onStopInlineEvent}
        >
          <input
            autoFocus
            value={draftNoteTitle}
            onChange={(event) => onSubpageInput(event.target.value)}
            placeholder="Page title"
            aria-label="Page title"
          />
          <button type="button" onClick={() => onCommitSubpage(note.id)}>
            Add
          </button>
        </form>
      ) : null}

      {hasAnyChildren && !isCollapsed ? (
        <ul className="note-tree-children">
          {children.map((child) => (
            <HomeTreeNode
              key={child.note.id}
              node={child}
              depth={depth + 1}
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
              onToggleCollapsed={onToggleCollapsed}
              onOpenNote={onOpenNote}
              onDragStart={onDragStart}
              onNoteDrop={onNoteDrop}
              onBeginSubpageCreate={onBeginSubpageCreate}
              onBeginNoteRename={onBeginNoteRename}
              onRenameInput={onRenameInput}
              onRenameSubmit={onRenameSubmit}
              onCancelRename={onCancelRename}
              onDeleteNote={onDeleteNote}
              onRestoreNote={onRestoreNote}
              onUpdateMetadata={onUpdateMetadata}
              onSubpageInput={onSubpageInput}
              onSubpageSubmit={onSubpageSubmit}
              onCommitSubpage={onCommitSubpage}
              onStopInlineEvent={onStopInlineEvent}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
