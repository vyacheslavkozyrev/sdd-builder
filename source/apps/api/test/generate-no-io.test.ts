import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const API_SRC = fileURLToPath(new URL('../src/', import.meta.url));
const GENERATE_DIR = fileURLToPath(new URL('../src/generate/', import.meta.url));

/**
 * The provider adapter: the one file of the generate path that imports the provider SDK, which is the only network
 * call on the path (architecture §6). It may import that SDK and nothing else from the forbidden list.
 */
const PROVIDER_ADAPTER = 'generation-model.ts';
const PROVIDER_MODULES: ReadonlySet<string> = new Set(['@anthropic-ai/sdk']);
const NO_MODULES: ReadonlySet<string> = new Set();

/** The /generate route in app.ts: from its POST handler to the line that answers its other methods. */
const ROUTE_START = "app.post('/generate'";
const ROUTE_END = "app.all('/generate'";

/**
 * Modules the generate path may not import: file system, network, process environment and the provider SDK.
 * The `node:` prefix is ignored, so `node:fs` and `fs` are the same module here.
 */
const FORBIDDEN_MODULES: ReadonlySet<string> = new Set([
  'fs',
  'fs/promises',
  'net',
  'http',
  'http2',
  'https',
  'dns',
  'tls',
  'dgram',
  'child_process',
  'worker_threads',
  'cluster',
  'process',
  'os',
  'dotenv',
  'undici',
  'node-fetch',
  'axios',
  'ws',
  '@anthropic-ai/sdk',
]);

/**
 * Global references that read the environment, the network or a built-in module by name. A word boundary keeps
 * `prefetch(` and `processed` apart; a `.` before `fetch` still counts, so `globalThis.fetch(` is flagged.
 */
