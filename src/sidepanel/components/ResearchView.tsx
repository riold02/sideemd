import { Download, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ResearchLog } from '../../lib/types';
import ResearchTrackingFilters from './ResearchTrackingFilters';
import ResearchTrackingForm from './ResearchTrackingForm';
import ResearchTrackingList from './ResearchTrackingList';
import ResearchTrackingSummary from './ResearchTrackingSummary';
import {
  countUnique,
  emptyTrackingDraft,
  groupLogsByDayAndSession,
} from './researchTracking';

interface Props {
  logs: ResearchLog[];
  onCreateLog: (
    input: Omit<ResearchLog, 'id' | 'researchedAt'>
  ) => Promise<ResearchLog>;
  onDeleteLog: (id: string) => Promise<void>;
  onClearLogs: () => Promise<void>;
  onExport: (format: 'csv' | 'json') => void;
}

export default function ResearchView({
  logs,
  onCreateLog,
  onDeleteLog,
  onClearLogs,
  onExport,
}: Props) {
  const [draft, setDraft] = useState(emptyTrackingDraft);
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
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = filteredLogs.filter((log) =>
    log.researchedAt.startsWith(today)
  ).length;
  const siteCount = countUnique(filteredLogs.map((log) => log.website));

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
      <ResearchTrackingSummary
        entryCount={filteredLogs.length}
        todayCount={todayCount}
        dayCount={groupedLogs.length}
        siteCount={siteCount}
      />
      {manualEntryOpen ? (
        <ResearchTrackingForm
          draft={draft}
          onDraftChange={(updates) =>
            setDraft((current) => ({ ...current, ...updates }))
          }
          onSubmit={() => {
            if (!draft.query.trim() || !draft.website.trim()) return;
            void onCreateLog(draft).then(() => {
              setDraft(emptyTrackingDraft);
              setManualEntryOpen(false);
            });
          }}
        />
      ) : null}
      <ResearchTrackingFilters
        search={search}
        date={date}
        website={website}
        websites={websites}
        onSearchChange={setSearch}
        onDateChange={setDate}
        onWebsiteChange={setWebsite}
      />
      <ResearchTrackingList
        groupedLogs={groupedLogs}
        onDeleteLog={onDeleteLog}
      />
    </main>
  );
}
