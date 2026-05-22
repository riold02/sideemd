import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../lib/state';
import {
  mergeImportedState,
  parseImport,
  replaceImportedState,
  serializeState,
} from '../lib/importExport';

describe('import/export', () => {
  it('round trips serialized state', () => {
    const state = createDefaultState();
    const payload = serializeState(state);
    const raw = JSON.stringify(payload);
    const parsed = parseImport(raw);

    expect(parsed.notebooks.length).toBe(payload.notebooks.length);
    expect(parsed.notes.length).toBe(payload.notes.length);
  });

  it('round trips workspace research and tracking data', () => {
    const state = createDefaultState();
    state.researchLogs.research_1 = {
      id: 'research_1',
      query: 'JSON export',
      website: 'example.test',
      url: 'https://example.test/export',
      pageTitle: 'Export',
      researchedAt: '2026-05-22T00:00:00.000Z',
      personalNote: 'Keep research order.',
    };
    state.researchLogOrder = ['research_1'];
    state.trackingSettings.paused = true;

    const replaced = replaceImportedState(
      parseImport(JSON.stringify(serializeState(state)))
    );
    expect(replaced.researchLogOrder).toEqual(['research_1']);
    expect(replaced.trackingSettings.paused).toBe(true);
  });

  it('merges imported data', () => {
    const current = createDefaultState();
    const imported = serializeState(createDefaultState());

    const merged = mergeImportedState(current, imported);
    expect(Object.keys(merged.notebooks).length).toBeGreaterThan(0);
  });

  it('replaces state from import', () => {
    const payload = serializeState(createDefaultState());
    const replaced = replaceImportedState(payload);

    expect(replaced.notebookOrder.length).toBe(payload.notebooks.length);
  });

  it('rejects unsupported schema versions', () => {
    expect(() =>
      parseImport(
        JSON.stringify({ schemaVersion: 999, notebooks: [], notes: [] })
      )
    ).toThrow();
  });
});
