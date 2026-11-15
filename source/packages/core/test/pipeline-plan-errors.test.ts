// F-03 AC-013, AC-014: planGeneration's error paths. A configuration the pipeline generate refuses throws InvalidConfigError
// with every problem and returns no plan; a layout missing from the TemplateSource throws GenerationError naming every
// missing layout path together, with no partial plan; a layout with an unfilled placeholder throws naming the file and
// the placeholder, and no text is returned.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GenerationError, InvalidConfigError } from '../src/errors.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { generate, planGeneration, type PipelinePlanEntry } from '../src/pipeline/index.js';
import type { ProjectConfig, Route } from '../src/pipeline/model.js';
import { templateSourceFromRecord, type ListableTemplateSource } from '../src/template-source.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const TEMPLATES = join(REPO_ROOT, 'templates');
const PIPELINE_COMMAND_LAYOUT = 'claude-code/pipeline-command.md';
const COMMAND_LAYOUT = 'claude-code/command.md';
const AGENT_LAYOUT = 'claude-code/agent.md';
const RULE_LAYOUT = 'claude-code/rule.md';

/** The real layouts the plan reads, as a record of path to text. */
function realRecords(): Record<string, string> {
  const read = (path: string): string => readFileSync(join(TEMPLATES, path), 'utf8');
  const records: Record<string, string> = {
    'base/CLAUDE.md': read('base/CLAUDE.md'),
    'base/process.md': read('base/process.md'),
    'claude-code/agent.md': read('claude-code/agent.md'),
    'claude-code/command.md': read('claude-code/command.md'),
    'claude-code/pipeline-command.md': read('claude-code/pipeline-command.md'),
    'claude-code/rule.md': read('claude-code/rule.md'),
  };
  for (const name of readdirSync(join(TEMPLATES, 'base', 'spec-template'))) {
    records[`base/spec-template/${name}`] = read(`base/spec-template/${name}`);
  }
  return records;
}

/** A template source over the real layouts, with the given paths removed. */
function templatesWithout(removed: readonly string[], changed: Readonly<Record<string, string>> = {}): ListableTemplateSource {
  const records = realRecords();
  for (const path of removed) delete records[path];
  return templateSourceFromRecord({ ...records, ...changed });
}

/** A fresh copy of the default config, so that a test never changes the shared default. */
function freshConfig(): ProjectConfig {
  return structuredClone(defaultProjectConfig);
}

/**
 * The config with its back routes turned into stop routes. The generator refuses a back route into a disabled block, so a
 * test that disables a block first drops the back routes that would point into it.
 */
function withoutBackRoutes(config: ProjectConfig): ProjectConfig {
  const noBack = (route: Route): Route => (route.kind === 'back' ? { kind: 'stop' } : route);
  for (const block of config.pipeline.blocks) {
    if (block.kind === 'condition') {
      block.passRoute = noBack(block.passRoute);
      block.failRoute = noBack(block.failRoute);
    }
    if (block.kind !== 'flow') continue;
    for (const child of block.blocks) {
      if (child.kind === 'condition') {
        child.passRoute = noBack(child.passRoute);
        child.failRoute = noBack(child.failRoute);
      }
    }
  }
  return config;
}

/** The error a call throws. A call that returns instead fails the test, so the caller sees no plan. */
function captureError(run: () => PipelinePlanEntry[]): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to throw, but it returned a plan');
}

