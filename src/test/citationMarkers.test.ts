import { describe, expect, it } from 'vitest';
import { shouldReplaceNoteOnPaste } from '../sidepanel/hooks/useMarkdownPaste';
import {
  escapeInvalidMdxTagStarts,
  looksLikeMarkdownPaste,
  normalizeCitationMarkers,
  prepareMarkdownForEditor,
  unwrapMarkdownCodeFence,
} from '../sidepanel/utils/markdown';

describe('citation markers', () => {
  it('converts cite markers to superscript html', () => {
    const input = '[cite_start]**XAISEN** is a project[cite: 4, 7].';
    expect(normalizeCitationMarkers(input)).toBe(
      '**XAISEN** is a project<sup class="cite-mark">[4, 7]</sup>.'
    );
  });

  it('unwraps fenced markdown blocks', () => {
    const input = '```markdown\n## Title\n\nBody\n```';
    expect(unwrapMarkdownCodeFence(input)).toBe('## Title\n\nBody');
  });

  it('detects markdown paste payloads', () => {
    expect(looksLikeMarkdownPaste('## About\n\nParagraph')).toBe(true);
    expect(looksLikeMarkdownPaste('plain sentence only')).toBe(false);
  });

  it('prepares markdown for the editor', () => {
    const input = '```md\n[cite_start]Hello[cite: 1]\n```';
    expect(prepareMarkdownForEditor(input)).toBe(
      'Hello<sup class="cite-mark">[1]</sup>'
    );
  });

  it('escapes invalid mdx tag starts', () => {
    const input = 'Flow: <- Start\nValue: <1';
    expect(escapeInvalidMdxTagStarts(input)).toBe(
      'Flow: &lt;- Start\nValue: &lt;1'
    );
    expect(prepareMarkdownForEditor(input)).toBe(
      'Flow: &lt;- Start\nValue: &lt;1'
    );
  });
});

describe('markdown paste placement', () => {
  it('replaces only when the note is empty', () => {
    expect(shouldReplaceNoteOnPaste('')).toBe(true);
    expect(shouldReplaceNoteOnPaste('## About\n\nExisting body')).toBe(false);
  });
});
