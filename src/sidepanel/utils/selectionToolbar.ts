export interface SelectionToolbarPosition {
  top: number;
  left: number;
}

export function getSelectionToolbarPosition(
  shell: HTMLElement
): SelectionToolbarPosition | null {
  const editorContent = shell.querySelector('.visual-editor-content');
  if (!editorContent) return null;

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  if (!selection.toString().trim()) return null;

  const range = selection.getRangeAt(0);
  if (!editorContent.contains(range.commonAncestorContainer)) {
    return null;
  }

  const rangeRect = range.getBoundingClientRect();
  if (rangeRect.width === 0 && rangeRect.height === 0) return null;

  const shellRect = shell.getBoundingClientRect();
  const centerX = rangeRect.left - shellRect.left + rangeRect.width / 2;
  const anchorY = rangeRect.top - shellRect.top;

  return {
    top: Math.max(8, anchorY - 10),
    left: Math.min(Math.max(8, centerX), shellRect.width - 8),
  };
}
