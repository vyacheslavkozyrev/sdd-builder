import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { generate, planGeneration, type PipelinePlanEntry } from '../src/pipeline/index.js';
import type { PipelineBlock, ProjectConfig } from '../src/pipeline/model.js';
import { templateSourceFromRecord, type ListableTemplateSource } from '../src/template-source.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const TEMPLATES = join(REPO_ROOT, 'templates');
const PIPELINE_COMMAND = '.claude/commands/pipeline.md';
const CLAUDE_MD = 'CLAUDE.md';
const PROCESS_MD = 'spec/documents/process.md';

/** The real layouts the plan reads: the base files, the spec template files and the command, agent and rule layouts. */
function realTemplates(): ListableTemplateSource {
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
  return templateSourceFromRecord(records);
}

/** The default pipeline with the given flow disabled. */
function withFlowDisabled(config: ProjectConfig, flowId: string): ProjectConfig {
  const blocks = config.pipeline.blocks.map((block) =>
    block.kind === 'flow' && block.id === flowId ? { ...block, enabled: false } : block,
  );
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}

/** The config with two project rules, so the CLAUDE.md entry has rule paths to name. */
function withRules(config: ProjectConfig): ProjectConfig {
  return {
    ...config,
    rules: [
      { id: 'code', title: 'Code rules', text: 'Keep the change small.' },
      { id: 'qa', title: 'QA rules', text: 'Every criterion has a test.' },
    ],
  };
}

/** The config with one optional argument added after the Start block's own arguments. */
function withOptionalArgument(config: ProjectConfig): ProjectConfig {
  const blocks: PipelineBlock[] = config.pipeline.blocks.map((block) =>
    block.kind === 'start' ? { ...block, arguments: [...block.arguments, { name: 'note', required: false, hint: '' }] } : block,
  );
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}

/** The plan entry at a path. A missing entry fails the test. */
function entryAt(plan: readonly PipelinePlanEntry[], path: string): PipelinePlanEntry {
  const entry = plan.find((item) => item.path === path);
  if (entry === undefined) throw new Error(`no plan entry at ${path}`);
  return entry;
}

/** The ids of the enabled child flows, in pipeline order. */
function enabledFlowIds(config: ProjectConfig): string[] {
  return config.pipeline.blocks.flatMap((block) => (block.kind === 'flow' && block.enabled ? [block.id] : []));
}

describe('F-03 AC-002 the CLAUDE.md entry names every enabled flow command and every rule path', () => {
  const templates = realTemplates();
  const config = withFlowDisabled(withRules(defaultProjectConfig), 'complete');
  const plan = planGeneration(config, templates);
  const text = entryAt(plan, CLAUDE_MD).layout;

  it('F-03 AC-002 names the pipeline command and the command of every enabled flow', () => {
    expect(text).toContain(`\`${PIPELINE_COMMAND}\``);
    for (const id of enabledFlowIds(config)) {
      expect(text).toContain(`\`.claude/commands/${id}.md\``);
    }
  });

  it('F-03 AC-002 names every rule file path of the config', () => {
    expect(text).toContain('`.claude/rules/code.md`');
    expect(text).toContain('`.claude/rules/qa.md`');
  });

  it('F-03 AC-002 does not name the command of a disabled flow (negative case)', () => {
    expect(text).not.toContain('.claude/commands/complete.md');
  });

  it('F-03 AC-002 has no module list (no mention of modules in the entry)', () => {
    expect(text).not.toMatch(/module/i);
  });
});

