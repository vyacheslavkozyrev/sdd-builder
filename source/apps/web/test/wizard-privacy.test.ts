import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WIZARD_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'wizard');

// Browser storage and the console must not be used by the wizard: values live in memory only.
const FORBIDDEN = /\b(localStorage|sessionStorage|indexedDB|console)\b/g;

function findForbidden(source: string): string[] {
  return [...source.matchAll(FORBIDDEN)].map((match) => match[0]);
}

function wizardSourceFiles(): string[] {
  return readdirSync(WIZARD_DIR)
    .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
    .map((name) => join(WIZARD_DIR, name));
}

describe('F-08 AC-011 the wizard makes no storage or console call', () => {
  it('F-08 AC-011 src/wizard has at least one source file to scan', () => {
    expect(wizardSourceFiles().length).toBeGreaterThan(0);
  });

  for (const file of wizardSourceFiles()) {
    it(`F-08 AC-011 ${file.slice(WIZARD_DIR.length + 1)} has no localStorage, sessionStorage, indexedDB or console reference`, () => {
      expect(findForbidden(readFileSync(file, 'utf8'))).toEqual([]);
    });
  }

  it('F-08 AC-011 the scanner flags each forbidden name (negative case: sample lines)', () => {
    expect(findForbidden("localStorage.setItem('k', 'v');")).toEqual(['localStorage']);
    expect(findForbidden('sessionStorage.getItem(key)')).toEqual(['sessionStorage']);
    expect(findForbidden('indexedDB.open("db")')).toEqual(['indexedDB']);
    expect(findForbidden('console.log(values)')).toEqual(['console']);
  });

  it('F-08 AC-011 the scanner does not flag unrelated names (negative case)', () => {
    expect(findForbidden('const consoleLike = 1; const storageKey = "x";')).toEqual([]);
  });
});