const FORBIDDEN_GLOBALS: readonly { name: string; pattern: RegExp }[] = [
  { name: 'process.env', pattern: /\bprocess\s*(?:\.\s*env\b|\[\s*['"]env['"]\s*\])/ },
  { name: 'fetch', pattern: /(^|[^\w$])fetch\s*\(/ },
  { name: 'require', pattern: /\brequire\s*\(/ },
  { name: 'getBuiltinModule', pattern: /\bgetBuiltinModule\s*\(/ },
];

// Every module specifier of a static import, a re-export, a dynamic import() or a require() call.
const SPECIFIER_PATTERNS: readonly RegExp[] = [
  /\b(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

/** The module a specifier names, with the `node:` prefix removed. */
function moduleOf(specifier: string): string {
  return specifier.startsWith('node:') ? specifier.slice('node:'.length) : specifier;
}

/** Every module specifier in one file's text. */
function specifiersIn(text: string): string[] {
  return SPECIFIER_PATTERNS.flatMap((pattern) => [...text.matchAll(pattern)].map((match) => match[1] ?? ''));
}

/**
 * Lists the forbidden modules and globals in one text: a forbidden module named by any import, re-export,
 * dynamic import or require (except the modules in `allowed`), and a forbidden global reference.
 * An empty list means the text is clean.
 */
function forbiddenUses(text: string, allowed: ReadonlySet<string> = NO_MODULES): string[] {
  const found: string[] = [];
  for (const specifier of specifiersIn(text)) {
    const module = moduleOf(specifier);
    if (FORBIDDEN_MODULES.has(module) && !allowed.has(module)) found.push(`module ${specifier}`);
  }
  for (const { name, pattern } of FORBIDDEN_GLOBALS) {
    if (pattern.test(text)) found.push(`global ${name}`);
  }
  return found;
}

/** The /generate part of app.ts: the text from its POST handler to the handler of its other methods. */
function generateRoute(appText: string): string {
  const start = appText.indexOf(ROUTE_START);
  const end = appText.indexOf(ROUTE_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('app.ts must hold the /generate POST handler before its method handler');
  }
  return appText.slice(start, end);
}

/** Every TypeScript file of the generate directory, in name order. A file added there is scanned without a list edit. */
function generateFiles(): string[] {
  return readdirSync(GENERATE_DIR)
    .filter((name) => name.endsWith('.ts'))
    .sort();
}

function readGenerateFile(name: string): string {
  return readFileSync(join(GENERATE_DIR, name), 'utf8');
}

function readAppFile(): string {
  return readFileSync(join(API_SRC, 'app.ts'), 'utf8');
}

describe('F-07 AC-018 the generate path imports no file-system, network or environment module', () => {
  it('F-07 AC-018 the scan reads the generate path files and the /generate route', () => {
    const files = generateFiles();
    for (const required of ['parse-reply.ts', 'pipeline-prompt.ts', 'pipeline-service.ts', PROVIDER_ADAPTER]) {
      expect(files).toContain(required);
    }
    for (const file of files) {
      expect(readGenerateFile(file).length).toBeGreaterThan(0);
    }
    expect(generateRoute(readAppFile())).toContain("app.post('/generate'");
  });

  for (const file of generateFiles()) {
    it(`F-07 AC-018 generate/${file} imports no forbidden module and reads no forbidden global`, () => {
      const allowed = file === PROVIDER_ADAPTER ? PROVIDER_MODULES : NO_MODULES;
      expect(forbiddenUses(readGenerateFile(file), allowed)).toEqual([]);
    });
  }

  it('F-07 AC-018 the app.ts imports and the /generate part of app.ts import no forbidden module and read no forbidden global', () => {
    const appText = readAppFile();
    expect(forbiddenUses(appText.split(ROUTE_START)[0] ?? '')).toEqual([]);
    expect(forbiddenUses(generateRoute(appText))).toEqual([]);
  });

  it.each([
    ['the file system module', "import { readFileSync } from 'node:fs';", ['module node:fs']],
    ['the file system promises module', "import { readFile } from 'fs/promises';", ['module fs/promises']],
    ['a double-quoted import of the file system', 'import fs from "fs";', ['module fs']],
    ['a network module', "import { request } from 'node:https';", ['module node:https']],
    ['a multi-line import of a forbidden module', "import {\n  readFileSync,\n} from 'node:fs';", ['module node:fs']],
    ['the process module', "import process from 'node:process';", ['module node:process']],
    ['the os module', "import { userInfo } from 'node:os';", ['module node:os']],
    ['the provider SDK', "import Anthropic from '@anthropic-ai/sdk';", ['module @anthropic-ai/sdk']],
    ['a re-export of a forbidden module', "export { readFileSync } from 'node:fs';", ['module node:fs']],
    ['a side-effect import of a forbidden module', "import 'node:net';", ['module node:net']],
    ['a dynamic import of a forbidden module', "const fs = await import('node:fs');", ['module node:fs']],
    ['a require of a forbidden module', "const fs = require('fs');", ['module fs', 'global require']],
    ['a read of the process environment', 'const key = process.env.ANTHROPIC_API_KEY;', ['global process.env']],
    ['a bracketed read of the process environment', "const key = process['env'].ANTHROPIC_API_KEY;", ['global process.env']],
    ['a call to the global fetch', 'const r = await fetch(url);', ['global fetch']],
    ['a call to fetch on the global object', 'const r = await globalThis.fetch(url);', ['global fetch']],
    ['the built-in module loader', "const fs = process.getBuiltinModule('node:fs');", ['global getBuiltinModule']],
  ])('F-07 AC-018 the matcher flags %s', (_name, text, expected) => {
    expect(forbiddenUses(text)).toEqual(expected);
  });

  it.each([
    ['a relative import of a pipeline module', "import { parseReply } from './parse-reply.js';"],
    ['the core package', "import { pipeline } from '@sddbuilder/core';"],
    ['a type-only import of the generation model', "import type { GenerationModel } from './generation-model.js';"],
    ['a word that only contains fetch', 'const prefetch = 1;\nconst myfetch = prefetch;'],
    ['a method whose name starts with fetch', 'const rows = store.fetchAll();'],
    ['a name that only contains process', 'const processed = 2;'],
    ['a forbidden module named in a comment', '// the file system is not used here'],
  ])('F-07 AC-018 the matcher does not flag %s', (_name, text) => {
    expect(forbiddenUses(text)).toEqual([]);
  });

  it.each([
    ['the SDK in the provider adapter', "import Anthropic from '@anthropic-ai/sdk';", []],
    ['the file system in the provider adapter', "import { readFileSync } from 'node:fs';", ['module node:fs']],
  ])('F-07 AC-018 the provider adapter allows only the SDK: %s', (_name, text, expected) => {
    expect(forbiddenUses(text, PROVIDER_MODULES)).toEqual(expected);
  });
});
