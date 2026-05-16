import type { QuickFormat } from '../utils/editorFormat';

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
}

export default function SelectionFormatToolbar({
  top,
  left,
  options,
  onApplyFormat,
}: Props) {
  return (
    <div
      className="selection-format-toolbar"
      style={{ top, left }}
      role="toolbar"
      aria-label="Text formatting"
      onMouseDown={(event) => event.preventDefault()}
    >
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
