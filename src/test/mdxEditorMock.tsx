import { forwardRef, useImperativeHandle, useRef } from 'react';
import { vi } from 'vitest';

vi.mock('../sidepanel/plugins/formatCommandPlugin', () => ({
  formatCommandPlugin: vi.fn(() => () => ({})),
}));

vi.mock('@mdxeditor/editor', () => ({
  MDXEditor: forwardRef(
    (
      {
        markdown,
        onChange,
        placeholder,
      }: {
        markdown: string;
        onChange: (markdown: string, initialMarkdownNormalize: boolean) => void;
        placeholder?: string;
      },
      ref
    ) => {
      const editorRef = useRef<HTMLDivElement>(null);

      useImperativeHandle(ref, () => ({
        getMarkdown: () => editorRef.current?.textContent ?? '',
        setMarkdown: (value: string) => {
          if (editorRef.current) {
            editorRef.current.textContent = value;
          }
        },
        insertMarkdown: vi.fn(),
        focus: vi.fn(),
        getContentEditableHTML: () => editorRef.current?.innerHTML ?? '',
        getSelectionMarkdown: () => '',
      }));

      return (
        <div
          ref={editorRef}
          aria-label="Visual markdown editor"
          contentEditable
          data-placeholder={placeholder}
          suppressContentEditableWarning
          onInput={(event) =>
            onChange(event.currentTarget.textContent ?? '', false)
          }
        >
          <p>{markdown || 'Existing paragraph'}</p>
        </div>
      );
    }
  ),
  codeBlockPlugin: vi.fn(() => ({})),
  codeMirrorPlugin: vi.fn(() => ({})),
  frontmatterPlugin: vi.fn(() => ({})),
  headingsPlugin: vi.fn(() => ({})),
  imagePlugin: vi.fn(() => ({})),
  linkPlugin: vi.fn(() => ({})),
  listsPlugin: vi.fn(() => ({})),
  markdownShortcutPlugin: vi.fn(() => ({})),
  quotePlugin: vi.fn(() => ({})),
  tablePlugin: vi.fn(() => ({})),
  thematicBreakPlugin: vi.fn(() => ({})),
}));
