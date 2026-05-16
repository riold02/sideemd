/** Legacy protocol URLs (Lexical sanitizes these to about:blank). */
export const SIDEMD_NOTE_URL_PREFIX = 'sideemd://note/';

/** Path-based note links that survive Lexical URL sanitization. */
export const SIDEMD_NOTE_PATH_PREFIX = '/sideemd/note/';

const LEGACY_LINK_PATTERN = /\(sideemd:\/\/note\/([^)]+)\)/g;

export function buildNoteLinkMarkdown(title: string, noteId: string): string {
  const safeTitle = title.trim() || 'Untitled Note';
  return `[${safeTitle}](${SIDEMD_NOTE_PATH_PREFIX}${noteId})`;
}

export function parseSideemdNoteUrl(href: string | null): string | null {
  if (!href) return null;

  if (href.startsWith(SIDEMD_NOTE_PATH_PREFIX)) {
    const noteId = href.slice(SIDEMD_NOTE_PATH_PREFIX.length).trim();
    return noteId || null;
  }

  if (href.startsWith(SIDEMD_NOTE_URL_PREFIX)) {
    const noteId = href.slice(SIDEMD_NOTE_URL_PREFIX.length).trim();
    return noteId || null;
  }

  return null;
}

export function normalizeNoteLinksInMarkdown(markdown: string): string {
  return markdown.replace(
    LEGACY_LINK_PATTERN,
    `(${SIDEMD_NOTE_PATH_PREFIX}$1)`
  );
}
