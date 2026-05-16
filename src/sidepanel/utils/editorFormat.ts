import type { MDXEditorMethods } from '@mdxeditor/editor';

export type QuickFormat =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'highlight'
  | 'superscript'
  | 'subscript';

const FORMAT_MARKDOWN: Record<QuickFormat, (label: string) => string> = {
  bold: (label) => `**${label}**`,
  italic: (label) => `*${label}*`,
  underline: (label) => `<u>${label}</u>`,
  strikethrough: (label) => `~~${label}~~`,
  code: (label) => `\`${label}\``,
  highlight: (label) => `<mark>${label}</mark>`,
  superscript: (label) => `<sup>${label}</sup>`,
  subscript: (label) => `<sub>${label}</sub>`,
};

export function applyQuickFormat(
  editor: MDXEditorMethods,
  format: QuickFormat
): void {
  const selection = editor.getSelectionMarkdown().trim();
  const label = selection || 'text';
  editor.insertMarkdown(FORMAT_MARKDOWN[format](label));
  editor.focus();
}
