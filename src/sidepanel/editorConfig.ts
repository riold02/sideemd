import {
  codeBlockPlugin,
  codeMirrorPlugin,
  frontmatterPlugin,
  headingsPlugin,
  imagePlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  type MDXEditorProps,
} from '@mdxeditor/editor';

export const HOME_TAB = 'home';

export const editorPlugins: NonNullable<MDXEditorProps['plugins']> = [
  headingsPlugin(),
  frontmatterPlugin(),
  listsPlugin(),
  linkPlugin(),
  imagePlugin({ disableImageResize: true, disableImageSettingsButton: true }),
  quotePlugin(),
  thematicBreakPlugin(),
  tablePlugin(),
  codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
  codeMirrorPlugin({
    codeBlockLanguages: {
      txt: 'Plain text',
      ts: 'TypeScript',
      tsx: 'TSX',
      js: 'JavaScript',
      jsx: 'JSX',
      json: 'JSON',
      md: 'Markdown',
      bash: 'Bash',
    },
  }),
  markdownShortcutPlugin(),
];

export const BLOCK_INSERT_OPTIONS = [
  { label: 'Paragraph', markdown: 'New paragraph' },
  { label: 'Heading 1', markdown: '# New heading' },
  { label: 'Heading 2', markdown: '## New heading' },
  { label: 'Heading 3', markdown: '### New heading' },
  { label: 'Heading 4', markdown: '#### New heading' },
  { label: 'Heading 5', markdown: '##### New heading' },
  { label: 'Heading 6', markdown: '###### New heading' },
  { label: 'Bulleted list', markdown: '- New item' },
  { label: 'Numbered list', markdown: '1. New item' },
  { label: 'Task', markdown: '- [ ] New task' },
  { label: 'Quote', markdown: '> New quote' },
  { label: 'Code block', markdown: '```txt\nNew code\n```' },
  {
    label: 'Table',
    markdown: '| Column | Value |\n| --- | --- |\n| Item | Detail |',
  },
  { label: 'Divider', markdown: '---' },
] as const;
