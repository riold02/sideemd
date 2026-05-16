export const BLOCK_INSERT_SELECTOR =
  'p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,table,hr';

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

export function isEmptyBlockSignature(signature: string): boolean {
  return signature.startsWith('__empty:');
}

export function isSlashTriggerBlock(text: string): boolean {
  const normalized = normalizeBlockText(text);
  return normalized.length === 0 || normalized === '/';
}

export function getBlockInsertSignature(block: Element): string {
  const text = normalizeBlockText(block.textContent ?? '');
  if (text) return text;
  if (block.tagName === 'BLOCKQUOTE') return '__blockquote__';
  if (block.tagName === 'PRE') return '__pre__';
  if (block.tagName === 'HR') return '__hr__';
  if (isEditableBlockElement(block)) {
    return `__empty:${block.tagName.toLowerCase()}__`;
  }
  return '';
}

export function resolveBlockInsertHover(
  from: Element,
  root: HTMLElement
): { block: Element; anchor: Element; signature: string } | null {
  const blockquote = from.closest('blockquote');
  if (blockquote && root.contains(blockquote)) {
    const anchor =
      (from.closest('p,h1,h2,h3,h4,h5,h6,li') as Element | null) ?? blockquote;
    if (!root.contains(anchor)) {
      return null;
    }
    const signature = getBlockInsertSignature(blockquote);
    if (!signature) return null;
    return { block: blockquote, anchor, signature };
  }

  const block = from.closest(BLOCK_INSERT_SELECTOR);
  if (!block || !root.contains(block) || !isEditableBlockElement(block)) {
    return null;
  }

  const signature = getBlockInsertSignature(block);
  if (!signature) return null;
  return { block, anchor: block, signature };
}

function findLastQuoteLineIndex(lines: string[], fromIndex: number): number {
  let lastQuoteLine = fromIndex;
  while (
    lastQuoteLine + 1 < lines.length &&
    /^>\s?/.test(lines[lastQuoteLine + 1])
  ) {
    lastQuoteLine += 1;
  }
  return lastQuoteLine;
}

function findInsertLineIndex(lines: string[], signature: string): number {
  if (signature === '__blockquote__') {
    const firstQuoteLine = lines.findIndex((line) => /^>\s?/.test(line));
    if (firstQuoteLine === -1) return -1;
    return findLastQuoteLineIndex(lines, firstQuoteLine);
  }

  const matchIndex = lines.findIndex((line) =>
    markdownLineMatchesBlock(line, signature)
  );
  if (matchIndex === -1) return -1;
  if (/^>\s?/.test(lines[matchIndex])) {
    return findLastQuoteLineIndex(lines, matchIndex);
  }
  return matchIndex;
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
  const matchIndex = findInsertLineIndex(lines, signature);
  if (matchIndex === -1) return `${markdown.trimEnd()}${insertText}`;
  const nextLines = [...lines];
  nextLines.splice(matchIndex + 1, 0, '', blockMarkdown);
  return nextLines.join('\n');
}

export function replaceBlockWithMarkdown(
  markdown: string,
  signature: string,
  blockMarkdown: string
): string {
  const lines = markdown.split('\n');
  const matchIndex = findInsertLineIndex(lines, signature);
  if (matchIndex === -1) {
    const trimmed = markdown.trimEnd();
    return trimmed ? `${trimmed}\n\n${blockMarkdown}` : blockMarkdown;
  }
  const nextLines = [...lines];
  nextLines[matchIndex] = blockMarkdown;
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

/** Gemini / AI export markers → readable superscript citations. */
export function normalizeCitationMarkers(markdown: string): string {
  return markdown
    .replace(/\[cite_start\]/gi, '')
    .replace(/\[cite:\s*([^\]]+)\]/gi, '<sup class="cite-mark">[$1]</sup>');
}

/** Unwrap ```markdown fences so pasted blocks render instead of showing raw text. */
export function unwrapMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i);
  if (fenced) return fenced[1].trim();
  const opened = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*)$/i);
  if (opened) return opened[1].trim();
  return text;
}

/**
 * MDX parser treats "<...>" as JSX and crashes on invalid openings like "<-".
 * Escape those starts while preserving normal HTML/JSX-looking tags.
 */
export function escapeInvalidMdxTagStarts(markdown: string): string {
  return markdown.replace(/<(?=[^A-Za-z/!?\s])/g, '&lt;');
}

export function prepareMarkdownForEditor(markdown: string): string {
  return escapeInvalidMdxTagStarts(
    normalizeCitationMarkers(unwrapMarkdownCodeFence(markdown))
  );
}

export function looksLikeMarkdownPaste(text: string): boolean {
  const sample = text.trim();
  if (sample.length < 2) return false;

  const signals = [
    /^#{1,6}\s+\S/m.test(sample),
    /^\s*[-*+]\s+\S/m.test(sample),
    /^\s*\d+\.\s+\S/m.test(sample),
    /\[cite_start\]/i.test(sample),
    /\[cite:\s*[^\]]+\]/i.test(sample),
    /```(?:markdown|md)?\s*\n/i.test(sample),
    /\*\*[^*]+\*\*/.test(sample),
    /^>\s+\S/m.test(sample),
  ];

  return signals.filter(Boolean).length >= 1 && sample.includes('\n');
}
