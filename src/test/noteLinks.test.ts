import { describe, expect, it } from 'vitest';
import {
  buildNoteLinkMarkdown,
  normalizeNoteLinksInMarkdown,
  parseSideemdNoteUrl,
  SIDEMD_NOTE_PATH_PREFIX,
} from '../lib/noteLinks';

describe('noteLinks', () => {
  it('builds path-based markdown links', () => {
    expect(buildNoteLinkMarkdown('Child', 'abc')).toBe(
      `[Child](${SIDEMD_NOTE_PATH_PREFIX}abc)`
    );
  });

  it('parses path and legacy protocol links', () => {
    expect(parseSideemdNoteUrl(`${SIDEMD_NOTE_PATH_PREFIX}abc`)).toBe('abc');
    expect(parseSideemdNoteUrl('sideemd://note/abc')).toBe('abc');
    expect(parseSideemdNoteUrl('https://example.com')).toBeNull();
  });

  it('migrates legacy protocol links in markdown', () => {
    const input = '- [Child](sideemd://note/child-id)';
    expect(normalizeNoteLinksInMarkdown(input)).toBe(
      `- [Child](${SIDEMD_NOTE_PATH_PREFIX}child-id)`
    );
  });
});
