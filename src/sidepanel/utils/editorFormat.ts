import type { MDXEditorMethods } from '@mdxeditor/editor';
import { getFormatCommandBridge } from '../formatCommandBridge';

export type QuickFormat =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'highlight'
  | 'border'
  | 'superscript'
  | 'subscript';

const FORMAT_MARKDOWN: Record<
  Exclude<QuickFormat, 'border'>,
  (label: string) => string
> = {
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
  const bridge = getFormatCommandBridge();
  if (bridge) {
    bridge.applyFormat(format);
    return;
  }

  if (format === 'border') return;

  const selection = editor.getSelectionMarkdown().trim();
  const label = selection || 'text';
  editor.insertMarkdown(FORMAT_MARKDOWN[format](label));
  editor.focus();
}
