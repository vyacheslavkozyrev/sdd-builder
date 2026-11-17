import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The DOM test libraries approved for component click tests (architecture.md §5, F-10 T004).
const approvedDom = new Set(['jsdom', '@testing-library/react', '@testing-library/dom']);

// Browser test libraries stay out of the MVP. DOM test libraries are out too, unless they
// are one of the approved ones above.
const forbidden = (name: string): boolean =>
  name === 'happy-dom' ||
  name === 'playwright' ||
  name.startsWith('playwright-') ||
  name === '@playwright/test' ||
  name === '@vitest/browser' ||
  name.startsWith('@vitest/browser-') ||
  name.startsWith('vitest-browser-') ||
  ((name === 'jsdom' || name.startsWith('@testing-library/')) && !approvedDom.has(name));

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
  it('F-01 AC-008 apps/web lists no browser test library and no DOM library beyond the approved ones', () => {
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
        jsdom: '^30.1.3',
        '@testing-library/react': '^16.3.3',
        '@testing-library/user-event': '^14.0.0',
        'happy-dom': '^1.0.0',
        '@vitest/browser': '^3.2.4',
        'vitest-browser-react': '^2.0.0',
      },
    });
    expect(names.filter(forbidden)).toEqual([
      '@testing-library/user-event',
      'happy-dom',
      '@vitest/browser',
      'vitest-browser-react',
    ]);
  });

  it('F-01 AC-008 the approved DOM libraries are not flagged (positive case)', () => {
    const names = dependencyNames({
      devDependencies: { jsdom: '30.1.3', '@testing-library/react': '16.3.3', '@testing-library/dom': '10.4.2' },
    });
    expect(names.filter(forbidden)).toEqual([]);
  });
});
