import { Pause, Play } from 'lucide-react';
import type { TrackingSettings } from '../../lib/types';

interface Props {
  settings: TrackingSettings;
  onUpdate: (updates: Partial<TrackingSettings>) => Promise<void>;
}

function domainsFromText(value: string) {
  return value
    .split(/[\n,]/)
    .map((domain) => domain.trim())
    .filter(Boolean);
}

export default function TrackingSettingsView({ settings, onUpdate }: Props) {
  return (
    <main className="workspace-view settings-view">
      <header className="view-header">
        <h2>Tracking Settings</h2>
      </header>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => void onUpdate({ enabled: event.target.checked })}
        />
        Research tracking
      </label>
      <button
        className="pause-button"
        onClick={() => void onUpdate({ paused: !settings.paused })}
      >
        {settings.paused ? <Play size={16} /> : <Pause size={16} />}
        {settings.paused ? 'Resume' : 'Pause'}
      </button>
      <label className="settings-field">
        Allowed domains
        <textarea
          aria-label="Allowed tracking domains"
          placeholder="Leave blank to track all allowed page visits"
          value={settings.allowedDomains.join('\n')}
          onChange={(event) =>
            void onUpdate({
              allowedDomains: domainsFromText(event.target.value),
            })
          }
        />
      </label>
      <label className="settings-field">
        Blocked domains
        <textarea
          aria-label="Blocked tracking domains"
          value={settings.blockedDomains.join('\n')}
          onChange={(event) =>
            void onUpdate({
              blockedDomains: domainsFromText(event.target.value),
            })
          }
        />
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={settings.blockSensitivePages}
          onChange={(event) =>
            void onUpdate({ blockSensitivePages: event.target.checked })
          }
        />
        Block login, payment, banking, email, and other chat pages
      </label>
    </main>
  );
}
