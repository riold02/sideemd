import {
  Activity,
  BookOpen,
  FileText,
  FlaskConical,
  Settings,
} from 'lucide-react';
import type { AppState } from '../../lib/types';
import {
  ACTIVITY_TAB,
  HOME_TAB,
  RESEARCH_TAB,
  SETTINGS_TAB,
} from '../editorConfig';

interface Props {
  state: AppState;
  onOpenView: (view: string) => void;
}

function topValue(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
}

export default function DashboardView({ state, onOpenView }: Props) {
  const notes = Object.values(state.notes).filter((note) => !note.deletedAt);
  const logs = state.researchLogOrder
    .map((id) => state.researchLogs[id])
    .filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = logs.filter((log) => log.researchedAt.startsWith(today));
  const topWebsite = topValue(logs.map((log) => log.website));
  const topKeyword = topValue(logs.map((log) => log.query));

  return (
    <main className="workspace-view dashboard-view">
      <header className="view-header">
        <h2>Dashboard</h2>
      </header>
      <section className="dashboard-stats" aria-label="Workspace totals">
        <article className="dashboard-stat-card">
          <FileText size={17} />
          <strong>{notes.length}</strong>
          <span>Pages</span>
        </article>
        <article className="dashboard-stat-card">
          <BookOpen size={17} />
          <strong>{notes.length}</strong>
          <span>Notes</span>
        </article>
        <article className="dashboard-stat-card">
          <FlaskConical size={17} />
          <strong>{todayLogs.length}</strong>
          <span>Tracked today</span>
        </article>
        <article className="dashboard-stat-card dashboard-summary-card">
          <span>Top site</span>
          <strong>
            {topWebsite ? `${topWebsite[0]} (${topWebsite[1]})` : '-'}
          </strong>
        </article>
        <article className="dashboard-stat-card dashboard-summary-card">
          <span>Top page</span>
          <strong>
            {topKeyword ? `${topKeyword[0]} (${topKeyword[1]})` : '-'}
          </strong>
        </article>
      </section>
      <section className="quick-actions" aria-label="Quick access">
        <div className="quick-actions-header">
          <h3>Quick actions</h3>
          <span>Open core workspace views.</span>
        </div>
        <div className="quick-action-grid">
          {[
            {
              label: 'Notes',
              icon: BookOpen,
              tab: HOME_TAB,
            },
            {
              label: 'Session Tracking',
              icon: FlaskConical,
              tab: RESEARCH_TAB,
            },
            {
              label: 'Activity',
              icon: Activity,
              tab: ACTIVITY_TAB,
            },
            {
              label: 'Settings',
              icon: Settings,
              tab: SETTINGS_TAB,
            },
          ].map(({ label, icon: Icon, tab }) => (
            <button
              key={label}
              className="quick-action-tile"
              aria-label={label}
              onClick={() => onOpenView(tab)}
            >
              <span className="quick-action-icon">
                <Icon size={18} />
              </span>
              <span className="quick-action-copy">
                <strong>{label}</strong>
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
