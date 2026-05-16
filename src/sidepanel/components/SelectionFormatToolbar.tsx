import type { QuickFormat } from '../utils/editorFormat';
import TextColorPickers from './TextColorPickers';

interface FormatOption {
  label: string;
  format: QuickFormat;
  icon: string;
}

interface Props {
  top: number;
  left: number;
  options: readonly FormatOption[];
  onApplyFormat: (format: QuickFormat) => void;
  onTextColor: (color: string) => void;
  onBackgroundColor: (color: string) => void;
  toolbarRef?: (element: HTMLDivElement | null) => void;
}

export default function SelectionFormatToolbar({
  top,
  left,
  options,
  onApplyFormat,
  onTextColor,
  onBackgroundColor,
  toolbarRef,
}: Props) {
  return (
    <div
      className="selection-format-toolbar"
      ref={toolbarRef}
      style={{ top, left }}
      role="toolbar"
      aria-label="Text formatting"
      onMouseDown={(event) => event.preventDefault()}
    >
      <TextColorPickers
        className="selection-format-colors"
        onTextColor={onTextColor}
        onBackgroundColor={onBackgroundColor}
      />
      <span className="selection-format-divider" aria-hidden />
      {options.map((option) => (
        <button
          key={option.format}
          type="button"
          className="selection-format-button"
          title={option.label}
          aria-label={option.label}
          onClick={() => onApplyFormat(option.format)}
        >
          <span aria-hidden>{option.icon}</span>
        </button>
      ))}
    </div>
  );
}
