interface Props {
  showTrash: boolean;
  noteScope: 'all' | 'pinned' | 'favorite';
  pinnedCount: number;
  favoriteCount: number;
  noteTagFilter: string;
  tags: string[];
  onShowTrashChange: (value: boolean) => void;
  onNoteScopeChange: (value: 'all' | 'pinned' | 'favorite') => void;
  onTagFilterChange: (value: string) => void;
}

export default function HomeNoteFilters({
  showTrash,
  noteScope,
  pinnedCount,
  favoriteCount,
  noteTagFilter,
  tags,
  onShowTrashChange,
  onNoteScopeChange,
  onTagFilterChange,
}: Props) {
  return (
    <div className="note-filter-row">
      <div className="segmented-control" aria-label="Note visibility">
        <button
          className={!showTrash ? 'active' : ''}
          onClick={() => onShowTrashChange(false)}
        >
          Active
        </button>
        <button
          className={showTrash ? 'active' : ''}
          onClick={() => onShowTrashChange(true)}
        >
          Trash
        </button>
      </div>
      <div className="segmented-control note-scope-control" aria-label="Note scope">
        <button
          className={noteScope === 'all' ? 'active' : ''}
          onClick={() => onNoteScopeChange('all')}
          aria-label="Show all pages"
          aria-pressed={noteScope === 'all'}
        >
          All
        </button>
        <button
          className={noteScope === 'pinned' ? 'active' : ''}
          onClick={() => onNoteScopeChange('pinned')}
          aria-label="Show pinned pages"
          aria-pressed={noteScope === 'pinned'}
        >
          Pinned
          <span aria-hidden>{pinnedCount}</span>
        </button>
        <button
          className={noteScope === 'favorite' ? 'active' : ''}
          onClick={() => onNoteScopeChange('favorite')}
          aria-label="Show favorite pages"
          aria-pressed={noteScope === 'favorite'}
        >
          Favorites
          <span aria-hidden>{favoriteCount}</span>
        </button>
      </div>
      <select
        aria-label="Filter notes by tag"
        value={noteTagFilter}
        onChange={(event) => onTagFilterChange(event.target.value)}
      >
        <option value="">All tags</option>
        {tags.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>
    </div>
  );
}
