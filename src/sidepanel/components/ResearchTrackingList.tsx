import { Trash2 } from 'lucide-react';
import type { ResearchLog } from '../../lib/types';
import type { TrackingDayGroup } from './researchTracking';
import {
  formatTrackingDateHeading,
  formatTrackingTime,
} from './researchTracking';

interface Props {
  groupedLogs: TrackingDayGroup[];
  onDeleteLog: (id: string) => Promise<void>;
}

export default function ResearchTrackingList({
  groupedLogs,
  onDeleteLog,
}: Props) {
  return (
    <div className="research-list">
      {groupedLogs.length === 0 ? (
        <div className="list-empty-state">
          No tracked browser history for the current filters.
        </div>
      ) : (
        groupedLogs.map((day) => (
          <section className="tracking-day" key={day.date}>
            <h3>{formatTrackingDateHeading(day.date)}</h3>
            {day.sessions.map((session) => (
              <article className="tracking-session" key={session.id}>
                <header>
                  <strong>
                    Session {formatTrackingTime(session.start)} -{' '}
                    {formatTrackingTime(session.end)}
                  </strong>
                  <span>{session.logs.length} entries</span>
                </header>
                <ul>
                  {session.logs.map((log) => (
                    <TrackingLogRow
                      key={log.id}
                      log={log}
                      onDeleteLog={onDeleteLog}
                    />
                  ))}
                </ul>
              </article>
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function TrackingLogRow({
  log,
  onDeleteLog,
}: {
  log: ResearchLog;
  onDeleteLog: (id: string) => Promise<void>;
}) {
  return (
    <li>
      <time>{formatTrackingTime(log.researchedAt)}</time>
      <strong>{log.pageTitle || log.query}</strong>
      <span>{log.website}</span>
      <a href={log.url} target="_blank" rel="noreferrer">
        {log.url || '-'}
      </a>
      {log.personalNote ? <p>{log.personalNote}</p> : null}
      <button
        className="icon-button compact"
        onClick={() => void onDeleteLog(log.id)}
        aria-label={`Delete tracking entry ${log.query}`}
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}
