import type { MDXEditorMethods } from '@mdxeditor/editor';
import { describe, expect, it, vi } from 'vitest';
import { applyQuickFormat } from '../sidepanel/utils/editorFormat';

function createEditorStub(
  overrides: Partial<MDXEditorMethods>
): MDXEditorMethods {
  return {
    getMarkdown: () => '',
    setMarkdown: vi.fn(),
    getContentEditableHTML: () => '',
    getSelectionMarkdown: () => '',
    insertMarkdown: vi.fn(),
    focus: vi.fn(),
    ...overrides,
  } as MDXEditorMethods;
}

describe('applyQuickFormat', () => {
  it('wraps the current selection in bold markdown', () => {
    const editor = createEditorStub({
      getSelectionMarkdown: () => 'hello',
    });

    applyQuickFormat(editor, 'bold');

    expect(editor.insertMarkdown).toHaveBeenCalledWith('**hello**');
    expect(editor.focus).toHaveBeenCalled();
  });

  it('inserts a placeholder when nothing is selected', () => {
    const editor = createEditorStub({
      getSelectionMarkdown: () => '',
    });

    applyQuickFormat(editor, 'italic');

    expect(editor.insertMarkdown).toHaveBeenCalledWith('*text*');
  });
});