describe('F-03 AC-013 a configuration the pipeline generate refuses', () => {
  const config = freshConfig();
  const enabledFlows = config.pipeline.blocks.filter((block) => block.kind === 'flow' && block.enabled);
  const [first, second] = enabledFlows;
  if (first?.kind !== 'flow' || second?.kind !== 'flow') throw new Error('the default pipeline needs two enabled flows');
  // Two problems in two flows: a blank description on each enabled flow.
  first.description = '';
  second.description = '';
  const templates = templatesWithout([]);

  it('F-03 AC-013 throws InvalidConfigError listing every problem, not only the first', () => {
    const error = captureError(() => planGeneration(config, templates));
    expect(error).toBeInstanceOf(InvalidConfigError);
    expect(error).toMatchObject({
      problems: [
        expect.stringContaining(`Flow "${first.id}" has no description`),
        expect.stringContaining(`Flow "${second.id}" has no description`),
      ],
    });
    expect((error as InvalidConfigError).problems).toHaveLength(2);
  });

  it('F-03 AC-013 lists the same problems as the pipeline generate for the same configuration', () => {
    let generated: unknown;
    try {
      generate(config, templates);
    } catch (error) {
      generated = error;
    }
    const planned = captureError(() => planGeneration(config, templates));
    expect(generated).toBeInstanceOf(InvalidConfigError);
    expect(planned).toBeInstanceOf(InvalidConfigError);
    expect((planned as InvalidConfigError).problems).toEqual((generated as InvalidConfigError).problems);
  });

  it('F-03 AC-013 returns no plan: the call throws instead of returning entries', () => {
    expect(() => planGeneration(config, templates)).toThrow(InvalidConfigError);
  });
});

describe('F-03 AC-014 a layout missing from the TemplateSource', () => {
  it('F-03 AC-014 names both missing layout paths together, in one GenerationError', () => {
    const templates = templatesWithout([COMMAND_LAYOUT, AGENT_LAYOUT]);
    const error = captureError(() => planGeneration(freshConfig(), templates));
    expect(error).toBeInstanceOf(GenerationError);
    expect((error as GenerationError).problems).toEqual([
      `template not found at "${COMMAND_LAYOUT}"`,
      `template not found at "${AGENT_LAYOUT}"`,
    ]);
  });

  it('F-03 AC-014 the message of the error names each missing path', () => {
    const templates = templatesWithout([COMMAND_LAYOUT, AGENT_LAYOUT]);
    const error = captureError(() => planGeneration(freshConfig(), templates));
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(COMMAND_LAYOUT);
    expect((error as Error).message).toContain(AGENT_LAYOUT);
  });

  it('F-03 AC-014 names only the layout that is missing (negative case: present layouts are not named)', () => {
    const config = { ...freshConfig(), rules: [{ id: 'code', title: 'Code rules', text: 'Keep the change small.' }] };
    const templates = templatesWithout([RULE_LAYOUT]);
    const error = captureError(() => planGeneration(config, templates));
    expect(error).toBeInstanceOf(GenerationError);
    expect((error as GenerationError).problems).toEqual([`template not found at "${RULE_LAYOUT}"`]);
  });

  it('F-03 AC-014 returns no partial plan: the call throws instead of returning entries', () => {
    const templates = templatesWithout([COMMAND_LAYOUT, AGENT_LAYOUT]);
    expect(() => planGeneration(freshConfig(), templates)).toThrow(GenerationError);
  });

  it('F-03 AC-014 names the pipeline command layout when it is missing, since every plan needs it', () => {
    const templates = templatesWithout([PIPELINE_COMMAND_LAYOUT]);
    const error = captureError(() => planGeneration(freshConfig(), templates));
    expect(error).toBeInstanceOf(GenerationError);
    expect((error as GenerationError).problems).toEqual([`template not found at "${PIPELINE_COMMAND_LAYOUT}"`]);
  });

  it('F-03 AC-014 names every missing layout in the fixed order: pipeline, command, agent, rule', () => {
    const config = { ...freshConfig(), rules: [{ id: 'code', title: 'Code rules', text: 'Keep the change small.' }] };
    const templates = templatesWithout([RULE_LAYOUT, AGENT_LAYOUT, COMMAND_LAYOUT, PIPELINE_COMMAND_LAYOUT]);
    const error = captureError(() => planGeneration(config, templates));
    expect((error as GenerationError).problems).toEqual([
      `template not found at "${PIPELINE_COMMAND_LAYOUT}"`,
      `template not found at "${COMMAND_LAYOUT}"`,
      `template not found at "${AGENT_LAYOUT}"`,
      `template not found at "${RULE_LAYOUT}"`,
    ]);
  });

  it('F-03 AC-014 does not require the rule layout when the config has no rules', () => {
    const config = { ...freshConfig(), rules: [] };
    const templates = templatesWithout([RULE_LAYOUT]);
    expect(() => planGeneration(config, templates)).not.toThrow();
  });

  it('F-03 AC-014 does not require the agent layout when no agent is enabled', () => {
    const config = withoutBackRoutes(freshConfig());
    for (const block of config.pipeline.blocks) {
      if (block.kind !== 'flow') continue;
      for (const child of block.blocks) {
        if (child.kind === 'agent') child.enabled = false;
      }
    }
    const templates = templatesWithout([AGENT_LAYOUT]);
    expect(() => planGeneration(config, templates)).not.toThrow();
  });

  it('F-03 AC-014 does not require the flow command layout when no flow is enabled', () => {
    const config = withoutBackRoutes(freshConfig());
    for (const block of config.pipeline.blocks) {
      if (block.kind === 'flow') block.enabled = false;
    }
    const templates = templatesWithout([COMMAND_LAYOUT]);
    expect(() => planGeneration(config, templates)).not.toThrow();
  });
});

