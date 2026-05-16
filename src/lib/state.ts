import { APP_NAME } from './branding';
import { AppState, SCHEMA_VERSION } from './types';

export const SEED_DATA_VERSION = 1;
export const WELCOME_MARKDOWN = `# ${APP_NAME}\n\nStart taking notes.`;
export const MARKDOWN_SHOWCASE_TITLE = 'Markdown Syntax Showcase';
export const MARKDOWN_SHOWCASE_MARKDOWN = `---
title: Markdown Syntax Showcase
tags: [mock, markdown, reference]
---

# Markdown Syntax Showcase

Use this note to check how the visual editor handles common markdown.

## Text

Plain text, **bold text**, *italic text*, ***bold italic text***, ~~strikethrough~~, inline \`code\`, and a [link](https://www.markdownguide.org/basic-syntax/).

## Lists

- Unordered item
- Another item
  - Nested item
  - Nested item with **formatting**

1. Ordered item
2. Another ordered item
3. Final ordered item

## Tasks

- [x] Write the first note
- [ ] Review the mock markdown
- [ ] Export a backup

## Quote

> Markdown keeps notes readable as plain text.
>
> It also supports multiple quoted paragraphs.

## Table

| Syntax | Example | Supported |
| --- | --- | --- |
| Heading | \`# Title\` | Yes |
| Bold | \`**text**\` | Yes |
| Table | Pipes and rows | Yes |

## Code

\`\`\`ts
type Note = {
  title: string;
  contentMarkdown: string;
};

const note: Note = {
  title: "Demo",
  contentMarkdown: "# Hello"
};
\`\`\`

Bash:

\`\`\`bash
npm run build
npm test
\`\`\`

## Image

![Markdown placeholder](https://placehold.co/640x240?text=Markdown+Image)

## Horizontal Rule

---

End of showcase.
`;

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultState(): AppState {
  const timestamp = nowIso();
  const notebookId = createId('book');
  const welcomeNoteId = createId('note');
  const showcaseNoteId = createId('note');

  return {
    schemaVersion: SCHEMA_VERSION,
    seedDataVersion: SEED_DATA_VERSION,
    notebooks: {
      [notebookId]: {
        id: notebookId,
        name: 'Inbox',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
    notes: {
      [showcaseNoteId]: {
        id: showcaseNoteId,
        notebookId,
        title: MARKDOWN_SHOWCASE_TITLE,
        contentMarkdown: MARKDOWN_SHOWCASE_MARKDOWN,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      [welcomeNoteId]: {
        id: welcomeNoteId,
        notebookId,
        title: 'Welcome',
        contentMarkdown: WELCOME_MARKDOWN,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
    notebookOrder: [notebookId],
    noteOrderByNotebook: {
      [notebookId]: [showcaseNoteId, welcomeNoteId],
    },
  };
}
