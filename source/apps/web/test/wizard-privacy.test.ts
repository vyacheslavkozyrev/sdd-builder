import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const wizardDir = join(srcDir, 'wizard');

// Decision 13: the values last only in browser memory. The wizard source
// must not save them and must not write to the console.
const forbidden = ['localStorage', 'sessionStorage', 'indexedDB', 'console'];

function wizardSources(): { name: string; text: string }[] {
  return readdirSync(wizardDir)
    .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
    .map((name) => ({ name, text: readFileSync(join(wizardDir, name), 'utf8') }));
}

function appSource(): { name: string; text: string } {
  return { name: 'App.tsx', text: readFileSync(join(srcDir, 'App.tsx'), 'utf8') };
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

describe('F-09 project step privacy', () => {
  it('F-09 AC-015 the project step is in the scanned wizard source', () => {
    expect(wizardSources().map((source) => source.name)).toContain('ProjectStep.tsx');
  });

  it('F-09 AC-015 the app root that holds the values makes no storage or console call', () => {
    const { name, text } = appSource();
    for (const word of forbidden) {
      expect(text.includes(word), `${name} must not use ${word}`).toBe(false);
    }
  });
});

describe('F-10 technical details step privacy', () => {
  it('F-10 AC-022 the technical step, rule list, rule text and wizard panel are in the scanned wizard source', () => {
    const names = wizardSources().map((source) => source.name);
    for (const file of ['TechnicalStep.tsx', 'RuleBlocks.tsx', 'technical.ts', 'state.ts', 'Wizard.tsx']) {
      expect(names, `${file} must be scanned`).toContain(file);
    }
  });

  it('F-10 AC-022 the wizard source and the app root contain no storage or console call (static scan that covers the step 2 values)', () => {
    for (const { name, text } of [...wizardSources(), appSource()]) {
      for (const word of forbidden) {
        expect(text.includes(word), `${name} must not use ${word}`).toBe(false);
      }
    }
  });
});

// F-11 AC-040: the builder makes no network call, so the builder and the workflow step are also scanned for
// the calls that would send data out.
const networkCalls = ['fetch(', 'XMLHttpRequest', 'WebSocket', 'WebTransport', 'EventSource', 'sendBeacon'];
// Other browser stores that would keep the pipeline after a refresh (AC-040 names storage in general).
const otherStores = ['document.cookie', 'caches.', 'navigator.storage'];
const builderDir = join(srcDir, 'builder');

function builderSources(): { name: string; text: string }[] {
  return readdirSync(builderDir)
    .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
    .map((name) => ({ name, text: readFileSync(join(builderDir, name), 'utf8') }));
}

describe('F-11 workflow step privacy', () => {
  it('F-11 AC-040 the workflow step is in the scanned wizard source', () => {
    expect(wizardSources().map((source) => source.name)).toContain('PipelineStep.tsx');
  });

  it('F-11 AC-040 the workflow step, the wizard and the builder make no storage, console or network call', () => {
    const scanned = [...wizardSources(), ...builderSources(), appSource()];
    expect(builderSources().length).toBeGreaterThan(0);
    for (const { name, text } of scanned) {
      for (const word of [...forbidden, ...networkCalls, ...otherStores]) {
        expect(text.includes(word), `${name} must not use ${word}`).toBe(false);
      }
    }
  });
});
