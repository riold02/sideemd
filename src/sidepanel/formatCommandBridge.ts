import type { QuickFormat } from './utils/editorFormat';

export interface FormatCommandBridge {
  applyFormat: (format: QuickFormat) => void;
}

let activeBridge: FormatCommandBridge | null = null;

export function registerFormatCommandBridge(
  bridge: FormatCommandBridge | null
): void {
  activeBridge = bridge;
}

export function getFormatCommandBridge(): FormatCommandBridge | null {
  return activeBridge;
}
