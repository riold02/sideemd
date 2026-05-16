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
