import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const TEMPLATES = join(REPO_ROOT, 'templates');
const README = join(TEMPLATES, 'README.md');

const SCRIPT_EXTENSIONS = ['.sh', '.ps1', '.bat', '.py', '.js', '.ts'];

const BANNED_WORDS = [
  'Swift',
  'TypeScript',
  'JavaScript',
  'Python',
  'Go',
  'Java',
  'Kotlin',
  'Rust',
  'C#',
  'Node',
  'npm',
  'pnpm',
  'yarn',
  'Vitest',
  'Jest',
  'pytest',
  'xcodebuild',
  'Xcode',
  'Vite',
  'React',
  'Fastify',
  'Hono',
  'task-check.sh',
];

/** The documented step markers are exactly `{{#step:<id>}}` and `{{/step:<id>}}` (templates/README.md). */
const STEP_MARKER = /^[#/]step:<id>$/;

interface TemplateFile {
  /** Path relative to `templates/`, with forward slashes. */
  path: string;
  text: string;
}

/** Every file under `templates/`, read with node fs, in sorted order. */
function readTemplateFiles(dir = TEMPLATES, prefix = ''): TemplateFile[] {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .flatMap((entry) => {
      const full = join(dir, entry.name);
      const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) return readTemplateFiles(full, path);
      return [{ path, text: readFileSync(full, 'utf8') }];
    });
}

/** The placeholder names listed in the first column of the table in templates/README.md. */
function readmePlaceholders(text: string): Set<string> {
  const names = new Set<string>();
  const section = text.split(/^## Placeholders$/m)[1]?.split(/^## /m)[0] ?? '';
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    const firstCell = line.split('|')[1] ?? '';
    for (const match of firstCell.matchAll(/`\{\{([^`{}]+)\}\}`/g)) {
      if (match[1] !== undefined) names.add(match[1]);
    }
  }
  return names;
}

/** Every `{{name}}` in the text, in order of appearance. */
function placeholderNames(text: string): string[] {
  return [...text.matchAll(/\{\{([^{}\n]*)\}\}/g)].map((match) => match[1] ?? '');
}

/** Finding when a file name ends in a script extension, in any letter case. */
function scriptNameFindings(path: string): string[] {
  const lower = path.toLowerCase();
  const ext = SCRIPT_EXTENSIONS.find((suffix) => lower.endsWith(suffix));
  return ext === undefined ? [] : [`${path}: file name ends in "${ext}"`];
}

/** Finding when the text begins with a shebang line (a byte order mark is ignored). */
function shebangFindings(path: string, text: string): string[] {
  return text.replace(/^﻿/, '').startsWith('#!') ? [`${path}: file begins with a shebang line`] : [];
}

/** One finding per banned word that appears as a whole word, case-sensitive. */
function bannedWordFindings(path: string, text: string): string[] {
  return BANNED_WORDS.filter((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`).test(text);
  }).map((word) => `${path}: contains banned word "${word}"`);
}

/** One finding per `{{name}}` that is neither a table placeholder nor a documented step marker. */
function placeholderFindings(path: string, text: string, known: ReadonlySet<string>): string[] {
  const unknown = new Set(
    placeholderNames(text).filter((name) => !known.has(name) && !STEP_MARKER.test(name)),
  );
  return [...unknown].map((name) => `${path}: unknown placeholder "{{${name}}}"`);
}

describe('F-03 T015 template scans', () => {
  const files = readTemplateFiles();
  const placeholders = readmePlaceholders(readFileSync(README, 'utf8'));

  it('F-03 AC-012 the scan reads every file under templates/, README.md included', () => {
    const paths = files.map((file) => file.path);
    expect(paths).toContain('README.md');
    expect(paths).toContain('base/CLAUDE.md');
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('F-03 AC-011 no file under templates/ is a script: no name ending in .sh, .ps1, .bat, .py, .js or .ts, and no file begins with a shebang', () => {
    expect(files.length).toBeGreaterThan(0);
    const findings = files.flatMap((file) => [
      ...scriptNameFindings(file.path),
      ...shebangFindings(file.path, file.text),
    ]);
    expect(findings).toEqual([]);
  });

  it('F-03 AC-012 no file under templates/ contains a banned word (whole word, case-sensitive)', () => {
    const findings = files.flatMap((file) => bannedWordFindings(file.path, file.text));
    expect(findings).toEqual([]);
  });

  it('F-03 AC-006 every {{placeholder}} used in any template is listed in templates/README.md or is a step marker', () => {
    expect(placeholders.size).toBeGreaterThan(0);
    const findings = files.flatMap((file) => placeholderFindings(file.path, file.text, placeholders));
    expect(findings).toEqual([]);
  });

  it('F-03 AC-011 the script scans reject every script extension in any case, a shebang after a byte order mark, and accept other names', () => {
    for (const ext of SCRIPT_EXTENSIONS) {
      expect(scriptNameFindings(`scripts/check${ext}`)).toEqual([`scripts/check${ext}: file name ends in "${ext}"`]);
    }
    expect(scriptNameFindings('scripts/CHECK.SH')).toEqual(['scripts/CHECK.SH: file name ends in ".sh"']);
    expect(scriptNameFindings('notes/shell.md')).toEqual([]);
    expect(scriptNameFindings('data/config.json')).toEqual([]);
    expect(shebangFindings('bom.md', '﻿#!/bin/sh\n')).toEqual(['bom.md: file begins with a shebang line']);
    expect(shebangFindings('inline.md', 'Text\n#!/bin/sh\n')).toEqual([]);
  });

  it('F-07 AC-024 the flat template folders are removed: no flat, rules, workflows or steps folder under templates/', () => {
    const folders = readdirSync(TEMPLATES, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    for (const removed of ['flat', 'rules', 'workflows', 'steps']) {
      expect(folders, removed).not.toContain(removed);
    }
  });

  it('F-03 AC-011 the scan reports a shebang, a banned word and an unknown placeholder when present', () => {
    const sample = '#!/bin/sh\nBuild with TypeScript and {{nope}}.\n';
    expect(shebangFindings('sample.md', sample)).toEqual(['sample.md: file begins with a shebang line']);
    expect(bannedWordFindings('sample.md', sample)).toEqual(['sample.md: contains banned word "TypeScript"']);
    expect(placeholderFindings('sample.md', sample, placeholders)).toEqual([
      'sample.md: unknown placeholder "{{nope}}"',
    ]);
  });

  it('F-03 AC-006 the placeholder scans accept only the documented step markers, with the literal <id>', () => {
    const sample = '{{#step:<id>}} {{/step:<id>}} {{#step:commit}} {{step:<id>}} {{ projectName }}';
    expect(placeholderFindings('sample.md', sample, placeholders)).toEqual([
      'sample.md: unknown placeholder "{{#step:commit}}"',
      'sample.md: unknown placeholder "{{step:<id>}}"',
      'sample.md: unknown placeholder "{{ projectName }}"',
    ]);
  });

  it('F-03 AC-012 the banned-word scan matches whole words only and is case-sensitive', () => {
    expect(bannedWordFindings('a.md', 'Going to Gopher, typescript and Nodes')).toEqual([]);
    expect(bannedWordFindings('a.md', 'Vitest')).toEqual(['a.md: contains banned word "Vitest"']);
    expect(bannedWordFindings('a.md', 'Use C# and task-check.sh')).toEqual([
      'a.md: contains banned word "C#"',
      'a.md: contains banned word "task-check.sh"',
    ]);
  });
});
