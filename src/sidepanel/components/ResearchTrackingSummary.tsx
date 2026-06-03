interface Props {
  entryCount: number;
  todayCount: number;
  dayCount: number;
  siteCount: number;
}

export default function ResearchTrackingSummary({
  entryCount,
  todayCount,
  dayCount,
  siteCount,
}: Props) {
  return (
    <section className="tracking-summary" aria-label="Tracking summary">
      <article>
        <strong>{entryCount}</strong>
        <span>Entries</span>
      </article>
      <article>
        <strong>{todayCount}</strong>
        <span>Today</span>
      </article>
      <article>
        <strong>{dayCount}</strong>
        <span>Days</span>
      </article>
      <article>
        <strong>{siteCount}</strong>
        <span>Sites</span>
      </article>
    </section>
  );
}
