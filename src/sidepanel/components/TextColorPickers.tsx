export const DEFAULT_TEXT_COLOR = '#1e1f24';
export const DEFAULT_BACKGROUND_COLOR = '#fff3b0';

interface Props {
  onTextColor: (color: string) => void;
  onBackgroundColor: (color: string) => void;
  className?: string;
}

export default function TextColorPickers({
  onTextColor,
  onBackgroundColor,
  className = '',
}: Props) {
  return (
    <div
      className={`text-color-pickers ${className}`.trim()}
      onMouseDown={(event) => event.preventDefault()}
    >
      <label className="text-color-picker" title="Text color">
        <span className="text-color-picker-icon" aria-hidden>
          A
        </span>
        <input
          type="color"
          defaultValue={DEFAULT_TEXT_COLOR}
          aria-label="Text color"
          onChange={(event) => onTextColor(event.target.value)}
        />
      </label>
      <label className="text-color-picker" title="Background color">
        <span
          className="text-color-picker-icon text-color-picker-icon-fill"
          aria-hidden
        />
        <input
          type="color"
          defaultValue={DEFAULT_BACKGROUND_COLOR}
          aria-label="Background color"
          onChange={(event) => onBackgroundColor(event.target.value)}
        />
      </label>
    </div>
  );
}
