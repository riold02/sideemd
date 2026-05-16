import { describe, expect, it } from 'vitest';
import {
  insertMarkdownAfterBlock,
  isSlashTriggerBlock,
  resolveBlockInsertHover,
} from '../sidepanel/utils/markdown';

describe('isSlashTriggerBlock', () => {
  it('treats empty and lone-slash lines as slash triggers', () => {
    expect(isSlashTriggerBlock('')).toBe(true);
    expect(isSlashTriggerBlock('/')).toBe(true);
    expect(isSlashTriggerBlock('hello')).toBe(false);
  });
});

describe('resolveBlockInsertHover on empty blocks', () => {
  it('returns a signature for an empty paragraph', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p id="empty"></p>';
    document.body.appendChild(root);

    const paragraph = root.querySelector('#empty') as HTMLParagraphElement;
    const hoverTarget = resolveBlockInsertHover(paragraph, root);

    expect(hoverTarget?.signature).toBe('__empty:p__');

    root.remove();
  });
});

describe('resolveBlockInsertHover', () => {
  it('anchors the insert control to the hovered paragraph inside a quote', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <blockquote>
        <p id="first">First quoted line</p>
        <p id="second">Second quoted line</p>
      </blockquote>
    `;
    document.body.appendChild(root);

    const secondLine = root.querySelector('#second') as HTMLParagraphElement;
    const hoverTarget = resolveBlockInsertHover(secondLine, root);

    expect(hoverTarget?.block.tagName).toBe('BLOCKQUOTE');
    expect(hoverTarget?.anchor).toBe(secondLine);
    expect(hoverTarget?.signature).toContain('First quoted line');
    expect(hoverTarget?.signature).toContain('Second quoted line');

    root.remove();
  });
});

describe('insertMarkdownAfterBlock', () => {
  it('inserts after the last line of a blockquote section', () => {
    const markdown = [
      'Intro',
      '',
      '> First quoted line',
      '> Second quoted line',
      '',
      'Outro',
    ].join('\n');

    const next = insertMarkdownAfterBlock(
      markdown,
      'First quoted line Second quoted line',
      '## New heading'
    );

    expect(next).toContain('> Second quoted line\n\n## New heading\n\nOutro');
  });
});
