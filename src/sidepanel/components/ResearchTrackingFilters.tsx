interface Props {
  search: string;
  date: string;
  website: string;
  websites: string[];
  onSearchChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onWebsiteChange: (value: string) => void;
}

export default function ResearchTrackingFilters({
  search,
  date,
  website,
  websites,
  onSearchChange,
  onDateChange,
  onWebsiteChange,
}: Props) {
  return (
    <div className="research-filters">
      <input
        aria-label="Search session tracking"
        placeholder="Search tracked browser history"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <input
        aria-label="Filter tracking by date"
        type="date"
        value={date}
        onChange={(event) => onDateChange(event.target.value)}
      />
      <select
        aria-label="Filter tracking by website"
        value={website}
        onChange={(event) => onWebsiteChange(event.target.value)}
      >
        <option value="">All websites</option>
        {websites.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );
}
