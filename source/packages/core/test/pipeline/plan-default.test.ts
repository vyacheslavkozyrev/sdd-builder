import { describe, expect, it } from 'vitest';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';

// The templates of these tests are fixtures: the shipped templates of the Claude Code layout come with F-05.
// The fixture texts are small and invented; the test only proves which files the default pipeline plans.
const fixtureTemplates: Templates = {
  base: [
    { path: 'CLAUDE.md', text: '# Fixture\n', headings: [] },
    { path: 'spec/documents/process.md', text: '{{processList}}\n', headings: [] },
    { path: 'spec/specifications/F-00-template/stories.md', text: '# Stories\n', headings: [] },
    { path: 'spec/specifications/F-00-template/plan.md', text: '# Plan\n', headings: [] },
  ],
  pipelineCommand: { text: 'pipeline {{argumentList}}\n', headings: [] },
  command: { text: 'flow {{flowId}}\n', headings: [] },
  agent: { text: 'agent {{name}}\n', headings: [] },
  rule: { text: 'rule {{ruleTitle}}\n', headings: [] },
};

// The default pipeline as a ProjectConfig, parsed from the imported data at the same boundary the API uses.
function defaultConfig() {
  const result = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: structuredClone(defaultPipeline) });
  if (!result.ok) {
    throw new Error('the default pipeline does not parse');
  }
  return result.config;
}

// The planned paths of the default pipeline with the fixture templates, in planned (code-point) order.
function defaultPaths(): string[] {
  const plan = planGeneration(defaultConfig(), fixtureTemplates);
  if (!plan.ok) {
    throw new Error('the default pipeline is refused');
  }
  return plan.files.map((file) => file.path);
}

describe('F-04 AC-005 the default pipeline plans without a blocker (fixture templates, F-05 ships the real ones)', () => {
  it('F-04 AC-005 plans the default pipeline without a blocker', () => {
    const plan = planGeneration(defaultConfig(), fixtureTemplates);
    expect(plan.ok).toBe(true);
  });

  it('F-04 AC-005 plans pipeline.md, one command file per child flow and one agent file per Agent block', () => {
    expect(defaultPaths()).toEqual([
      '.claude/agents/commit.md',
      '.claude/agents/complete.md',
      '.claude/agents/implement.md',
      '.claude/agents/plan.md',
      '.claude/agents/review.md',
      '.claude/agents/specify.md',
      '.claude/agents/test.md',
      '.claude/agents/ux.md',
      '.claude/agents/verify.md',
      '.claude/commands/build.md',
      '.claude/commands/complete.md',
      '.claude/commands/pipeline.md',
      '.claude/commands/plan.md',
      '.claude/commands/specify.md',
      '.claude/commands/ux.md',
      '.claude/commands/verify.md',
      'CLAUDE.md',
      'spec/documents/process.md',
      'spec/specifications/F-00-template/plan.md',
      'spec/specifications/F-00-template/stories.md',
    ]);
  });

  it('F-04 AC-005 plans the pipeline command file at .claude/commands/pipeline.md', () => {
    expect(defaultPaths()).toContain('.claude/commands/pipeline.md');
  });

  it('F-04 AC-005 plans one command file for each child flow of the default pipeline', () => {
    const flowIds = defaultConfig().pipeline.flows.map((flow) => flow.id);
    const commandPaths = defaultPaths().filter(
      (path) => path.startsWith('.claude/commands/') && path !== '.claude/commands/pipeline.md',
    );
    expect(commandPaths).toEqual(flowIds.map((id) => `.claude/commands/${id}.md`).sort());
  });

  it('F-04 AC-005 plans one agent file for each Agent block of the default pipeline', () => {
    const config = defaultConfig();
    const agentNames = config.pipeline.flows.flatMap((flow) =>
      flow.blocks.flatMap((block) => (block.kind === 'agent' ? [block.name] : [])),
    );
    const agentPaths = defaultPaths().filter((path) => path.startsWith('.claude/agents/'));
    expect(agentPaths).toEqual(agentNames.map((name) => `.claude/agents/${name}.md`).sort());
    expect(agentPaths).toHaveLength(9);
  });
});
