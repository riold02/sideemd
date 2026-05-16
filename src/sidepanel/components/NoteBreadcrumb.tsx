import type { Note } from '../../lib/types';

interface Props {
  ancestors: Note[];
  currentTitle: string;
  onHomeClick: () => void;
  onOpenNote: (noteId: string) => void;
}

export default function NoteBreadcrumb({
  ancestors,
  currentTitle,
  onHomeClick,
  onOpenNote,
}: Props) {
  return (
    <nav className="editor-breadcrumb" aria-label="Note path">
      <button type="button" className="breadcrumb-link" onClick={onHomeClick}>
        Home
      </button>
      {ancestors.map((note) => (
        <span key={note.id} className="breadcrumb-segment">
          <span aria-hidden>&gt;</span>
          <button
            type="button"
            className="breadcrumb-link"
            onClick={() => onOpenNote(note.id)}
          >
            {note.title}
          </button>
        </span>
      ))}
      <span className="breadcrumb-segment">
        <span aria-hidden>&gt;</span>
        <span className="breadcrumb-current">{currentTitle}</span>
      </span>
    </nav>
  );
}
