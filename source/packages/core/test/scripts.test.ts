import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const packageDirs = ['packages/core', 'apps/api', 'apps/web'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readScripts(manifestPath: string): Record<string, unknown> {
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!isRecord(manifest)) {
    throw new Error(`${manifestPath} is not a JSON object`);
  }
  const scripts = manifest['scripts'];
  if (!isRecord(scripts)) {
    throw new Error(`${manifestPath} has no scripts object`);
  }
  return scripts;
}

describe('F-01 test scripts', () => {
  it.each(packageDirs)('F-01 AC-006 %s has a test script that runs vitest run', (dir) => {
    const scripts = readScripts(join(sourceDir, dir, 'package.json'));
    expect(scripts['test']).toBe('vitest run');
  });

  it('F-01 AC-006 the root test script runs the test script of every workspace', () => {
    const scripts = readScripts(join(sourceDir, 'package.json'));
    expect(scripts['test']).toBe('npm run test --workspaces --if-present');
  });
});
