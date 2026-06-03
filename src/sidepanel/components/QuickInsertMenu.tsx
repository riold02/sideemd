import type { QuickFormat } from '../utils/editorFormat';
import TextColorPickers from './TextColorPickers';

interface BlockOption {
  label: string;
  markdown: string;
  icon: string;
  section: string;
}

interface FormatOption {
  label: string;
  format: QuickFormat;
  icon: string;
  section: string;
}

interface Props {
  blockOptions: readonly BlockOption[];
  formatOptions: readonly FormatOption[];
  onInsertBlock: (markdown: string) => void;
  onApplyFormat: (format: QuickFormat) => void;
  onTextColor: (color: string) => void;
  onBackgroundColor: (color: string) => void;
  onCreateSubnote?: () => void;
}

const sectionOrder = [
  'Pages',
  'Text Style',
  'Basic Text',
  'Lists',
  'Advanced Layout',
] as const;

export default function QuickInsertMenu({
  blockOptions,
  formatOptions,
  onInsertBlock,
  onApplyFormat,
  onTextColor,
  onBackgroundColor,
  onCreateSubnote,
}: Props) {
  const allOptions: Array<
    | { kind: 'format'; option: FormatOption }
    | { kind: 'block'; option: BlockOption }
  > = [
    ...formatOptions.map((option) => ({ kind: 'format' as const, option })),
    ...blockOptions.map((option) => ({ kind: 'block' as const, option })),
  ];

  return (
    <div className="block-insert-menu" role="menu">
      {sectionOrder.map((section) => {
        if (section === 'Pages') {
          if (!onCreateSubnote) return null;
          return (
            <div className="block-insert-group" key={section}>
              <div className="block-insert-group-title">{section}</div>
              <button type="button" onClick={onCreateSubnote} role="menuitem">
                <span className="block-option-icon" aria-hidden>
                  +
                </span>
                <span>Create Page</span>
              </button>
            </div>
          );
        }

        const options = allOptions.filter(
          (entry) => entry.option.section === section
        );
        if (options.length === 0) return null;
        return (
          <div className="block-insert-group" key={section}>
            <div className="block-insert-group-title">{section}</div>
            {section === 'Text Style' ? (
              <div className="block-insert-color-row" role="none">
                <TextColorPickers
                  onTextColor={onTextColor}
                  onBackgroundColor={onBackgroundColor}
                />
              </div>
            ) : null}
            {options.map((entry) => (
              <button
                key={`${entry.kind}-${entry.option.label}`}
                type="button"
                onClick={() =>
                  entry.kind === 'format'
                    ? onApplyFormat(entry.option.format)
                    : onInsertBlock(entry.option.markdown)
                }
                role="menuitem"
              >
                <span className="block-option-icon" aria-hidden>
                  {entry.option.icon}
                </span>
                <span>{entry.option.label}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
