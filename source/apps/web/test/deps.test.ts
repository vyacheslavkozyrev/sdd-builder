import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// DOM and browser test libraries that architecture.md §5 keeps out of the MVP.
const forbidden = (name: string): boolean =>
  name === 'jsdom' ||
  name === 'happy-dom' ||
  name === 'playwright' ||
  name.startsWith('playwright-') ||
  name === '@playwright/test' ||
  name.startsWith('@testing-library/') ||
  name === '@vitest/browser' ||
  name.startsWith('@vitest/browser-') ||
  name.startsWith('vitest-browser-');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function dependencyNames(manifest: Record<string, unknown>): string[] {
  const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  return sections.flatMap((section) => {
    const entries = manifest[section];
    return isRecord(entries) ? Object.keys(entries) : [];
  });
}

describe('F-01 web dependencies', () => {
  it('F-01 AC-008 apps/web lists no DOM or browser test library', () => {
    const manifestPath = join(webDir, 'package.json');
    const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (!isRecord(manifest)) {
      throw new Error(`${manifestPath} is not a JSON object`);
    }
    const found = dependencyNames(manifest).filter(forbidden);
    expect(found).toEqual([]);
  });

  it('F-01 AC-008 the check reads the real dependency sections (negative case)', () => {
    const names = dependencyNames({
      dependencies: { react: '^19.0.0' },
      devDependencies: {
        jsdom: '^26.0.0',
        '@testing-library/react': '^16.0.0',
        '@vitest/browser': '^3.2.4',
        'vitest-browser-react': '^2.0.0',
      },
    });
    expect(names.filter(forbidden)).toEqual([
      'jsdom',
      '@testing-library/react',
      '@vitest/browser',
      'vitest-browser-react',
    ]);
  });
});
