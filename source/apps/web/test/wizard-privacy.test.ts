import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WIZARD_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'wizard');

// Browser storage and the console must not be used by the wizard: values live in memory only.
const FORBIDDEN = /\b(localStorage|sessionStorage|indexedDB|console)\b/g;

function findForbidden(source: string): string[] {
  return [...source.matchAll(FORBIDDEN)].map((match) => match[0]);
}

function wizardSourceFiles(): string[] {
  return readdirSync(WIZARD_DIR)
    .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
    .map((name) => join(WIZARD_DIR, name));
}

describe('F-08 AC-011 the wizard makes no storage or console call', () => {
  it('F-08 AC-011 src/wizard has at least one source file to scan', () => {
    expect(wizardSourceFiles().length).toBeGreaterThan(0);
  });

  for (const file of wizardSourceFiles()) {
    it(`F-08 AC-011 ${file.slice(WIZARD_DIR.length + 1)} has no localStorage, sessionStorage, indexedDB or console reference`, () => {
      expect(findForbidden(readFileSync(file, 'utf8'))).toEqual([]);
    });
  }

  it('F-08 AC-011 the scanner flags each forbidden name (negative case: sample lines)', () => {
    expect(findForbidden("localStorage.setItem('k', 'v');")).toEqual(['localStorage']);
    expect(findForbidden('sessionStorage.getItem(key)')).toEqual(['sessionStorage']);
    expect(findForbidden('indexedDB.open("db")')).toEqual(['indexedDB']);
    expect(findForbidden('console.log(values)')).toEqual(['console']);
  });

  it('F-08 AC-011 the scanner does not flag unrelated names (negative case)', () => {
    expect(findForbidden('const consoleLike = 1; const storageKey = "x";')).toEqual([]);
  });
});

describe('F-09 AC-015 the project step is in the privacy scan', () => {
  const scanned = () => wizardSourceFiles().map((file) => file.slice(WIZARD_DIR.length + 1));

  it.each(['ProjectStep.tsx', 'project.ts', 'state.ts', 'StepBody.tsx'])(
    'F-09 AC-015 scans %s, the project step source',
    (name) => {
      expect(scanned()).toContain(name);
    },
  );
});

describe('F-10 AC-024 the technical details step is in the privacy scan', () => {
  const scanned = () => wizardSourceFiles().map((file) => file.slice(WIZARD_DIR.length + 1));

  it.each([
    'TechnicalStep.tsx',
    'technicalStepStyles.ts',
    'technical.ts',
    'RuleList.tsx',
    'ruleListStyles.ts',
    'RuleBlock.tsx',
    'ruleBlockStyles.ts',
  ])('F-10 AC-024 scans %s, the technical details step source', (name) => {
    expect(scanned()).toContain(name);
  });

  it.each(['TechnicalStep.tsx', 'RuleList.tsx', 'RuleBlock.tsx', 'technical.ts'])(
    'F-10 AC-024 %s has no localStorage, sessionStorage, indexedDB or console reference',
    (name) => {
      expect(findForbidden(readFileSync(join(WIZARD_DIR, name), 'utf8'))).toEqual([]);
    },
  );
});

// The builder makes no network request and writes nothing to storage (F-11 AC-041). Its files are
// scanned for every network call and every storage or console use.
const BUILDER_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'builder');
const BUILDER_FORBIDDEN =
  /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|cookie|console)\b/g;

function findBuilderForbidden(source: string): string[] {
  return [...source.matchAll(BUILDER_FORBIDDEN)].map((match) => match[0]);
}

function builderSourceFiles(): string[] {
  return readdirSync(BUILDER_DIR)
    .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
    .map((name) => join(BUILDER_DIR, name));
}

describe('F-11 AC-041 the builder makes no network request and writes nothing to storage', () => {
  it('F-11 AC-041 src/builder has at least one source file to scan', () => {
    expect(builderSourceFiles().length).toBeGreaterThan(0);
  });

  for (const file of builderSourceFiles()) {
    it(`F-11 AC-041 ${file.slice(BUILDER_DIR.length + 1)} has no network, storage or console reference`, () => {
      expect(findBuilderForbidden(readFileSync(file, 'utf8'))).toEqual([]);
    });
  }

  it('F-11 AC-041 the scanner flags each network and storage name (negative case: sample lines)', () => {
    expect(findBuilderForbidden('await fetch("/api/analyze")')).toEqual(['fetch']);
    expect(findBuilderForbidden('const xhr = new XMLHttpRequest();')).toEqual(['XMLHttpRequest']);
    expect(findBuilderForbidden('new WebSocket(url)')).toEqual(['WebSocket']);
    expect(findBuilderForbidden('navigator.sendBeacon(url, body)')).toEqual(['sendBeacon']);
    expect(findBuilderForbidden("localStorage.setItem('pipeline', json)")).toEqual(['localStorage']);
    expect(findBuilderForbidden('document.cookie = "a=1"')).toEqual(['cookie']);
  });

  it('F-11 AC-041 the scanner does not flag unrelated names (negative case)', () => {
    expect(findBuilderForbidden('const prefetchList = []; const fetchCount = 1;')).toEqual([]);
  });

  it('F-11 AC-041 the scan covers the builder files pipelineFields.ts and model.ts', () => {
    const scanned = builderSourceFiles().map((file) => file.slice(BUILDER_DIR.length + 1));
    expect(scanned).toContain('pipelineFields.ts');
    expect(scanned).toContain('model.ts');
  });

  it('F-12 AC-052 the scan covers the block files blocks.ts, blockLink.ts and blockArrows.ts', () => {
    const scanned = builderSourceFiles().map((file) => file.slice(BUILDER_DIR.length + 1));
    expect(scanned).toContain('blocks.ts');
    expect(scanned).toContain('blockLink.ts');
    expect(scanned).toContain('blockArrows.ts');
  });
});
