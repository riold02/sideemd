import { Download, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ResearchLog } from '../../lib/types';

interface Props {
  logs: ResearchLog[];
  onCreateLog: (
    input: Omit<ResearchLog, 'id' | 'researchedAt'>
  ) => Promise<ResearchLog>;
  onDeleteLog: (id: string) => Promise<void>;
  onClearLogs: () => Promise<void>;
  onExport: (format: 'csv' | 'json') => void;
}

const emptyDraft = {
  query: '',
  website: '',
  url: '',
  pageTitle: '',
  personalNote: '',
};

const SESSION_GAP_MS = 30 * 60 * 1000;

interface TrackingSession {
  id: string;
  start: string;
  end: string;
  logs: ResearchLog[];
}

function formatDateHeading(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupLogsByDayAndSession(logs: ResearchLog[]) {
  const byDate = new Map<string, TrackingSession[]>();
  const orderedLogs = [...logs].sort(
    (left, right) =>
      Date.parse(left.researchedAt) - Date.parse(right.researchedAt)
  );

  for (const log of orderedLogs) {
    const date = log.researchedAt.slice(0, 10);
    const sessions = byDate.get(date) ?? [];
    const previousSession = sessions[sessions.length - 1];
    const previousLog =
      previousSession?.logs[previousSession.logs.length - 1] ?? null;
    const shouldStartSession =
      !previousLog ||
      Date.parse(log.researchedAt) - Date.parse(previousLog.researchedAt) >
        SESSION_GAP_MS;

    if (shouldStartSession) {
      sessions.push({
        id: `${date}-${sessions.length + 1}`,
        start: log.researchedAt,
        end: log.researchedAt,
        logs: [log],
      });
      byDate.set(date, sessions);
      continue;
    }

    previousSession.logs.push(log);
    previousSession.end = log.researchedAt;
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, sessions]) => ({
      date,
      sessions: [...sessions].reverse().map((session, index) => ({
        ...session,
        id: `${date}-${sessions.length - index}`,
        logs: [...session.logs].reverse(),
      })),
    }));
}

export default function ResearchView({
  logs,
  onCreateLog,
  onDeleteLog,
  onClearLogs,
  onExport,
}: Props) {
  const [draft, setDraft] = useState(emptyDraft);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [website, setWebsite] = useState('');
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const websites = [...new Set(logs.map((log) => log.website).filter(Boolean))];

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return logs.filter((log) => {
      return (
        (!date || log.researchedAt.startsWith(date)) &&
        (!website || log.website === website) &&
        (!keyword ||
          [log.query, log.website, log.url, log.pageTitle, log.personalNote]
            .join(' ')
            .toLowerCase()
            .includes(keyword))
      );
    });
  }, [date, logs, search, website]);
  const groupedLogs = useMemo(
    () => groupLogsByDayAndSession(filteredLogs),
    [filteredLogs]
  );

  return (
    <main className="workspace-view">
      <header className="view-header research-header">
        <h2>Session Tracking</h2>
        <div className="view-actions">
          <button
            aria-expanded={manualEntryOpen}
            onClick={() => setManualEntryOpen((open) => !open)}
          >
            <Plus size={15} /> Manual
          </button>
          <button onClick={() => onExport('csv')}>
            <Download size={15} /> CSV
          </button>
          <button onClick={() => onExport('json')}>
            <Download size={15} /> JSON
          </button>
          <button onClick={() => void onClearLogs()}>Clear</button>
        </div>
      </header>
      {manualEntryOpen ? (
        <form
          className="research-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draft.query.trim() || !draft.website.trim()) return;
            void onCreateLog(draft).then(() => {
              setDraft(emptyDraft);
              setManualEntryOpen(false);
            });
          }}
        >
          <input
            aria-label="Tracking title"
            placeholder="Page title or session note"
            value={draft.query}
            onChange={(event) =>
              setDraft({ ...draft, query: event.target.value })
            }
          />
          <input
            aria-label="Tracking website"
            placeholder="Website"
            value={draft.website}
            onChange={(event) =>
              setDraft({ ...draft, website: event.target.value })
            }
          />
          <input
            aria-label="Tracking URL"
            placeholder="URL"
            value={draft.url}
            onChange={(event) =>
              setDraft({ ...draft, url: event.target.value })
            }
          />
          <input
            aria-label="Tracking page title"
            placeholder="Page title"
            value={draft.pageTitle}
            onChange={(event) =>
              setDraft({ ...draft, pageTitle: event.target.value })
            }
          />
          <textarea
            aria-label="Tracking note"
            placeholder="Session note"
            value={draft.personalNote}
            onChange={(event) =>
              setDraft({ ...draft, personalNote: event.target.value })
            }
          />
          <button aria-label="Add tracking entry">
            <Plus size={16} />
          </button>
        </form>
      ) : null}
      <div className="research-filters">
        <input
          aria-label="Search session tracking"
          placeholder="Search tracked browser history"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <input
          aria-label="Filter tracking by date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <select
          aria-label="Filter tracking by website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        >
          <option value="">All websites</option>
          {websites.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <div className="research-list">
        {groupedLogs.map((day) => (
          <section className="tracking-day" key={day.date}>
            <h3>{formatDateHeading(day.date)}</h3>
            {day.sessions.map((session) => (
              <article className="tracking-session" key={session.id}>
                <header>
                  <strong>
                    Session {formatTime(session.start)} -{' '}
                    {formatTime(session.end)}
                  </strong>
                  <span>{session.logs.length} entries</span>
                </header>
                <ul>
                  {session.logs.map((log) => (
                    <li key={log.id}>
                      <time>{formatTime(log.researchedAt)}</time>
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
                  ))}
                </ul>
              </article>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
