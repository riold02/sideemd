import type { ResearchLog } from '../../lib/types';

export const emptyTrackingDraft = {
  query: '',
  website: '',
  url: '',
  pageTitle: '',
  personalNote: '',
};

const SESSION_GAP_MS = 30 * 60 * 1000;

export interface TrackingSession {
  id: string;
  start: string;
  end: string;
  logs: ResearchLog[];
}

export interface TrackingDayGroup {
  date: string;
  sessions: TrackingSession[];
}

export function formatTrackingDateHeading(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTrackingTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function countUnique(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

export function groupLogsByDayAndSession(
  logs: ResearchLog[]
): TrackingDayGroup[] {
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
