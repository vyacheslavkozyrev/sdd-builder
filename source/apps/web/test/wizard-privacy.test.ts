import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const wizardDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'wizard');

// Decision 13: the values last only in browser memory. The wizard source
// must not save them and must not write to the console.
const forbidden = ['localStorage', 'sessionStorage', 'indexedDB', 'console'];

function wizardSources(): { name: string; text: string }[] {
  return readdirSync(wizardDir)
    .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
    .map((name) => ({ name, text: readFileSync(join(wizardDir, name), 'utf8') }));
}

describe('F-08 wizard privacy', () => {
  it('F-08 AC-011 the wizard source has no storage or console call', () => {
    const sources = wizardSources();
    expect(sources.length).toBeGreaterThan(0);
    for (const { name, text } of sources) {
      for (const word of forbidden) {
        expect(text.includes(word), `${name} must not use ${word}`).toBe(false);
      }
    }
  });
});
