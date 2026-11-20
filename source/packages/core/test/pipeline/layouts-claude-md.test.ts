import { describe, expect, it } from 'vitest';
import defaultPipelineJson from '../../../../templates/pipeline/default.json' with { type: 'json' };
import type { ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { parseProjectConfig } from '../../src/pipeline/parse/index.js';
import { planGeneration, type PlannedFile } from '../../src/pipeline/generate/plan.js';
import type { BaseTemplate, GenerationTemplates } from '../../src/pipeline/generate/templates.js';
import { validConfig } from './analyze-fixture.js';
import { readLayout } from './layouts-loader.js';

const MANIFEST_PATH = 'base/manifest.json';
const CLAUDE_MD = 'CLAUDE.md';

interface ManifestEntry {
  readonly path: string;
  readonly layout: string;
}

function isManifest(value: unknown): value is ManifestEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry: unknown) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as { path?: unknown }).path === 'string' &&
        typeof (entry as { layout?: unknown }).layout === 'string',
    )
  );
}

// The manifest read from `source/templates/base/manifest.json`, checked against its shape.
function readManifest(): ManifestEntry[] {
  const value: unknown = JSON.parse(readLayout(MANIFEST_PATH));
  if (!isManifest(value)) throw new Error('the base manifest must be a list of { path, layout } entries');
  return value;
}

// The real layouts and the real base manifest. Each base entry gets the text of its layout file, as the caller does.
function templates(): GenerationTemplates {
  const base: BaseTemplate[] = readManifest().map((entry) => ({ path: entry.path, layout: readLayout(entry.layout) }));
  return {
    base,
    pipeline: readLayout('claude-code/pipeline.md'),
    flow: readLayout('claude-code/flow.md'),
    agent: readLayout('claude-code/agent.md'),
    rule: readLayout('claude-code/rule.md'),
  };
}

function planOf(config: ProjectConfig): PlannedFile[] {
  const files = planGeneration(config, templates());
  if (!files.ok) throw new Error('the configuration must plan');
  return [...files.files];
}

function claudeMdOf(config: ProjectConfig): string {
  const file = planOf(config).find((planned) => planned.path === CLAUDE_MD);
  if (file === undefined) throw new Error('the plan has no CLAUDE.md');
  return file.layout;
}

function rule(index: number, id: string, title: string, text: string): Rule {
  return { index, id, title, text };
}

// The default pipeline, read from its JSON file and passed through the parser as a user document would be.
function defaultConfig(): ProjectConfig {
  const parsed = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: defaultPipelineJson });
  if (!parsed.ok) throw new Error('the default pipeline must parse');
  return parsed.config;
}

// The list items of a rendered CLAUDE.md for the files under `dir`, one line each, in the order written.
function listedLines(text: string, dir: string): string[] {
  return text.split('\n').filter((line) => {
    const path = /^- `([^`]+)`/.exec(line)?.[1];
    return path !== undefined && path.startsWith(dir);
  });
}

// The paths of those list items.
function listedPaths(text: string, dir: string): string[] {
  return listedLines(text, dir).map((line) => /^- `([^`]+)`/.exec(line)?.[1] ?? '');
}

function sorted(items: readonly string[]): string[] {
  return [...items].sort();
}

describe('F-05 layouts: the base manifest and CLAUDE.md', () => {
  it('F-05 AC-026 lists CLAUDE.md in the base manifest with its layout base/CLAUDE.md', () => {
    const entries = readManifest().filter((entry) => entry.path === CLAUDE_MD);
    expect(entries).toEqual([{ path: 'CLAUDE.md', layout: 'base/CLAUDE.md' }]);
  });

  it('F-05 AC-026 renders CLAUDE.md from its layout and the values of a fixture, with no placeholder left', () => {
    const config: ProjectConfig = {
      ...validConfig(),
      rules: [rule(0, 'style', 'Plain style', 'Write short sentences.')],
    };
    const text = claudeMdOf(config);
    expect(text.startsWith('# Project instructions\n')).toBe(true);
    expect(text).not.toContain('{{');
    expect(text).toContain('- `.claude/commands/pipeline.md`\n- `.claude/commands/build.md`');
    expect(text).toContain('- `.claude/agents/build-agent.md`: Builds the project.');
    expect(text).toContain('- `.claude/rules/style.md`: Plain style');
    expect(text.endsWith('\n')).toBe(true);
  });

  it('F-05 AC-026 renders CLAUDE.md from the default pipeline, with the pipeline command first and the process file it names', () => {
    const text = claudeMdOf(defaultConfig());
    expect(text).not.toContain('{{');
    expect(text).toContain('Run `/pipeline` to run the whole process. It runs the flows in order');
    expect(text).toContain('`process.md`');
    expect(listedPaths(text, '.claude/commands/')[0]).toBe('.claude/commands/pipeline.md');
  });

  it('F-05 AC-026 writes no SDDBuilder name, repository path or feature id in CLAUDE.md', () => {
    const text = claudeMdOf(defaultConfig());
    expect(text).not.toMatch(/SDDBuilder|source\/|F-\d\d/);
  });
});

describe('F-05 layouts: CLAUDE.md lists the files the generator plans', () => {
  it('F-05 AC-027 lists the command files of the default pipeline, each once, and no other command', () => {
    const config = defaultConfig();
    const planned = planOf(config).map((file) => file.path);
    const commands = planned.filter((path) => path.startsWith('.claude/commands/'));
    expect(commands.length).toBeGreaterThan(1);
    expect(sorted(listedPaths(claudeMdOf(config), '.claude/commands/'))).toEqual(sorted(commands));
  });

  it('F-05 AC-027 lists each agent file of the default pipeline with its description, and no other agent', () => {
    const config = defaultConfig();
    const agents = planOf(config).filter((file) => file.path.startsWith('.claude/agents/'));
    expect(agents.length).toBeGreaterThan(0);
    const expected = agents.map((file) => `- \`${file.path}\`: ${file.description}`);
    expect(sorted(listedLines(claudeMdOf(config), '.claude/agents/'))).toEqual(sorted(expected));
  });

  it('F-05 AC-027 lists each rule file of the configuration with its title, and no other rule', () => {
    const config: ProjectConfig = {
      ...validConfig(),
      rules: [rule(0, 'style', 'Plain style', 'Write short sentences.'), rule(1, 'safety', 'Safety', 'No secrets.')],
    };
    const planned = planOf(config).map((file) => file.path);
    const rules = planned.filter((path) => path.startsWith('.claude/rules/'));
    expect(rules).toEqual(['.claude/rules/safety.md', '.claude/rules/style.md']);
    expect(sorted(listedPaths(claudeMdOf(config), '.claude/rules/'))).toEqual(sorted(rules));
    expect(listedLines(claudeMdOf(config), '.claude/rules/')).toEqual(
      expect.arrayContaining(['- `.claude/rules/safety.md`: Safety', '- `.claude/rules/style.md`: Plain style']),
    );
  });

  it('F-05 AC-027 lists no rule file when the configuration has no rules', () => {
    const config = validConfig();
    expect(planOf(config).some((file) => file.path.startsWith('.claude/rules/'))).toBe(false);
    expect(listedPaths(claudeMdOf(config), '.claude/rules/')).toEqual([]);
  });
});
