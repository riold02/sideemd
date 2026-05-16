import { Home, X } from 'lucide-react';
import type { TablineActions, TablineState } from '../types';

interface Props {
  state: TablineState;
  actions: TablineActions;
}

export default function Tabline({ state, actions }: Props) {
  const { activeTab, openNoteIds, notesById } = state;
  const {
    openNoteTab,
    closeNoteTab,
    handleCreateNote,
    onHomeClick,
    onCloseSidebar,
  } = actions;

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
        const note = notesById[noteId];
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
      <span className="tabline-spacer" />
      <button
        className="icon-button"
        onClick={() => onCloseSidebar()}
        aria-label="Close sidebar"
        title="Close sidebar"
      >
        <X size={16} strokeWidth={2.2} />
      </button>
    </nav>
  );
}
