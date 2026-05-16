import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY, type AppState } from "../lib/types";

vi.mock("@mdxeditor/editor", () => ({
  MDXEditor: ({
    markdown,
    onChange,
    placeholder
  }: {
    markdown: string;
    onChange: (markdown: string, initialMarkdownNormalize: boolean) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="Visual markdown editor"
      placeholder={placeholder}
      defaultValue={markdown}
      onChange={(event) => onChange(event.currentTarget.value, false)}
    />
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
  thematicBreakPlugin: vi.fn(() => ({}))
}));

function createChromeStorageMock() {
  const store: Record<string, unknown> = {};

  return {
    store,
    chrome: {
      storage: {
        local: {
          async get(key: string) {
            return { [key]: store[key] };
          },
          async set(items: Record<string, unknown>) {
            Object.assign(store, items);
          }
        }
      }
    }
  };
}

describe("App editor", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders Home as a notes browser tab on load", async () => {
    const { chrome } = createChromeStorageMock();
    vi.stubGlobal("chrome", chrome);

    const { default: App } = await import("../sidepanel/App");
    render(<App />);

    expect(await screen.findByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.queryByText("Notebooks")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Visual markdown editor")).not.toBeInTheDocument();
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("persists editor markdown changes through autosave", async () => {
    const { chrome, store } = createChromeStorageMock();
    vi.stubGlobal("chrome", chrome);

    const { default: App } = await import("../sidepanel/App");
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Welcome" }));

    const editor = await screen.findByLabelText("Visual markdown editor");
    fireEvent.change(editor, { target: { value: "# Changed note" } });

    await waitFor(() => {
      const state = store[STORAGE_KEY] as AppState;
      expect(Object.values(state.notes).find((note) => note.title === "Welcome")?.contentMarkdown).toBe("# Changed note");
    }, { timeout: 1000 });
  });

  it("opens notes as tabs and closes back to Home", async () => {
    const { chrome } = createChromeStorageMock();
    vi.stubGlobal("chrome", chrome);

    const { default: App } = await import("../sidepanel/App");
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Welcome" }));

    expect(await screen.findByLabelText("Visual markdown editor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Welcome" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close Welcome" }));

    expect(await screen.findByText("Notes")).toBeInTheDocument();
    expect(screen.queryByLabelText("Visual markdown editor")).not.toBeInTheDocument();
  });
});
