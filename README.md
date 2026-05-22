# Sideemd

**Side editor markdown — notebooks in your browser side panel.**

Sideemd is a Chrome extension that gives you a focused writing workspace without leaving the page you are on. Notes stay on your device, organized in notebooks, with rich Markdown editing and familiar export/import workflows.

## Features

- **Side panel workspace** — Open from the toolbar or `Ctrl+Shift+Y` (`Command+Shift+Y` on macOS).
- **Multi-notebook organization** — Group notes by notebook and switch context quickly.
- **Visual Markdown editor** — WYSIWYG editing powered by [MDXEditor](https://mdxeditor.dev/), with CommonMark and GitHub Flavored Markdown support.
- **Block insert menu** — Insert paragraphs, headings (H1–H6), lists, tasks, quotes, code blocks, tables, and more below the current block.
- **Local-first storage** — All data is persisted with `chrome.storage.local`; nothing is sent to a backend by this extension.
- **Search** — Filter notes by title and content within the active notebook.
- **Workspace dashboard** — See page and note totals, daily research totals, top research sites and keywords.
- **Research and activity logs** — Capture non-sensitive page visits and prompts while tracking is running, add manual research notes, filter/export research data, and review workspace activity.
- **Tracking controls** — Pause research tracking, allow or block domains, and keep sensitive page patterns out of research capture.
- **Import / export** — Back up or migrate data as JSON (merge or replace).

## Requirements

- [Google Chrome](https://www.google.com/chrome/) (or a Chromium-based browser with Manifest V3 side panel support)
- Node.js 18+ and npm (development and building from source only)

## Installation

### From source (development)

```bash
git clone <repository-url>
cd sideemd
npm install
npm run dev
```

Load the unpacked extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Choose **Load unpacked** and select the project’s `dist/` directory (created after `npm run dev` or `npm run build`)

### Production build

```bash
npm run build
```

Load the `dist/` folder as an unpacked extension, or package it for distribution according to your release process.

## Usage

1. Click the Sideemd toolbar icon or use the keyboard shortcut to open the side panel.
2. Select a notebook and open or create a note from the home view.
3. Edit in the visual editor; use **Insert block below** on hover to add structured blocks.
4. Use the menu to export your library as JSON or import a backup (merge or full replace).

## Data and privacy

Sideemd stores notebooks, notes, research logs, activity logs, and editor state locally in the browser via the Chrome extension storage API. The extension does not include analytics, accounts, or cloud sync. While research tracking is running, it captures non-sensitive page metadata used by the research log: search text when present, otherwise the page title, website, URL, title, and time. ChatGPT capture stores submitted prompt text rather than assistant responses. It does not read passwords, cookies, tokens, or browser sessions. You are responsible for backups (export) and for data if you uninstall the extension or clear browser data.

## Development

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `npm run dev`    | Development build with hot reload |
| `npm run build`  | Typecheck and production build    |
| `npm run test`   | Run unit tests (Vitest)           |
| `npm run lint`   | ESLint on `src/`                  |
| `npm run format` | Prettier on source and markdown   |

Project layout:

- `manifest.config.ts` — Extension manifest (MV3)
- `src/sidepanel/` — Side panel UI and editor
- `src/lib/` — Storage and shared utilities
- `src/background.ts` — Service worker (panel open behavior)

## License

Sideemd is distributed under the **[Sideemd License 2.0](./license.md)**, a source-available license similar in spirit to the [Elastic License 2.0](https://www.elastic.co/licensing/elastic-license). You may use, modify, and share the Software subject to restrictions on competitive hosted services and commercial extension redistribution.

For broader commercial rights, contact the copyright holder.

## Third-party software

Sideemd is built with open-source components, including but not limited to:

- [React](https://react.dev/) — MIT
- [@mdxeditor/editor](https://github.com/mdx-editor/editor) — MIT
- [Vite](https://vitejs.dev/) — MIT
- [@crxjs/vite-plugin](https://github.com/crxjs/chrome-extension-tools) — MIT

See `package-lock.json` and each dependency’s license for full terms. Third-party licenses do not grant rights to Sideemd itself.

## Support

For bugs, feature requests, or licensing questions, open an issue in your project tracker or contact the copyright holder listed in [license.md](./license.md).

---

Copyright © 2026 qvanle. All rights reserved.
