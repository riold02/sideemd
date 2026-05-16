# MdSide

MdSide is a Chrome extension that provides a Markdown notebook workspace in the browser Side Panel.

## Features

- Multi-notebook organization
- Rich markdown editing with live preview
- CommonMark + GFM rendering
- Local persistence via `chrome.storage.local`
- Title/content search within selected notebook
- JSON export and import (merge or replace)

## Development

```bash
npm install
npm run dev
```

Load the generated extension in Chrome (Developer mode) if building manually:

```bash
npm run build
```

Then load `dist/` as unpacked extension.
