// F-03 AC-008, AC-009, AC-012 and AC-015: planGeneration gives one entry per enabled Agent block in an enabled flow and
// one per project rule, each with its layout filled; agent entries carry the block's description and rule-set tags.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { generate, planGeneration, type PipelinePlanEntry } from '../src/pipeline/index.js';
import type { AgentBlock, PipelineBlock, ProjectConfig, Rule } from '../src/pipeline/model.js';
import { templateSourceFromRecord, type ListableTemplateSource } from '../src/template-source.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const TEMPLATES = join(REPO_ROOT, 'templates');
const AGENTS_DIR = '.claude/agents/';
const RULES_DIR = '.claude/rules/';
const SPECIFY_AGENT = `${AGENTS_DIR}specify.md`;

/** The real layouts the plan reads: the base files, the spec template files and the four command, agent and rule layouts. */
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

/** The default pipeline with the given child flow enabled or disabled. */
function withFlowEnabled(config: ProjectConfig, flowId: string, enabled: boolean): ProjectConfig {
  const blocks = config.pipeline.blocks.map((block) =>
    block.kind === 'flow' && block.id === flowId ? { ...block, enabled } : block,
  );
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}

/** The config with one Agent block (by id, in any flow) changed by the given function. */
function withAgent(config: ProjectConfig, agentId: string, change: (block: AgentBlock) => AgentBlock): ProjectConfig {
  const blocks = config.pipeline.blocks.map((block): PipelineBlock => {
    if (block.kind !== 'flow') return block;
    const children = block.blocks.map((child) => (child.kind === 'agent' && child.id === agentId ? change(child) : child));
    return { ...block, blocks: children };
  });
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}

/** The config with the given project rules in place of its own. */
function withRules(config: ProjectConfig, rules: Rule[]): ProjectConfig {
  return { ...config, rules };
}

/** Freezes a value and everything it holds, so that any write to it throws in strict mode. */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) deepFreeze(item);
    Object.freeze(value);
  }
  return value;
}

/** The plan entry at a path. A missing entry fails the test. */
function entryAt(plan: readonly PipelinePlanEntry[], path: string): PipelinePlanEntry {
  const entry = plan.find((item) => item.path === path);
  if (entry === undefined) throw new Error(`no plan entry at ${path}`);
  return entry;
}

/** The paths of the plan entries under a directory. */
function pathsUnder(plan: readonly PipelinePlanEntry[], dir: string): string[] {
  return plan.map((entry) => entry.path).filter((path) => path.startsWith(dir));
}

/** The agent file paths the config's enabled Agent blocks in enabled flows should give, sorted as the file list is. */
function expectedAgentPaths(config: ProjectConfig): string[] {
  return config.pipeline.blocks
    .flatMap((block) => {
      if (block.kind !== 'flow' || !block.enabled) return [];
      return block.blocks.flatMap((child) => (child.kind === 'agent' && child.enabled ? [`${AGENTS_DIR}${child.name}.md`] : []));
    })
    .sort();
}

const TWO_RULES: Rule[] = [
  { id: 'code', title: 'Code rules', text: 'Keep the change small.' },
  { id: 'qa', title: 'QA rules', text: 'Every criterion has a test.' },
];

describe('F-03 AC-008 each enabled Agent block in an enabled flow has one agent entry', () => {
  const config = freshConfig();
  const plan = planGeneration(config, realTemplates());

  it('F-03 AC-008 has one entry at .claude/agents/<name>.md for each enabled Agent block', () => {
    expect(pathsUnder(plan, AGENTS_DIR)).toEqual(expectedAgentPaths(config));
    expect(pathsUnder(plan, AGENTS_DIR)).toContain(SPECIFY_AGENT);
  });

  it('F-03 AC-008 names the agent in the layout heading and fills its description', () => {
    const entry = entryAt(plan, SPECIFY_AGENT);
    expect(entry.layout.startsWith('# specify\n')).toBe(true);
    expect(entry.layout).toContain('Drafts stories.md for the feature, after the main session asks its questions.');
    expect(entry.layout).not.toMatch(/\{\{[^}]*\}\}/);
  });

  it('F-03 AC-008 a disabled Agent block has no entry (negative case)', () => {
    const disabled = withAgent(freshConfig(), 'specify-agent', (block) => ({ ...block, enabled: false }));
    const paths = pathsUnder(planGeneration(disabled, realTemplates()), AGENTS_DIR);
    expect(paths).not.toContain(SPECIFY_AGENT);
    expect(paths).toEqual(expectedAgentPaths(disabled));
  });

  it('F-03 AC-008 an Agent block in a disabled flow has no entry (negative case)', () => {
    const disabled = withFlowEnabled(freshConfig(), 'complete', false);
    const paths = pathsUnder(planGeneration(disabled, realTemplates()), AGENTS_DIR);
    expect(paths).not.toContain(`${AGENTS_DIR}complete.md`);
    expect(paths).toEqual(expectedAgentPaths(disabled));
  });
});

