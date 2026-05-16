export interface SelectionToolbarPosition {
  top: number;
  left: number;
}

export const SELECTION_TOOLBAR_WIDTH_FALLBACK = 340;
const TOOLBAR_EDGE_MARGIN = 8;
const TOOLBAR_VERTICAL_OFFSET = 10;

export function clampToolbarCenterX(
  centerX: number,
  containerWidth: number,
  toolbarWidth: number,
  margin = TOOLBAR_EDGE_MARGIN
): number {
  const half = toolbarWidth / 2;
  const minLeft = half + margin;
  const maxLeft = containerWidth - half - margin;
  if (maxLeft <= minLeft) {
    return containerWidth / 2;
  }
  return Math.min(Math.max(minLeft, centerX), maxLeft);
}

export function getSelectionToolbarPosition(
  shell: HTMLElement,
  toolbarWidth = SELECTION_TOOLBAR_WIDTH_FALLBACK
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
    top: Math.max(TOOLBAR_EDGE_MARGIN, anchorY - TOOLBAR_VERTICAL_OFFSET),
    left: clampToolbarCenterX(centerX, shellRect.width, toolbarWidth),
  };
}
