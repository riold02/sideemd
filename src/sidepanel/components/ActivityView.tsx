import type { ActivityEntry } from '../../lib/types';

interface Props {
  entries: ActivityEntry[];
}

const labels: Record<ActivityEntry['action'], string> = {
  'note.created': 'Created note',
  'note.updated': 'Updated note',
  'note.deleted': 'Moved note to trash',
  'note.restored': 'Restored note',
  'research.created': 'Added tracking entry',
  'research.deleted': 'Deleted tracking entry',
  'research.cleared': 'Cleared session tracking',
  'tracking.updated': 'Updated tracking settings',
};

export default function ActivityView({ entries }: Props) {
  return (
    <main className="workspace-view">
      <header className="view-header">
        <h2>Activity</h2>
      </header>
      <ol className="activity-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <time>{new Date(entry.createdAt).toLocaleString()}</time>
            <strong>{labels[entry.action]}</strong>
            <span>{entry.objectLabel}</span>
          </li>
        ))}
      </ol>
    </main>
  );
}
