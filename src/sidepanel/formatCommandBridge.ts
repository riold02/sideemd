import type { QuickFormat } from './utils/editorFormat';

export interface FormatCommandBridge {
  applyFormat: (format: QuickFormat) => void;
  applyTextColor: (color: string) => void;
  applyBackgroundColor: (color: string) => void;
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
