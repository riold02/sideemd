import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Sideemd',
  description: 'Side editor markdown — notebooks in your browser side panel.',
  version: '0.1.0',
  permissions: ['storage', 'sidePanel'],
  icons: {
    '16': 'public/icons/icon16.png',
    '32': 'public/icons/icon32.png',
    '48': 'public/icons/icon48.png',
    '128': 'public/icons/icon128.png',
  },
  action: {
    default_title: 'Open Sideemd',
    default_icon: {
      '16': 'public/icons/icon16.png',
      '32': 'public/icons/icon32.png',
      '48': 'public/icons/icon48.png',
    },
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/researchTracking.ts'],
    },
  ],
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  commands: {
    'open-side-panel': {
      suggested_key: {
        default: 'Ctrl+Shift+Y',
        mac: 'Command+Shift+Y',
      },
      description: 'Open Sideemd side panel',
    },
  },
});
