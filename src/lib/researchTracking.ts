import type { ResearchLog, TrackingSettings } from './types';

const SEARCH_QUERY_KEYS = ['q', 'query', 'text'];
const SENSITIVE_HINTS = [
  'login',
  'signin',
  'sign-in',
  'auth',
  'payment',
  'checkout',
  'bank',
  'mail',
  'email',
  'chat',
  'message',
];
const CHATGPT_RESEARCH_HOSTS = new Set(['chatgpt.com', 'chat.openai.com']);

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '');
}

function domainMatches(hostname: string, configuredDomain: string) {
  const domain = normalizeDomain(configuredDomain);
  if (!domain) return false;
  return (
    hostname === domain ||
    hostname.endsWith(`.${domain}`) ||
    hostname.includes(domain)
  );
}

export function extractSearchQuery(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  for (const key of SEARCH_QUERY_KEYS) {
    const query = url.searchParams.get(key)?.trim();
    if (query) return query;
  }
  return null;
}

export function getPageResearchQuery(rawUrl: string, pageTitle: string) {
  const searchQuery = extractSearchQuery(rawUrl);
  if (searchQuery) return searchQuery;

  const title = pageTitle.trim();
  if (title) return title;

  return getWebsiteFromUrl(rawUrl) ?? rawUrl;
}

export function getWebsiteFromUrl(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function hasRecentResearchCapture(
  logs: ResearchLog[],
  capture: Pick<ResearchLog, 'query' | 'url'>,
  now = Date.now(),
  windowMs = 60_000
) {
  return logs.some(
    (log) =>
      log.url === capture.url &&
      log.query === capture.query &&
      now - Date.parse(log.researchedAt) < windowMs
  );
}

export function isChatGptResearchUrl(rawUrl: string) {
  const website = getWebsiteFromUrl(rawUrl);
  return website !== null && CHATGPT_RESEARCH_HOSTS.has(website);
}

export function isSensitiveResearchUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return true;
  }

  if (isChatGptResearchUrl(rawUrl)) {
    return false;
  }

  const lowered = `${url.hostname}${url.pathname}`.toLowerCase();
  return SENSITIVE_HINTS.some((hint) => lowered.includes(hint));
}

export function canTrackResearchUrl(
  settings: TrackingSettings,
  rawUrl: string
) {
  const website = getWebsiteFromUrl(rawUrl);
  if (!website || !settings.enabled || settings.paused) return false;
  const isChatGptResearch = isChatGptResearchUrl(rawUrl);
  if (settings.blockSensitivePages && isSensitiveResearchUrl(rawUrl)) {
    return false;
  }
  if (
    settings.blockedDomains.some(
      (domain) =>
        domainMatches(website, domain) &&
        // ChatGPT is an explicit prompt research source; users can still block
        // it by configuring its domain instead of the generic "chat" hint.
        !(isChatGptResearch && normalizeDomain(domain) === 'chat')
    )
  ) {
    return false;
  }
  if (settings.allowedDomains.length === 0) return true;
  return settings.allowedDomains.some((domain) =>
    domainMatches(website, domain)
  );
}
