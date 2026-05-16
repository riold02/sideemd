import { describe, expect, it } from 'vitest';
import { getSelectionToolbarPosition } from '../sidepanel/utils/selectionToolbar';

describe('getSelectionToolbarPosition', () => {
  it('returns null when selection is collapsed', () => {
    const shell = document.createElement('div');
    shell.className = 'visual-editor-shell';
    shell.innerHTML =
      '<div class="visual-editor-content"><p id="line">Hello world</p></div>';
    document.body.appendChild(shell);

    const paragraph = shell.querySelector('#line') as HTMLParagraphElement;
    const range = document.createRange();
    range.setStart(paragraph.firstChild!, 0);
    range.collapse(true);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    expect(getSelectionToolbarPosition(shell)).toBeNull();

    selection.removeAllRanges();
    shell.remove();
  });

  it('returns null when selection is outside the editor', () => {
    const shell = document.createElement('div');
    shell.className = 'visual-editor-shell';
    shell.innerHTML =
      '<div class="visual-editor-content"><p>Inside</p></div><p id="outside">Outside</p>';
    document.body.appendChild(shell);

    const outside = shell.querySelector('#outside') as HTMLParagraphElement;
    const range = document.createRange();
    range.selectNodeContents(outside);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    expect(getSelectionToolbarPosition(shell)).toBeNull();

    selection.removeAllRanges();
    shell.remove();
  });
});