describe('F-03 AC-014 a missing base template in the same preflight', () => {
  const BASE_CLAUDE = 'base/CLAUDE.md';

  it('F-03 AC-014 names a missing base template together with a missing command layout', () => {
    const templates = templatesWithout([BASE_CLAUDE, COMMAND_LAYOUT]);
    const error = captureError(() => planGeneration(freshConfig(), templates));
    expect(error).toBeInstanceOf(GenerationError);
    expect((error as GenerationError).problems).toEqual([
      `template not found at "${BASE_CLAUDE}"`,
      `template not found at "${COMMAND_LAYOUT}"`,
    ]);
  });

  it('F-03 AC-014 names a missing base template alone, and no other path', () => {
    const templates = templatesWithout([BASE_CLAUDE]);
    const error = captureError(() => planGeneration(freshConfig(), templates));
    expect(error).toBeInstanceOf(GenerationError);
    expect((error as GenerationError).problems).toEqual([`template not found at "${BASE_CLAUDE}"`]);
  });

  it('F-03 AC-014 the refusal wins: a refused configuration that also lacks a layout throws InvalidConfigError', () => {
    const config = freshConfig();
    const [flow] = config.pipeline.blocks.filter((block) => block.kind === 'flow' && block.enabled);
    if (flow?.kind !== 'flow') throw new Error('the default pipeline needs an enabled flow');
    flow.description = '';
    const templates = templatesWithout([COMMAND_LAYOUT, BASE_CLAUDE]);
    const error = captureError(() => planGeneration(config, templates));
    expect(error).toBeInstanceOf(InvalidConfigError);
    expect(error).not.toBeInstanceOf(GenerationError);
  });
});

describe('F-03 AC-014 a layout with an unfilled placeholder', () => {
  const placeholder = '{{unfilledName}}';
  const records = realRecords();
  const commandWithPlaceholder = `${records[COMMAND_LAYOUT] ?? ''}\n${placeholder}\n`;
  const templates = templatesWithout([], { [COMMAND_LAYOUT]: commandWithPlaceholder });

  it('F-03 AC-014 throws GenerationError naming the file and the placeholder', () => {
    const error = captureError(() => planGeneration(freshConfig(), templates));
    expect(error).toBeInstanceOf(GenerationError);
    expect((error as GenerationError).problems).toEqual([
      `${COMMAND_LAYOUT}: no value for placeholder "${placeholder}"`,
    ]);
    expect((error as Error).message).toContain(COMMAND_LAYOUT);
    expect((error as Error).message).toContain(placeholder);
  });

  it('F-03 AC-014 returns no text with a leftover placeholder: the call throws instead of returning a plan', () => {
    expect(() => planGeneration(freshConfig(), templates)).toThrow(GenerationError);
  });
});
