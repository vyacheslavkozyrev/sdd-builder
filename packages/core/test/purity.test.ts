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