describe('F-03 AC-008 an agent entry carries its block description and rule-set tags', () => {
  const tagged = withAgent(freshConfig(), 'specify-agent', (block) => ({ ...block, ruleTags: ['code', 'qa'] }));
  const withTags = withRules(tagged, TWO_RULES);
  const plan = planGeneration(withTags, realTemplates());

  it('F-03 AC-008 a block with tags gives an entry with those tags and the block description', () => {
    const entry = entryAt(plan, SPECIFY_AGENT);
    expect(entry.description).toBe('Drafts stories.md for the feature, after the main session asks its questions.');
    expect(entry.ruleTags).toEqual(['code', 'qa']);
    expect(entry.layout).toContain('Rule-set tags for this agent: code, qa.');
  });

  it('F-03 AC-008 a block with no tags gives an entry with no tags and the layout shows none', () => {
    const entry = entryAt(plan, `${AGENTS_DIR}plan.md`);
    expect(entry.ruleTags).toEqual([]);
    expect(entry.layout).toContain('Rule-set tags for this agent: none.');
  });
});

describe('F-03 AC-009 each rule entry has one rule file with its title and text', () => {
  const config = withRules(freshConfig(), TWO_RULES);
  const plan = planGeneration(config, realTemplates());

  it('F-03 AC-009 has one entry at .claude/rules/<id>.md for each entry of the config rules', () => {
    expect(pathsUnder(plan, RULES_DIR)).toEqual(config.rules.map((rule) => `${RULES_DIR}${rule.id}.md`));
  });

  it('F-03 AC-009 the layout of each rule carries its title and its text', () => {
    const code = entryAt(plan, `${RULES_DIR}code.md`);
    expect(code.layout).toContain('# Code rules');
    expect(code.layout).toContain('Keep the change small.');
    expect(code.layout).not.toMatch(/\{\{[^}]*\}\}/);
  });

  it('F-03 AC-009 a config with no rules has no rule entry (negative case)', () => {
    const none = planGeneration(withRules(freshConfig(), []), realTemplates());
    expect(pathsUnder(none, RULES_DIR)).toEqual([]);
  });

  it('F-03 AC-009 keeps the order of the file list with the agent and rule entries among the others', () => {
    expect(plan.map((entry) => entry.path)).toEqual(generate(config, realTemplates()).files.map((file) => file.path));
  });
});

describe('F-03 AC-012 agent entries carry description and tags; the other entries carry none', () => {
  const tagged = withRules(withAgent(freshConfig(), 'specify-agent', (block) => ({ ...block, ruleTags: ['code'] })), TWO_RULES);
  const plan = planGeneration(tagged, realTemplates());
  const flowCommandPaths = tagged.pipeline.blocks.flatMap((block) =>
    block.kind === 'flow' && block.enabled ? [`.claude/commands/${block.id}.md`] : [],
  );

  it('F-03 AC-012 an agent entry carries its path, layout, description and rule-set tags', () => {
    const entry = entryAt(plan, SPECIFY_AGENT);
    expect(entry.path).toBe(SPECIFY_AGENT);
    expect(entry.layout).toContain(entry.description);
    expect(entry.description).not.toBe('');
    expect(entry.ruleTags).toEqual(['code']);
  });

  it('F-03 AC-012 every entry that is neither an agent nor a flow command has empty description and tags', () => {
    const others = plan.filter((entry) => !entry.path.startsWith(AGENTS_DIR) && !flowCommandPaths.includes(entry.path));
    expect(others.length).toBeGreaterThan(0);
    for (const entry of others) {
      expect(entry.description, entry.path).toBe('');
      expect(entry.ruleTags, entry.path).toEqual([]);
    }
  });

  it('F-03 AC-012 a rule entry has empty description and tags', () => {
    const rule = entryAt(plan, `${RULES_DIR}qa.md`);
    expect(rule.description).toBe('');
    expect(rule.ruleTags).toEqual([]);
  });
});

describe('F-03 AC-015 planGeneration does not change the config it receives', () => {
  it('F-03 AC-015 accepts a deeply frozen config and returns the same plan as the unfrozen one', () => {
    const tagged = withAgent(freshConfig(), 'specify-agent', (block) => ({ ...block, ruleTags: ['code', 'qa'] }));
    const config = withRules(tagged, TWO_RULES);
    const unfrozen = planGeneration(structuredClone(config), realTemplates());
    const frozen = deepFreeze(structuredClone(config));
    expect(() => planGeneration(frozen, realTemplates())).not.toThrow();
    expect(planGeneration(frozen, realTemplates())).toEqual(unfrozen);
  });

  it('F-03 AC-015 leaves the frozen config as it was', () => {
    const config = deepFreeze(withRules(freshConfig(), TWO_RULES));
    const before = JSON.stringify(config);
    planGeneration(config, realTemplates());
    expect(JSON.stringify(config)).toBe(before);
  });
});
