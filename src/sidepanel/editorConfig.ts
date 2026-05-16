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
  {
    label: 'Paragraph',
    markdown: 'New paragraph',
    icon: '¶',
    section: 'Basic Text',
  },
  {
    label: 'Heading 1',
    markdown: '# New heading',
    icon: 'H1',
    section: 'Basic Text',
  },
  {
    label: 'Heading 2',
    markdown: '## New heading',
    icon: 'H2',
    section: 'Basic Text',
  },
  {
    label: 'Heading 3',
    markdown: '### New heading',
    icon: 'H3',
    section: 'Basic Text',
  },
  {
    label: 'Heading 4',
    markdown: '#### New heading',
    icon: 'H4',
    section: 'Basic Text',
  },
  {
    label: 'Heading 5',
    markdown: '##### New heading',
    icon: 'H5',
    section: 'Basic Text',
  },
  {
    label: 'Heading 6',
    markdown: '###### New heading',
    icon: 'H6',
    section: 'Basic Text',
  },
  {
    label: 'Bulleted list',
    markdown: '- New item',
    icon: '•',
    section: 'Lists',
  },
  {
    label: 'Numbered list',
    markdown: '1. New item',
    icon: '1.',
    section: 'Lists',
  },
  { label: 'Task', markdown: '- [ ] New task', icon: '☐', section: 'Lists' },
  {
    label: 'Quote',
    markdown: '> New quote',
    icon: '❝',
    section: 'Advanced Layout',
  },
  {
    label: 'Code block',
    markdown: '```txt\nNew code\n```',
    icon: '</>',
    section: 'Advanced Layout',
  },
  {
    label: 'Table',
    markdown: '| Column | Value |\n| --- | --- |\n| Item | Detail |',
    icon: '▦',
    section: 'Advanced Layout',
  },
  { label: 'Divider', markdown: '---', icon: '―', section: 'Advanced Layout' },
] as const;
