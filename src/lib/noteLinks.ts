export const SIDEMD_NOTE_URL_PREFIX = 'sideemd://note/';

export function buildNoteLinkMarkdown(title: string, noteId: string): string {
  const safeTitle = title.trim() || 'Untitled Note';
  return `[${safeTitle}](${SIDEMD_NOTE_URL_PREFIX}${noteId})`;
}

export function parseSideemdNoteUrl(href: string | null): string | null {
  if (!href?.startsWith(SIDEMD_NOTE_URL_PREFIX)) return null;
  const noteId = href.slice(SIDEMD_NOTE_URL_PREFIX.length).trim();
  return noteId || null;
}
