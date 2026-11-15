// F-03 AC-031 and AC-012 (flow part): planGeneration gives each enabled flow's command entry the flow's description and
// rule-set tags, empty when the flow has none, and gives no entry to a disabled flow.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { planGeneration, type PipelinePlanEntry } from '../src/pipeline/index.js';
import type { FlowBlock, ProjectConfig, Rule } from '../src/pipeline/model.js';
import { templateSourceFromRecord, type ListableTemplateSource } from '../src/template-source.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const TEMPLATES = join(REPO_ROOT, 'templates');
const COMMANDS_DIR = '.claude/commands/';
const SPECIFY_COMMAND = `${COMMANDS_DIR}specify.md`;
const COMPLETE_COMMAND = `${COMMANDS_DIR}complete.md`;

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

/** A fresh copy of the default config, so that a test never changes the shared default. */
function freshConfig(): ProjectConfig {
  return structuredClone(defaultProjectConfig);
}

/** The config with the given rules in place of its own. */
function withRules(config: ProjectConfig, rules: Rule[]): ProjectConfig {
  return { ...config, rules };
}

/** The child flow with the given id in the config. A missing flow fails the test. */
function flowOf(config: ProjectConfig, flowId: string): FlowBlock {
  const flow = config.pipeline.blocks.find((block): block is FlowBlock => block.kind === 'flow' && block.id === flowId);
  if (flow === undefined) throw new Error(`no flow "${flowId}" in the config`);
  return flow;
}

/** The config with one child flow (by id) changed by the given function. */
function withFlow(config: ProjectConfig, flowId: string, change: (flow: FlowBlock) => FlowBlock): ProjectConfig {
  const blocks = config.pipeline.blocks.map((block) => (block.kind === 'flow' && block.id === flowId ? change(block) : block));
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}

/** The plan entry at a path. A missing entry fails the test. */
function entryAt(plan: readonly PipelinePlanEntry[], path: string): PipelinePlanEntry {
  const entry = plan.find((item) => item.path === path);
  if (entry === undefined) throw new Error(`no plan entry at ${path}`);
  return entry;
}

const TWO_RULES: Rule[] = [
  { id: 'code', title: 'Code rules', text: 'Keep the change small.' },
  { id: 'qa', title: 'QA rules', text: 'Every criterion has a test.' },
];

describe('F-03 AC-031 a flow command entry carries the tags of its flow', () => {
  const config = withFlow(withRules(freshConfig(), TWO_RULES), 'specify', (flow) => ({ ...flow, ruleTags: ['code', 'qa'] }));
  const plan = planGeneration(config, realTemplates());

  it('F-03 AC-031 a flow with tags has an entry that carries those tags', () => {
    expect(entryAt(plan, SPECIFY_COMMAND).ruleTags).toEqual(['code', 'qa']);
  });

  it('F-03 AC-031 a flow with tags shows them in the rule-set line of its layout, as a comma list', () => {
    const layout = entryAt(plan, SPECIFY_COMMAND).layout;
    expect(layout).toContain('Rule-set tags for this flow: code, qa.');
    expect(layout).not.toContain('Rule-set tags for this flow: none.');
  });

  it('F-03 AC-031 the tags are copied, not shared with the config', () => {
    expect(entryAt(plan, SPECIFY_COMMAND).ruleTags).not.toBe(flowOf(config, 'specify').ruleTags);
  });

  it('F-03 AC-031 each flow entry carries its own tags and not those of another flow', () => {
    expect(entryAt(plan, `${COMMANDS_DIR}ux.md`).ruleTags).toEqual([]);
    expect(entryAt(plan, `${COMMANDS_DIR}plan.md`).ruleTags).toEqual([]);
  });
});

describe('F-03 AC-031 a flow with no tags has empty ruleTags', () => {
  it('F-03 AC-031 a flow without tags shows none in the rule-set line of its layout', () => {
    const layout = entryAt(planGeneration(freshConfig(), realTemplates()), SPECIFY_COMMAND).layout;
    expect(layout).toContain('Rule-set tags for this flow: none.');
  });

  it('F-03 AC-031 the default flows, which have no tags, give entries with empty ruleTags', () => {
    const plan = planGeneration(freshConfig(), realTemplates());
    for (const block of defaultProjectConfig.pipeline.blocks) {
      if (block.kind !== 'flow' || !block.enabled) continue;
      expect(entryAt(plan, `${COMMANDS_DIR}${block.id}.md`).ruleTags, block.id).toEqual([]);
    }
  });

  it('F-03 AC-031 a flow whose tags are an empty list gives an entry with empty ruleTags (negative case)', () => {
    const config = withFlow(freshConfig(), 'build', (flow) => ({ ...flow, ruleTags: [] }));
    expect(entryAt(planGeneration(config, realTemplates()), `${COMMANDS_DIR}build.md`).ruleTags).toEqual([]);
  });
});

describe('F-03 AC-031 a flow command entry carries the description of its flow', () => {
  const config = freshConfig();
  const plan = planGeneration(config, realTemplates());

  it('F-03 AC-031 each enabled flow entry has the description of its flow', () => {
    for (const block of config.pipeline.blocks) {
      if (block.kind !== 'flow' || !block.enabled) continue;
      expect(entryAt(plan, `${COMMANDS_DIR}${block.id}.md`).description, block.id).toBe(block.description);
    }
  });

  it('F-03 AC-031 the description is in the layout of the flow command, with no placeholder left', () => {
    const entry = entryAt(plan, SPECIFY_COMMAND);
    expect(entry.layout).toContain(flowOf(config, 'specify').description);
    expect(entry.layout).not.toMatch(/\{\{[^}]*\}\}/);
  });
});

describe('F-03 AC-012 flow part: the entry of a disabled flow is absent (negative case)', () => {
  it('F-03 AC-012 a disabled flow has no command entry', () => {
    const config = withFlow(freshConfig(), 'complete', (flow) => ({ ...flow, enabled: false }));
    const plan = planGeneration(config, realTemplates());
    expect(plan.map((entry) => entry.path)).not.toContain(COMPLETE_COMMAND);
  });

  it('F-03 AC-012 a disabled flow with tags still has no command entry', () => {
    const config = withFlow(withRules(freshConfig(), TWO_RULES), 'complete', (flow) => ({ ...flow, enabled: false, ruleTags: ['code'] }));
    const plan = planGeneration(config, realTemplates());
    expect(plan.map((entry) => entry.path)).not.toContain(COMPLETE_COMMAND);
  });
});
