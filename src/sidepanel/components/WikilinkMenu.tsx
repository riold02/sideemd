interface Option {
  noteId: string;
  title: string;
  kind: 'existing' | 'create';
}

interface Props {
  top: number;
  left: number;
  options: Option[];
  onSelect: (option: Option) => void;
}

export default function WikilinkMenu({ top, left, options, onSelect }: Props) {
  return (
    <div
      className="wikilink-menu"
      style={{ top, left }}
      role="listbox"
      aria-label="Link to page"
    >
      {options.map((option) => (
        <button
          key={`${option.kind}-${option.noteId || option.title}`}
          type="button"
          role="option"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(option)}
        >
          {option.kind === 'create'
            ? `Create Page "${option.title}"`
            : option.title}
        </button>
      ))}
    </div>
  );
}
