import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..', 'src');

/** Every .ts file under a directory, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

/** Modules the core must never import: I/O, network and LLM SDKs. */
const FORBIDDEN = [/^node:/, /^fs$/, /^fs\//, /^http$/, /^https$/, /^net$/, /^child_process$/, /^@anthropic-ai\//, /^openai$/];

describe('F-02 T018 purity', () => {
  it('F-02 AC-034 packages/core/src imports no I/O, network or LLM module', () => {
    const offending: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        const specifier = match[1] ?? match[2] ?? '';
        if (FORBIDDEN.some((pattern) => pattern.test(specifier))) {
          offending.push(`${file}: ${specifier}`);
        }
      }
      if (/\bprocess\.(env|argv|exit|cwd|stdin|stdout|stderr|on|nextTick)\b/.test(text)) {
        offending.push(`${file}: uses the process global`);
      }
    }
    expect(offending).toEqual([]);
  });

  it('F-02 AC-034 the scan reads the core sources at all', () => {
    expect(sourceFiles(SRC).length).toBeGreaterThan(10);
  });
});

/**
 * Every module specifier in a source text: `import ... from`, `export ... from`, bare side-effect
 * `import 'x'`, `import('x')` and `require('x')`. Quotes and backticks both count.
 */
const SPECIFIER =
  /(?:import|export)\s[^'"`]*?from\s*['"`]([^'"`]+)['"`]|\bimport\s*['"`]([^'"`]+)['"`]|\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)|\brequire\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

/** Node modules the pipeline must not reach: file system, HTTP, network sockets, child processes, process. */
const PIPELINE_MODULES = ['fs', 'http', 'https', 'http2', 'net', 'tls', 'dns', 'dgram', 'child_process', 'process'];

/** Global reaches to the process, a window or the network, written without an import. */
const PIPELINE_GLOBALS = [
  /\bprocess\s*(\?\.|\.|\[)/,
  /\bwindow\s*(\?\.|\.|\[)/,
  /\btypeof\s+window\b/,
  /\bglobalThis\s*(\?\.|\.|\[)\s*(process|window|fetch|XMLHttpRequest|WebSocket|EventSource)\b/,
  /(?<![.\w$])(fetch|XMLHttpRequest|WebSocket|EventSource)\b/,
];

/** True for `fs`, `node:fs`, `fs/promises`, `node:https` and the other listed modules, and their sub-paths. */
function isPipelineForbidden(specifier: string): boolean {
  const bare = specifier.replace(/^node:/, '');
  return PIPELINE_MODULES.some((name) => bare === name || bare.startsWith(`${name}/`));
}

/** Each forbidden import or global found in a source text, as a short description. */
function pipelineViolations(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(SPECIFIER)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? match[4] ?? '';
    if (isPipelineForbidden(specifier)) {
      found.push(`import ${specifier}`);
    }
  }
  for (const pattern of PIPELINE_GLOBALS) {
    if (pattern.test(text)) {
      found.push(`matches ${pattern.source}`);
    }
  }
  return found;
}

describe('F-01 T009 pipeline purity', () => {
  it('F-01 AC-026 the pipeline scan reads the pipeline folder', () => {
    expect(sourceFiles(join(SRC, 'pipeline')).length).toBeGreaterThan(5);
  });

  it('F-01 AC-026 packages/core/src/pipeline imports no node:fs, http, https or process, and uses no window or network global', () => {
    const offending = sourceFiles(join(SRC, 'pipeline')).flatMap((file) =>
      pipelineViolations(readFileSync(file, 'utf8')).map((violation) => `${file}: ${violation}`),
    );
    expect(offending).toEqual([]);
  });

  it.each([
    "import fs from 'node:fs';",
    "import { readFileSync } from 'fs';",
    "import 'node:fs';",
    'import * as fsp from "fs/promises";',
    "import type { Server } from 'node:https';",
    "import http from 'http';",
    "export { createServer } from 'http2';",
    "import net from 'net';",
    "import cp from 'node:child_process';",
    "const mod = await import('node:process');",
    "const fs = require('fs');",
    'const fs = await import(`node:fs`);',
    'const key = process.env.KEY;',
    'const key = process?.env;',
    "const g = globalThis.process;",
    "if (typeof window !== 'undefined') { run(); }",
    'window.location.reload();',
    'const res = await fetch(url);',
    'const send = fetch;',
    'const socket = new WebSocket(url);',
    'const xhr = new XMLHttpRequest();',
  ])('F-01 AC-026 the scan flags a forbidden reach: %s', (sample) => {
    expect(pipelineViolations(sample).length).toBeGreaterThan(0);
  });

  it.each([
    "import { parsePipelineConfig } from './parse.js';",
    "import defaultJson from '../../../../templates/pipeline/default.json' with { type: 'json' };",
    "// The process as data: the window of a flow, the fetches of nothing.",
    "const label = 'window of time';",
  ])('F-01 AC-026 the scan leaves allowed code alone: %s', (sample) => {
    expect(pipelineViolations(sample)).toEqual([]);
  });
});
