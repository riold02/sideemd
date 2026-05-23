import './mdxEditorMock';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, type AppState } from '../lib/types';
import { createChromeStorageMock } from './chromeStorageMock';

describe('App editor', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function openNotes() {
    fireEvent.click(await screen.findByRole('button', { name: 'Notes' }));
  }

  async function openResearch() {
    fireEvent.click(await screen.findByRole('button', { name: 'Research' }));
  }

  async function openSettings() {
    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));
  }

  it('renders dashboard then opens the notes browser', async () => {
    const { chrome } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    expect(
      await screen.findByRole('button', { name: 'Dashboard' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Dashboard' })
    ).toBeInTheDocument();
    await openNotes();
    expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open note actions' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Note' })).toBeInTheDocument();
    expect(screen.queryByText('Notebooks')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Visual markdown editor')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
  });

  it('persists editor markdown changes through autosave', async () => {
    const { chrome, store } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    await openNotes();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open Welcome' })
    );

    const editor = await screen.findByLabelText('Visual markdown editor');
    editor.textContent = '# Changed note';
    fireEvent.input(editor);

    await waitFor(
      () => {
        const state = store[STORAGE_KEY] as AppState;
        expect(
          Object.values(state.notes).some((note) =>
            note.contentMarkdown.includes('Changed note')
          )
        ).toBe(true);
      },
      { timeout: 1000 }
    );
  });

  it('opens notes as tabs and closes back to Home', async () => {
    const { chrome } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    await openNotes();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open Welcome' })
    );

    expect(
      await screen.findByLabelText('Visual markdown editor')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Welcome' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close Welcome' }));

    expect(
      await screen.findByRole('heading', { name: 'Notes' })
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Visual markdown editor')
    ).not.toBeInTheDocument();
  });

  it('discards a newly closed blank note tab', async () => {
    const { chrome, store } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Create note' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Close Untitled Note' })
    );

    await waitFor(() => {
      const state = store[STORAGE_KEY] as AppState;
      expect(
        Object.values(state.notes).some(
          (note) => note.title === 'Untitled Note' && !note.contentMarkdown
        )
      ).toBe(false);
    });
  });

  it('exposes Home utility actions from the compact menu', async () => {
    const { chrome } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    await openNotes();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open note actions' })
    );

    expect(
      screen.getByRole('menuitem', { name: 'Export' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Import' })
    ).toBeInTheDocument();
  });

  it('keeps delete action available with an accessible icon button', async () => {
    const { chrome } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    await openNotes();
    expect(
      await screen.findByRole('button', { name: 'Delete Welcome' })
    ).toBeInTheDocument();
  });

  it('inserts a selected block below the hovered editor block', async () => {
    const { chrome, store } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    await openNotes();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open Welcome' })
    );

    const editor = await screen.findByLabelText('Visual markdown editor');
    fireEvent.mouseMove(editor.querySelector('p') as Element);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Insert block below' })
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Heading 6' }));

    await waitFor(
      () => {
        const state = store[STORAGE_KEY] as AppState;
        expect(
          Object.values(state.notes).find((note) => note.title === 'Welcome')
            ?.contentMarkdown
        ).toContain('###### New heading');
      },
      { timeout: 1000 }
    );
  });

  it('exposes heading levels 1 through 6 in the block insert menu', async () => {
    const { chrome } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    await openNotes();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Open Welcome' })
    );

    const editor = await screen.findByLabelText('Visual markdown editor');
    fireEvent.mouseMove(editor.querySelector('p') as Element);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Insert block below' })
    );

    expect(
      screen.getByRole('menuitem', { name: 'Heading 1' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Heading 2' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Heading 3' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Heading 4' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Heading 5' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Heading 6' })
    ).toBeInTheDocument();
  });

  it('creates research logs from the workspace view', async () => {
    const { chrome } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    await openResearch();
    fireEvent.click(screen.getByRole('button', { name: /Manual/ }));
    fireEvent.change(screen.getByLabelText('Research keyword'), {
      target: { value: 'extension tracking' },
    });
    fireEvent.change(screen.getByLabelText('Research website'), {
      target: { value: 'developer.chrome.com' },
    });
    fireEvent.click(screen.getByLabelText('Add research log'));

    expect(await screen.findByText('extension tracking')).toBeInTheDocument();
    expect(screen.getAllByText('developer.chrome.com').length).toBeGreaterThan(
      0
    );
  });

  it('shows research logs created outside the side panel state', async () => {
    const { chrome, store } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    await openResearch();

    await waitFor(() => {
      expect(store[STORAGE_KEY]).toBeTruthy();
    });

    const state = structuredClone(store[STORAGE_KEY] as AppState);
    state.researchLogs.research_external = {
      id: 'research_external',
      query: 'automatic research event',
      website: 'example.test',
      url: 'https://example.test/research',
      pageTitle: 'Research page',
      researchedAt: '2026-05-22T04:00:00.000Z',
      personalNote: '',
    };
    state.researchLogOrder.unshift('research_external');

    await act(async () => {
      await chrome.storage.local.set({ [STORAGE_KEY]: state });
    });

    expect(
      await screen.findByText('automatic research event')
    ).toBeInTheDocument();
  });

  it('updates tracking settings from the settings view', async () => {
    const { chrome, store } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    await openSettings();
    fireEvent.click(screen.getByText('Pause'));
    fireEvent.change(screen.getByLabelText('Allowed tracking domains'), {
      target: { value: 'docs.example.test' },
    });

    await waitFor(() => {
      const state = store[STORAGE_KEY] as AppState;
      expect(state.trackingSettings.paused).toBe(true);
      expect(state.trackingSettings.allowedDomains).toEqual([
        'docs.example.test',
      ]);
    });
  });
});
