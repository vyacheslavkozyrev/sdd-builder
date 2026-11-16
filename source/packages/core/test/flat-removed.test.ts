import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..', 'src');

/** Flat generator files that F-07 removes from the core source. */
const REMOVED_FILES = ['generate.ts', 'plan.ts', 'reply-check.ts', 'select.ts', 'file-list.ts'];
/** Folders removed with the flat generator; `render/` is removed entirely (Amendment 11). */
const REMOVED_FOLDERS = ['validate', 'render'];
/** Modules the web app and the pipeline still need from the core source. */
const REQUIRED_FILES = ['cycle.ts', 'selection.ts'];

/** Every entry (files and folders) under a directory, as posix paths relative to it, sorted by name. */
function entries(dir: string, prefix = ''): string[] {
  return readdirSync(join(dir, prefix), { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((entry) => {
      const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      return entry.isDirectory() ? [relative, ...entries(dir, relative)] : [relative];
    });
}

/**
 * The entries in a source listing that the F-07 removal forbids. Pure: it takes the listing and
 * returns the offending paths, so the same rule can be probed with an inline fixture.
 */
function removedPresent(listing: readonly string[]): string[] {
  return listing.filter((path) => {
    if (REMOVED_FILES.includes(path)) return true;
    return REMOVED_FOLDERS.some((folder) => path === folder || path.startsWith(`${folder}/`));
  });
}

describe('F-07 AC-024 flat core sources are removed', () => {
  const listing = entries(SRC);

  it('F-07 AC-024 no removed flat generator file or folder is present under packages/core/src', () => {
    expect(removedPresent(listing)).toEqual([]);
  });

  it('F-07 AC-024 each removed flat file is absent from packages/core/src', () => {
    for (const file of REMOVED_FILES) {
      expect(existsSync(join(SRC, file)), file).toBe(false);
    }
  });

  it('F-07 AC-024 the validate/ folder is absent from packages/core/src', () => {
    expect(existsSync(join(SRC, 'validate'))).toBe(false);
  });

  it('F-07 AC-024 the render/ folder is absent from packages/core/src', () => {
    expect(existsSync(join(SRC, 'render'))).toBe(false);
  });

  it('F-07 AC-024 cycle.ts and selection.ts are present under packages/core/src', () => {
    for (const file of REQUIRED_FILES) {
      expect(existsSync(join(SRC, file)), file).toBe(true);
    }
  });

  it('F-07 AC-024 negative probe: the rule flags each removed path when it is in a listing', () => {
    const fixture = ['index.ts', 'cycle.ts', 'selection.ts'];
    expect(removedPresent(fixture)).toEqual([]);

    for (const file of REMOVED_FILES) {
      expect(removedPresent([...fixture, file])).toEqual([file]);
    }
    expect(removedPresent([...fixture, 'validate', 'validate/checks.ts'])).toEqual(['validate', 'validate/checks.ts']);
    expect(removedPresent([...fixture, 'render', 'render/mermaid.ts'])).toEqual(['render', 'render/mermaid.ts']);
    expect(removedPresent([...fixture, 'render/workflow-command.ts'])).toEqual(['render/workflow-command.ts']);
    // Only top-level names are removed: the same names under pipeline/ are current modules.
    expect(removedPresent([...fixture, 'pipeline/plan.ts', 'pipeline/generate/select.ts'])).toEqual([]);
  });
});
