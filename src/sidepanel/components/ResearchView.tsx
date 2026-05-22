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

  return (
    <main className="workspace-view">
      <header className="view-header research-header">
        <h2>Research Log</h2>
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
            aria-label="Research keyword"
            placeholder="Keyword or page title"
            value={draft.query}
            onChange={(event) =>
              setDraft({ ...draft, query: event.target.value })
            }
          />
          <input
            aria-label="Research website"
            placeholder="Website"
            value={draft.website}
            onChange={(event) =>
              setDraft({ ...draft, website: event.target.value })
            }
          />
          <input
            aria-label="Research URL"
            placeholder="URL"
            value={draft.url}
            onChange={(event) =>
              setDraft({ ...draft, url: event.target.value })
            }
          />
          <input
            aria-label="Research page title"
            placeholder="Page title"
            value={draft.pageTitle}
            onChange={(event) =>
              setDraft({ ...draft, pageTitle: event.target.value })
            }
          />
          <textarea
            aria-label="Research personal note"
            placeholder="Personal note"
            value={draft.personalNote}
            onChange={(event) =>
              setDraft({ ...draft, personalNote: event.target.value })
            }
          />
          <button aria-label="Add research log">
            <Plus size={16} />
          </button>
        </form>
      ) : null}
      <div className="research-filters">
        <input
          aria-label="Search research logs"
          placeholder="Search logs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <input
          aria-label="Filter research by date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <select
          aria-label="Filter research by website"
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
      <ul className="research-list">
        {filteredLogs.map((log) => (
          <li key={log.id}>
            <strong>{log.query}</strong>
            <span>{log.website}</span>
            <span>{log.pageTitle || log.url || '-'}</span>
            <time>{new Date(log.researchedAt).toLocaleString()}</time>
            {log.personalNote ? <p>{log.personalNote}</p> : null}
            <button
              className="icon-button compact"
              onClick={() => void onDeleteLog(log.id)}
              aria-label={`Delete research ${log.query}`}
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
