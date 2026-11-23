import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import {
  addAgentArgument,
  addAgentLabel,
  addAgentRuleTag,
  addAgentTool,
  artifactLabelsOf,
  editAgentArgument,
  removeAgentArgument,
  removeAgentLabel,
  removeAgentRuleTag,
  removeAgentTool,
  setAgentModel,
  type AgentListResult,
} from '../src/builder/blockAgentFields.js';
import type { Pipeline, Rule } from '../src/builder/fields.js';

type Block = model.Block;
type AgentBlock = model.AgentBlock;

const RULES: readonly Rule[] = [
  { index: 0, id: 'plain-style', title: 'Plain style', text: 'Write plainly.' },
  { index: 1, id: 'no-secrets', title: 'No secrets', text: 'Keep secrets out.' },
];

// A pipeline with a plan flow that runs start, review, write, end, and a build flow with its own artifact.
// Agent `review` is the first Agent of the plan flow, `write` the second; both flows parse without problems.
function savedPipeline(): Pipeline {
  const planBlocks: Block[] = [
    { index: 0, id: 'start', kind: 'start', next: 'review' },
    {
      index: 1,
      id: 'review',
      kind: 'agent',
      name: 'review',
      description: 'Reviews the plan.',
      arguments: [{ index: 0, id: 'feature-id', required: true, hint: 'The feature.' }],
      next: 'write',
      model: 'sonnet',
      tools: ['Read'],
      reads: ['plan.md'],
    },
    {
      index: 2,
      id: 'write',
      kind: 'agent',
      name: 'write',
      description: 'Writes the code.',
      arguments: [],
      next: 'done',
      body: 'Write the code for the plan.',
      writes: ['plan.md'],
    },
    { index: 3, id: 'done', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ];
  const buildBlocks: Block[] = [
    { index: 0, id: 'begin', kind: 'start', next: 'finish' },
    { index: 1, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'code.md' },
  ];
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: [
      {
        index: 0,
        id: 'plan',
        name: 'Plan',
        arguments: [],
        body: 'Plan the work.',
        artifacts: [{ label: 'plan.md', template: 'output.md' }],
        approval: true,
        blocks: planBlocks,
      },
      {
        index: 1,
        id: 'build',
        name: 'Build',
        arguments: [],
        body: 'Build the work.',
        artifacts: [{ label: 'code.md', template: 'output.md' }],
        approval: false,
        blocks: buildBlocks,
      },
    ],
  };
}

function agentOf(pipelineState: Pipeline, id: string): AgentBlock {
  const block = pipelineState.flows[0]?.blocks.find((item) => item.id === id);
  if (block === undefined || block.kind !== 'agent') throw new Error(`no Agent ${id}`);
  return block;
}

// The result of an edit that must have been accepted; a refusal fails the test with its reason.
function acceptedOf(result: AgentListResult): Pipeline {
  if (!result.ok) throw new Error(`expected the edit to be accepted, refused: ${result.reason}`);
  return result.pipeline;
}

// The result of an edit that must have been refused; an accepted edit fails the test.
function refusedOf(result: AgentListResult) {
  if (result.ok) throw new Error('expected the edit to be refused');
  return result;
}

