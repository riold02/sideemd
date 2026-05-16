export function normalizeBlockText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function isEditableBlockElement(element: Element): boolean {
  return [
    'P',
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'LI',
    'BLOCKQUOTE',
    'PRE',
    'TABLE',
    'HR',
  ].includes(element.tagName);
}

function markdownLineMatchesBlock(line: string, signature: string): boolean {
  const normalizedLine = normalizeBlockText(
    line
      .replace(/^#{1,6}\s+/, '')
      .replace(/^>\s?/, '')
      .replace(/^[-*+]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .replace(/^- \[[ xX]\]\s+/, '')
  );
  return (
    normalizedLine.length > 0 &&
    (normalizedLine === signature ||
      normalizedLine.includes(signature) ||
      signature.includes(normalizedLine))
  );
}

export function insertMarkdownAfterBlock(
  markdown: string,
  signature: string,
  blockMarkdown: string
): string {
  const insertText = `\n\n${blockMarkdown}\n`;
  const lines = markdown.split('\n');
  const matchIndex = lines.findIndex((line) =>
    markdownLineMatchesBlock(line, signature)
  );
  if (matchIndex === -1) return `${markdown.trimEnd()}${insertText}`;
  const nextLines = [...lines];
  nextLines.splice(matchIndex + 1, 0, '', blockMarkdown);
  return nextLines.join('\n');
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, ' code sample ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[`*_~>#|[\]-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createNoteSnippet(markdown: string): string {
  const text = stripMarkdown(markdown);
  return text.length > 72
    ? `${text.slice(0, 72).trim()}...`
    : text || 'No content yet';
}

export function formatNoteDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
