import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const WEB_SRC = join(import.meta.dirname, '..', 'src');

const STORAGE = /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/;
const CONSOLE_OR_STORAGE = new RegExp(`\\bconsole\\b|${STORAGE.source}`);
// Deliberately broader than AC-013 ("no ANTHROPIC text"): any case, and the bare
// word anywhere in the source, so a comment or label cannot hide a provider name
// or key prefix from the check. Fails closed; no current source needs the name.
const PROVIDER_KEY = /ANTHROPIC|sk-ant-/i;

/** Every TypeScript and JavaScript file under the web source, as [relative name, text]. */
function webSourceFiles(): Array<[string, string]> {
  return readdirSync(WEB_SRC, { encoding: 'utf8', recursive: true })
    .filter((name) => /\.(ts|tsx|js|jsx)$/.test(name))
    .map((name): [string, string] => [name, readFileSync(join(WEB_SRC, name), 'utf8')]);
}

/** The names of the source files whose text matches the pattern. */
function filesMatching(pattern: RegExp): string[] {
  return webSourceFiles()
    .filter(([, text]) => pattern.test(text))
    .map(([name]) => name);
}

describe('F-05 AC-006 the wizard writes no browser storage', () => {
  it('F-05 AC-006 the web source calls no localStorage, sessionStorage or indexedDB', () => {
    expect(filesMatching(STORAGE)).toEqual([]);
  });

  it('F-05 AC-006 the storage check flags a storage call when one is present', () => {
    expect(STORAGE.test("window.localStorage.setItem('brief', text);")).toBe(true);
  });
});

describe('F-05 AC-012 the brief leaves the page only through the API', () => {
  it('F-05 AC-012 the static scan reads the web source, so the no-match checks are not vacuous', () => {
    const names = webSourceFiles().map(([name]) => name);
    expect(names).toContain('main.tsx');
    expect(names).toContain('App.tsx');
  });

  it('F-05 AC-012 the web source calls no console, localStorage, sessionStorage or indexedDB', () => {
    expect(filesMatching(CONSOLE_OR_STORAGE)).toEqual([]);
  });

  it('F-05 AC-012 the console check ignores a word that only contains it', () => {
    expect(CONSOLE_OR_STORAGE.test('const consoleWidth = 3;')).toBe(false);
  });

  it('F-05 AC-012 the console check flags a console call when one is present', () => {
    expect(CONSOLE_OR_STORAGE.test('console.log(brief);')).toBe(true);
  });
});

describe('F-05 AC-013 the web source holds no provider key', () => {
  it('F-05 AC-013 no web source file names the provider variable or a key prefix', () => {
    expect(filesMatching(PROVIDER_KEY)).toEqual([]);
  });

  it('F-05 AC-013 the provider check flags the variable name when it is present', () => {
    expect(PROVIDER_KEY.test('const key = process.env.ANTHROPIC_API_KEY;')).toBe(true);
  });

  it('F-05 AC-013 the provider check flags a key prefix when it is present', () => {
    expect(PROVIDER_KEY.test("const key = 'sk-ant-api03-example';")).toBe(true);
  });
});
