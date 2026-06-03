import { Plus } from 'lucide-react';
import type { ResearchLog } from '../../lib/types';

interface Props {
  draft: Omit<ResearchLog, 'id' | 'researchedAt'>;
  onDraftChange: (
    updates: Partial<Omit<ResearchLog, 'id' | 'researchedAt'>>
  ) => void;
  onSubmit: () => void;
}

export default function ResearchTrackingForm({
  draft,
  onDraftChange,
  onSubmit,
}: Props) {
  return (
    <form
      className="research-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input
        aria-label="Tracking title"
        placeholder="Page title or session note"
        value={draft.query}
        onChange={(event) => onDraftChange({ query: event.target.value })}
      />
      <input
        aria-label="Tracking website"
        placeholder="Website"
        value={draft.website}
        onChange={(event) => onDraftChange({ website: event.target.value })}
      />
      <input
        aria-label="Tracking URL"
        placeholder="URL"
        value={draft.url}
        onChange={(event) => onDraftChange({ url: event.target.value })}
      />
      <input
        aria-label="Tracking page title"
        placeholder="Page title"
        value={draft.pageTitle}
        onChange={(event) => onDraftChange({ pageTitle: event.target.value })}
      />
      <textarea
        aria-label="Tracking note"
        placeholder="Session note"
        value={draft.personalNote}
        onChange={(event) =>
          onDraftChange({ personalNote: event.target.value })
        }
      />
      <button aria-label="Add tracking entry">
        <Plus size={16} />
      </button>
    </form>
  );
}
