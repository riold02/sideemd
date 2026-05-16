import { Home } from 'lucide-react';
import type { AppState } from '../../lib/types';

interface Props {
  activeTab: string;
  openNoteIds: string[];
  state: AppState;
  openNoteTab: (id: string) => void;
  closeNoteTab: (id: string) => void;
  handleCreateNote: () => Promise<void> | void;
  onHomeClick: () => void;
}

export default function Tabline({
  activeTab,
  openNoteIds,
  state,
  openNoteTab,
  closeNoteTab,
  handleCreateNote,
  onHomeClick,
}: Props) {
  return (
    <nav className="tabline" aria-label="Open notes">
      <button
        className={`home-tab ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onHomeClick()}
      >
        <Home
          className="home-tab-icon"
          aria-hidden="true"
          size={17}
          strokeWidth={2.2}
        />
        Home
      </button>
      {openNoteIds.map((noteId) => {
        const note = state.notes[noteId];
        if (!note) return null;
        return (
          <div
            key={noteId}
            className={`tab note-tab ${activeTab === noteId ? 'active' : ''}`}
          >
            <button
              className="tab-title"
              onClick={() => openNoteTab(noteId)}
              title={note.title}
            >
              {note.title}
            </button>
            <button
              className="tab-close"
              onClick={() => closeNoteTab(noteId)}
              aria-label={`Close ${note.title}`}
            >
              x
            </button>
          </div>
        );
      })}
      <button
        className="tab plus-tab"
        onClick={() => void handleCreateNote()}
        aria-label="Create note"
      >
        +
      </button>
    </nav>
  );
}
