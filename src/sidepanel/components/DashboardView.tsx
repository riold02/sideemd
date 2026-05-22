import { BookOpen, FileText, FlaskConical } from 'lucide-react';
import type { AppState } from '../../lib/types';
import { HOME_TAB, RESEARCH_TAB } from '../editorConfig';

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
      <section className="metric-grid" aria-label="Workspace totals">
        <article>
          <FileText size={17} />
          <strong>{notes.length}</strong>
          <span>Pages</span>
        </article>
        <article>
          <BookOpen size={17} />
          <strong>{notes.length}</strong>
          <span>Notes</span>
        </article>
        <article>
          <FlaskConical size={17} />
          <strong>{todayLogs.length}</strong>
          <span>Research today</span>
        </article>
      </section>
      <section className="dashboard-summary">
        <div>
          <span>Top website</span>
          <strong>
            {topWebsite ? `${topWebsite[0]} (${topWebsite[1]})` : '-'}
          </strong>
        </div>
        <div>
          <span>Top keyword</span>
          <strong>
            {topKeyword ? `${topKeyword[0]} (${topKeyword[1]})` : '-'}
          </strong>
        </div>
      </section>
      <section className="quick-actions" aria-label="Quick access">
        <button onClick={() => onOpenView(HOME_TAB)}>Pages and notes</button>
        <button onClick={() => onOpenView(RESEARCH_TAB)}>Research log</button>
      </section>
    </main>
  );
}
