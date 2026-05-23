import { LayoutDashboard, X } from 'lucide-react';
import { DASHBOARD_TAB } from '../editorConfig';
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
    onViewClick,
    onCloseSidebar,
  } = actions;

  return (
    <nav className="tabline" aria-label="Open notes">
      {[
        { id: DASHBOARD_TAB, label: 'Dashboard', icon: LayoutDashboard },
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`home-tab ${activeTab === id ? 'active' : ''}`}
          onClick={() => onViewClick(id)}
          aria-label={label}
          title={label}
        >
          <Icon size={16} strokeWidth={2.1} />
          <span>{label}</span>
        </button>
      ))}
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
              onClick={() => void closeNoteTab(noteId)}
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