describe('F-12 AC-022 Agent argument rows', () => {
  it('F-12 AC-022 adds an argument row to the Agent after its saved rows', () => {
    const saved = savedPipeline();
    const next = acceptedOf(
      addAgentArgument(saved, RULES, 'plan', 'review', { id: 'topic', required: false, hint: 'The topic.' }),
    );
    expect(agentOf(next, 'review').arguments).toEqual([
      { index: 0, id: 'feature-id', required: true, hint: 'The feature.' },
      { index: 1, id: 'topic', required: false, hint: 'The topic.' },
    ]);
  });

  it('F-12 AC-022 refuses an argument row whose id is not file-safe and keeps the saved rows', () => {
    const saved = savedPipeline();
    const refused = refusedOf(
      addAgentArgument(saved, RULES, 'plan', 'review', { id: 'bad id', required: false, hint: '' }),
    );
    expect(refused.field).toBe('arguments');
    expect(refused.reason).toBe('must be an id: lowercase letters, digits and hyphens, starting with a letter, at most 60 characters');
    expect(agentOf(saved, 'review').arguments).toHaveLength(1);
  });

  it('F-12 AC-022 refuses an argument row whose id another argument of the project already uses', () => {
    const saved = savedPipeline();
    const refused = refusedOf(
      addAgentArgument(saved, RULES, 'plan', 'review', { id: 'feature-id', required: false, hint: '' }),
    );
    expect(refused.field).toBe('arguments');
    expect(refused.reason).toBe('must be unique: the id feature-id is already used at pipeline.flows.0.blocks.1.arguments.0.id');
    expect(agentOf(saved, 'review').arguments).toHaveLength(1);
  });

  it('F-12 AC-022 throws when an argument row to edit or remove is not there', () => {
    const saved = savedPipeline();
    expect(() => editAgentArgument(saved, RULES, 'plan', 'review', 3, { id: 'x', required: false, hint: '' })).toThrow(
      /has no argument/,
    );
    expect(() => removeAgentArgument(saved, 'plan', 'review', 1)).toThrow(/has no argument at position 1/);
  });

  it('F-12 AC-022 edits an argument row in place and refuses a hint of more than 100 characters', () => {
    const saved = savedPipeline();
    const next = acceptedOf(
      editAgentArgument(saved, RULES, 'plan', 'review', 0, { id: 'feature-id', required: false, hint: 'Short.' }),
    );
    expect(agentOf(next, 'review').arguments[0]).toEqual({ index: 0, id: 'feature-id', required: false, hint: 'Short.' });

    const refused = refusedOf(
      editAgentArgument(saved, RULES, 'plan', 'review', 0, {
        id: 'feature-id',
        required: true,
        hint: 'x'.repeat(101),
      }),
    );
    expect(refused.field).toBe('arguments');
    expect(agentOf(saved, 'review').arguments[0]?.hint).toBe('The feature.');
  });

  it('F-12 AC-022 removes an argument row and renumbers the rows after it', () => {
    const saved = savedPipeline();
    const withTwo = acceptedOf(
      addAgentArgument(saved, RULES, 'plan', 'review', { id: 'topic', required: false, hint: '' }),
    );
    const next = removeAgentArgument(withTwo, 'plan', 'review', 0);
    expect(agentOf(next, 'review').arguments).toEqual([{ index: 0, id: 'topic', required: false, hint: '' }]);
  });

  it('F-12 AC-022 throws for an argument row that is not there', () => {
    expect(() => removeAgentArgument(savedPipeline(), 'plan', 'review', 5)).toThrow(/has no argument at position 5/);
  });
});

describe('F-12 AC-022 Agent tools', () => {
  it('F-12 AC-022 adds a trimmed tool after the saved tools', () => {
    const next = acceptedOf(addAgentTool(savedPipeline(), RULES, 'plan', 'review', '  Write  '));
    expect(agentOf(next, 'review').tools).toEqual(['Read', 'Write']);
  });

  it('F-12 AC-022 adds nothing for a blank tool', () => {
    const saved = savedPipeline();
    const next = acceptedOf(addAgentTool(saved, RULES, 'plan', 'review', '   '));
    expect(next).toBe(saved);
  });

  it('F-12 AC-022 refuses a tool of more than 100 characters and keeps the saved tools', () => {
    const saved = savedPipeline();
    const refused = refusedOf(addAgentTool(saved, RULES, 'plan', 'review', 'x'.repeat(101)));
    expect(refused.field).toBe('tools');
    expect(agentOf(saved, 'review').tools).toEqual(['Read']);
  });

  it('F-12 AC-022 removes the tool at the position and keeps the others in order', () => {
    const withTwo = acceptedOf(addAgentTool(savedPipeline(), RULES, 'plan', 'review', 'Edit'));
    const next = removeAgentTool(withTwo, 'plan', 'review', 0);
    expect(agentOf(next, 'review').tools).toEqual(['Edit']);
  });

  it('F-12 AC-022 throws when the tool to remove is not there', () => {
    expect(() => removeAgentTool(savedPipeline(), 'plan', 'review', 1)).toThrow(/has no tool at position 1/);
  });
});

