import { describe, expect, it } from 'vitest';
import { DEFAULT_TRACKING_SETTINGS } from '../lib/state';
import {
  canTrackResearchUrl,
  extractSearchQuery,
  getPageResearchQuery,
  hasRecentResearchCapture,
  isChatGptResearchUrl,
  isSensitiveResearchUrl,
} from '../lib/researchTracking';

describe('research tracking policy', () => {
  it('extracts common search queries', () => {
    expect(
      extractSearchQuery('https://www.google.com/search?q=chrome+side+panel')
    ).toBe('chrome side panel');
    expect(extractSearchQuery('https://example.test/no-search')).toBeNull();
    expect(
      getPageResearchQuery(
        'https://developer.chrome.com/docs/extensions',
        'Extensions docs'
      )
    ).toBe('Extensions docs');
    expect(getPageResearchQuery('https://example.test/article', '')).toBe(
      'example.test'
    );
  });

  it('honors pause, allow list, block list, and sensitive pages', () => {
    const searchUrl = 'https://www.google.com/search?q=sideemd';
    expect(canTrackResearchUrl(DEFAULT_TRACKING_SETTINGS, searchUrl)).toBe(
      true
    );
    expect(
      canTrackResearchUrl(
        { ...DEFAULT_TRACKING_SETTINGS, paused: true },
        searchUrl
      )
    ).toBe(false);
    expect(
      canTrackResearchUrl(
        { ...DEFAULT_TRACKING_SETTINGS, allowedDomains: ['duckduckgo.com'] },
        searchUrl
      )
    ).toBe(false);
    expect(
      canTrackResearchUrl(
        { ...DEFAULT_TRACKING_SETTINGS, blockedDomains: ['google.com'] },
        searchUrl
      )
    ).toBe(false);
    expect(isSensitiveResearchUrl('https://example.test/login?q=secret')).toBe(
      true
    );
    expect(
      isSensitiveResearchUrl('https://www.google.com/search?q=email')
    ).toBe(false);
  });

  it('tracks ChatGPT prompts without opening generic chat surfaces', () => {
    const chatGptUrl = 'https://chatgpt.com/c/thread-id';
    expect(isChatGptResearchUrl(chatGptUrl)).toBe(true);
    expect(isSensitiveResearchUrl(chatGptUrl)).toBe(false);
    expect(canTrackResearchUrl(DEFAULT_TRACKING_SETTINGS, chatGptUrl)).toBe(
      true
    );
    expect(
      canTrackResearchUrl(
        { ...DEFAULT_TRACKING_SETTINGS, blockedDomains: ['chatgpt.com'] },
        chatGptUrl
      )
    ).toBe(false);
    expect(
      canTrackResearchUrl(
        DEFAULT_TRACKING_SETTINGS,
        'https://example.test/chat/thread'
      )
    ).toBe(false);
  });

  it('deduplicates a page capture during reload churn', () => {
    const capture = {
      query: 'Extensions docs',
      url: 'https://developer.chrome.com/docs/extensions',
    };
    const logs = [
      {
        id: 'research_1',
        ...capture,
        website: 'developer.chrome.com',
        pageTitle: 'Extensions docs',
        researchedAt: '2026-05-22T03:00:00.000Z',
        personalNote: '',
      },
    ];

    expect(
      hasRecentResearchCapture(
        logs,
        capture,
        Date.parse('2026-05-22T03:00:30.000Z')
      )
    ).toBe(true);
    expect(
      hasRecentResearchCapture(
        logs,
        capture,
        Date.parse('2026-05-22T03:02:00.000Z')
      )
    ).toBe(false);
  });
});
