import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONNECTIONS, DEFAULT_WORKFLOWS, planGeneration, validateConfig, type ProjectConfig } from '@sddbuilder/core';
import { loadTemplates } from '../src/templates.js';

/** The repository's templates/ directory, found from this file's location. */
const REPO_TEMPLATES = fileURLToPath(new URL('../../../templates', import.meta.url));

/** Runs a test body with a fresh temporary directory, removed afterwards. */
function withTempDir(body: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'sddbuilder-f07-templates-'));
  try {
    body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function minimalConfig(): ProjectConfig {
  return {
    schemaVersion: 1,
    name: 'Demo project',
    idea: 'A demo project for the template loader tests.',
    stack: { language: 'TypeScript', testFramework: 'Vitest' },
    architecture: { style: 'layered', modules: [] },
    codeRules: [],
    testRules: [],
    customSteps: [],
    workflows: structuredClone([...DEFAULT_WORKFLOWS]),
    connections: structuredClone([...DEFAULT_CONNECTIONS]),
    targets: ['claude'],
  };
}

describe('F-07 templates loader', () => {
  it('F-07 AC-008 reads every file under the directory, recursively, under forward-slash keys', () => {
    withTempDir((dir) => {
      mkdirSync(join(dir, 'base', 'spec-template'), { recursive: true });
      mkdirSync(join(dir, 'rules'));
      writeFileSync(join(dir, 'base', 'CLAUDE.md'), '# {{projectName}}\n');
      writeFileSync(join(dir, 'base', 'spec-template', 'plan.md'), '# Plan\n');
      writeFileSync(join(dir, 'rules', 'qa.md'), 'QA text\n');

      const source = loadTemplates(dir);

      expect(source.get('base/CLAUDE.md')).toBe('# {{projectName}}\n');
      expect(source.get('base/spec-template/plan.md')).toBe('# Plan\n');
      expect(source.get('rules/qa.md')).toBe('QA text\n');
      expect(source.get('base/missing.md')).toBeUndefined();
      expect(source.get('base')).toBeUndefined();
    });
  });

  it('F-07 AC-008 throws at start-up for a missing directory, naming it', () => {
    withTempDir((dir) => {
      const missing = join(dir, 'does-not-exist');

      expect(() => loadTemplates(missing)).toThrow(missing);
    });
  });

  it('F-07 AC-008 builds a plan from the repository templates that planGeneration accepts', () => {
    const config = minimalConfig();
    expect(validateConfig(config)).toEqual([]);

    const plan = planGeneration(config, loadTemplates(REPO_TEMPLATES));

    const paths = plan.map((entry) => entry.path);
    expect(paths).toContain('CLAUDE.md');
    expect(paths).toContain('.claude/commands/plan.md');
  });

  it('F-07 AC-008 refuses a symbolic link in the templates directory, naming it', () => {
    withTempDir((dir) => {
      const target = join(dir, 'real.md');
      writeFileSync(target, 'text\n');
      symlinkSync(target, join(dir, 'linked.md'));

      expect(() => loadTemplates(dir)).toThrow(join(dir, 'linked.md'));
    });
  });
});
