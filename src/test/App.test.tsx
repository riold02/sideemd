import './mdxEditorMock';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('renders Home as a notes browser tab on load', async () => {
    const { chrome } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

    expect(
      await screen.findByRole('button', { name: 'Home' })
    ).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
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

    fireEvent.click(
      await screen.findByRole('button', { name: 'Open Welcome' })
    );

    expect(
      await screen.findByLabelText('Visual markdown editor')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Welcome' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close Welcome' }));

    expect(await screen.findByText('Notes')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Visual markdown editor')
    ).not.toBeInTheDocument();
  });

  it('exposes Home utility actions from the compact menu', async () => {
    const { chrome } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

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

    expect(
      await screen.findByRole('button', { name: 'Delete Welcome' })
    ).toBeInTheDocument();
  });

  it('inserts a selected block below the hovered editor block', async () => {
    const { chrome, store } = createChromeStorageMock();
    vi.stubGlobal('chrome', chrome);

    const { default: App } = await import('../sidepanel/App');
    render(<App />);

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
});
