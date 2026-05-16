import { ChevronRight, Plus } from 'lucide-react';
import type { Note } from '../../lib/types';
import { createNoteSnippet, formatNoteDate } from '../utils/markdown';

interface Props {
  subnotes: Note[];
  onOpenSubnote: (noteId: string) => void;
  onCreateSubnote: () => void;
}

export default function SubnotesPanel({
  subnotes,
  onOpenSubnote,
  onCreateSubnote,
}: Props) {
  return (
    <section className="subnotes-panel" aria-label="Subnotes">
      <div className="subnotes-header">
        <h3>Subnotes</h3>
        <button
          type="button"
          className="subnote-create-button"
          onClick={onCreateSubnote}
        >
          <Plus size={14} strokeWidth={2.4} />
          Subnote
        </button>
      </div>
      {subnotes.length === 0 ? (
        <p className="subnotes-empty">No subnotes yet.</p>
      ) : (
        <ul className="subnotes-list">
          {subnotes.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                className="subnote-row"
                onClick={() => onOpenSubnote(note.id)}
              >
                <span className="subnote-row-copy">
                  <span className="subnote-row-title">{note.title}</span>
                  <span className="subnote-row-meta">
                    {formatNoteDate(note.updatedAt)} —{' '}
                    {createNoteSnippet(note.contentMarkdown)}
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={2.2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