describe('F-03 AC-003 the process entry is text, with no Mermaid fence', () => {
  const config = withFlowDisabled(defaultProjectConfig, 'complete');
  const text = entryAt(planGeneration(config, realTemplates()), PROCESS_MD).layout;

  it('F-03 AC-003 lists the enabled flows and gates in pipeline order', () => {
    const specifyAt = text.indexOf('Flow Specify (specify)');
    const gateAt = text.indexOf('Gate approval on connection specify-to-ux (approve-stories)');
    const uxAt = text.indexOf('Flow UX (ux)');
    expect(specifyAt).toBeGreaterThan(-1);
    expect(gateAt).toBeGreaterThan(specifyAt);
    expect(uxAt).toBeGreaterThan(gateAt);
  });

  it('F-03 AC-003 does not list a disabled flow (negative case)', () => {
    expect(text).not.toContain('Flow Complete (complete)');
  });

  it('F-03 AC-003 process.md has no line that opens a mermaid fence', () => {
    expect(text).not.toMatch(/^```mermaid/m);
  });
});

describe('F-03 AC-004 the pipeline command lists its arguments first, then the enabled flows in order', () => {
  const config = withOptionalArgument(defaultProjectConfig);
  const text = entryAt(planGeneration(config, realTemplates()), PIPELINE_COMMAND).layout;

  it('F-03 AC-004 lists the arguments before the steps, with their required flags', () => {
    const argumentsAt = text.indexOf('## Arguments');
    const stepsAt = text.indexOf('## Steps');
    expect(argumentsAt).toBeGreaterThan(-1);
    expect(text.indexOf('- `feature-id` (required)')).toBeGreaterThan(argumentsAt);
    expect(text.indexOf('- `note` (optional)')).toBeGreaterThan(argumentsAt);
    expect(text.indexOf('- `note` (optional)')).toBeLessThan(stepsAt);
  });

  it('F-03 AC-004 lists the enabled flows as numbered steps in pipeline order', () => {
    const steps = text.split('\n').filter((line) => /^\d+\. Run the flow /.test(line));
    const ids = steps.map((line) => /following `\.claude\/commands\/([^`]+)\.md`/.exec(line)?.[1]);
    expect(ids).toEqual(enabledFlowIds(config));
    const numbers = steps.map((line) => Number(/^(\d+)\./.exec(line)?.[1]));
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('F-03 AC-004 places the gate between the flows it sits between as the step after the first flow', () => {
    const steps = text.split('\n').filter((line) => /^\d+\. /.test(line));
    const specifyAt = steps.findIndex((line) => line.includes('`.claude/commands/specify.md`'));
    const uxAt = steps.findIndex((line) => line.includes('`.claude/commands/ux.md`'));
    expect(specifyAt).toBeGreaterThan(-1);
    expect(steps[specifyAt + 1]).toContain('(`approve-stories`)');
    expect(uxAt).toBe(specifyAt + 2);
  });
});

describe('F-03 AC-007 a disabled child flow has no command entry', () => {
  const config = withFlowDisabled(defaultProjectConfig, 'complete');
  const plan = planGeneration(config, realTemplates());

  it('F-03 AC-007 has no plan entry for the disabled flow command (negative case)', () => {
    expect(plan.map((entry) => entry.path)).not.toContain('.claude/commands/complete.md');
  });

  it('F-03 AC-007 the pipeline command does not name the disabled flow (negative case)', () => {
    const text = entryAt(plan, PIPELINE_COMMAND).layout;
    expect(text).not.toContain('`complete`');
    expect(text).not.toContain('.claude/commands/complete.md');
    expect(text).toContain('.claude/commands/specify.md');
  });
});

describe('F-03 AC-011 planGeneration gives the same paths in the same order for the same config', () => {
  const templates = realTemplates();

  it('F-03 AC-011 calling it twice gives the same paths and layouts in the same order', () => {
    const config = withRules(withFlowDisabled(defaultProjectConfig, 'complete'));
    const first = planGeneration(config, templates);
    const second = planGeneration(config, templates);
    expect(second.map((entry) => entry.path)).toEqual(first.map((entry) => entry.path));
    expect(second).toEqual(first);
  });

  it('F-03 AC-011 gives one entry per generated file, in the order of the file list', () => {
    const files = generate(defaultProjectConfig, templates).files.map((file) => file.path);
    const plan = planGeneration(defaultProjectConfig, templates);
    expect(plan.map((entry) => entry.path)).toEqual(files);
    for (const entry of plan) expect(entry.layout).not.toMatch(/\{\{[^}]*\}\}/);
  });
});