describe('F-12 AC-025 Agent model', () => {
  it.each(['haiku', 'sonnet', 'opus', 'inherit'])('F-12 AC-025 accepts the model %s', (value) => {
    const next = acceptedOf(setAgentModel(savedPipeline(), RULES, 'plan', 'write', value));
    expect(agentOf(next, 'write').model).toBe(value);
  });

  it.each(['gpt-4', 'Sonnet', ' haiku', ''])('F-12 AC-025 refuses the model %j and keeps the saved model', (value) => {
    const saved = savedPipeline();
    const refused = refusedOf(setAgentModel(saved, RULES, 'plan', 'review', value));
    expect(refused.field).toBe('model');
    expect(refused.reason).toMatch(/^must be one of haiku, sonnet, opus, inherit, got /);
    expect(agentOf(saved, 'review').model).toBe('sonnet');
  });

  it('F-12 AC-025 unsets the model when the value is undefined', () => {
    const next = acceptedOf(setAgentModel(savedPipeline(), RULES, 'plan', 'review', undefined));
    expect(agentOf(next, 'review')).not.toHaveProperty('model');
  });
});

describe('F-12 AC-026 Agent reads and writes', () => {
  it('F-12 AC-026 adds a label that is an outcome artifact of the plan flow', () => {
    const next = acceptedOf(addAgentLabel(savedPipeline(), RULES, 'plan', 'review', 'writes', 'plan.md'));
    expect(agentOf(next, 'review').writes).toEqual(['plan.md']);
  });

  it('F-12 AC-026 accepts a label that is an outcome artifact of another flow of the pipeline', () => {
    const next = acceptedOf(addAgentLabel(savedPipeline(), RULES, 'plan', 'review', 'reads', 'code.md'));
    expect(agentOf(next, 'review').reads).toEqual(['plan.md', 'code.md']);
  });

  it('F-12 AC-026 refuses a label that no flow lists as an outcome artifact, with the reason', () => {
    const saved = savedPipeline();
    const refused = refusedOf(addAgentLabel(saved, RULES, 'plan', 'review', 'reads', 'notes.md'));
    expect(refused.field).toBe('reads');
    expect(refused.reason).toBe('must name an outcome artifact of a flow, got notes.md');
    expect(agentOf(saved, 'review').reads).toEqual(['plan.md']);
  });

  it('F-12 AC-026 refuses a label that is listed twice and keeps the saved list', () => {
    const saved = savedPipeline();
    const refused = refusedOf(addAgentLabel(saved, RULES, 'plan', 'review', 'reads', 'plan.md'));
    expect(refused.field).toBe('reads');
    expect(refused.reason).toBe('repeats plan.md; each entry must be listed once');
    expect(agentOf(saved, 'review').reads).toEqual(['plan.md']);
  });

  it('F-12 AC-026 refuses a writes label that no flow lists as an outcome artifact, and keeps the saved list', () => {
    const saved = savedPipeline();
    const refused = refusedOf(addAgentLabel(saved, RULES, 'plan', 'write', 'writes', 'notes.md'));
    expect(refused.field).toBe('writes');
    expect(refused.reason).toBe('must name an outcome artifact of a flow, got notes.md');
    expect(agentOf(saved, 'write').writes).toEqual(['plan.md']);
  });

  it('F-12 AC-026 refuses a writes label that the Agent already lists', () => {
    const saved = savedPipeline();
    const refused = refusedOf(addAgentLabel(saved, RULES, 'plan', 'write', 'writes', 'plan.md'));
    expect(refused.field).toBe('writes');
    expect(refused.reason).toBe('repeats plan.md; each entry must be listed once');
  });

  it('F-12 AC-026 removes a label from the writes list', () => {
    const next = removeAgentLabel(savedPipeline(), 'plan', 'write', 'writes', 0);
    expect(agentOf(next, 'write').writes).toEqual([]);
  });

  it('F-12 AC-026 throws when the label to remove is not there', () => {
    expect(() => removeAgentLabel(savedPipeline(), 'plan', 'review', 'reads', 1)).toThrow(
      /has no reads label at position 1/,
    );
  });

  it('F-12 AC-026 lists the outcome artifacts of every flow once, in document order', () => {
    const saved = savedPipeline();
    expect(artifactLabelsOf(saved)).toEqual(['plan.md', 'code.md']);
    const doubled: Pipeline = {
      ...saved,
      flows: saved.flows.map((flow) => ({ ...flow, artifacts: [{ label: 'plan.md', template: 'output.md' }] })),
    };
    expect(artifactLabelsOf(doubled)).toEqual(['plan.md']);
  });
});

describe('F-12 AC-027 Agent rule tags', () => {
  it('F-12 AC-027 adds a rule tag that names a rule of the project', () => {
    const next = acceptedOf(addAgentRuleTag(savedPipeline(), RULES, 'plan', 'write', 'plain-style'));
    expect(agentOf(next, 'write').ruleTags).toEqual([{ index: 0, ruleId: 'plain-style' }]);
  });

  it('F-12 AC-027 refuses a rule that the project does not have, with the reason', () => {
    const saved = savedPipeline();
    const refused = refusedOf(addAgentRuleTag(saved, RULES, 'plan', 'write', 'unknown-rule'));
    expect(refused.field).toBe('ruleTags');
    expect(refused.reason).toBe('must name a rule of this project, got unknown-rule');
    expect(agentOf(saved, 'write').ruleTags).toBeUndefined();
  });

  it('F-12 AC-027 refuses a rule tag the Agent already has', () => {
    const tagged = acceptedOf(addAgentRuleTag(savedPipeline(), RULES, 'plan', 'write', 'plain-style'));
    const refused = refusedOf(addAgentRuleTag(tagged, RULES, 'plan', 'write', 'plain-style'));
    expect(refused.field).toBe('ruleTags');
    expect(refused.reason).toBe('repeats plain-style; each entry must be listed once');
  });

  it('F-12 AC-027 removes a rule tag and renumbers the tags after it', () => {
    const tagged = acceptedOf(addAgentRuleTag(savedPipeline(), RULES, 'plan', 'write', 'plain-style'));
    const twice = acceptedOf(addAgentRuleTag(tagged, RULES, 'plan', 'write', 'no-secrets'));
    const next = removeAgentRuleTag(twice, 'plan', 'write', 0);
    expect(agentOf(next, 'write').ruleTags).toEqual([{ index: 0, ruleId: 'no-secrets' }]);
  });

  it('F-12 AC-027 throws when the rule tag to remove is not there', () => {
    expect(() => removeAgentRuleTag(savedPipeline(), 'plan', 'write', 0)).toThrow(/has no rule tag at position 0/);
  });
});

describe('F-12 AC-029 Agent list edits keep the rest of the pipeline', () => {
  it('F-12 AC-029 changes only the edited Agent: its arrows and the other blocks are kept', () => {
    const saved = savedPipeline();
    const next = acceptedOf(addAgentTool(saved, RULES, 'plan', 'review', 'Edit'));
    const before = saved.flows[0]?.blocks.filter((block) => block.id !== 'review');
    const after = next.flows[0]?.blocks.filter((block) => block.id !== 'review');
    expect(after).toEqual(before);
    expect(agentOf(next, 'review').next).toBe('write');
    expect(next.flows[1]).toEqual(saved.flows[1]);
  });

  it('F-12 AC-029 throws when the block is not an Agent', () => {
    expect(() => setAgentModel(savedPipeline(), RULES, 'plan', 'start', 'haiku')).toThrow(/is not an Agent/);
  });
});
