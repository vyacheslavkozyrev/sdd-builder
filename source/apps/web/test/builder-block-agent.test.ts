import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import {
  addAgentArgument,
  addAgentRuleTag,
  addAgentTool,
  editAgentArgument,
  removeAgentArgument,
  removeAgentRuleTag,
  removeAgentTool,
  setAgentModel,
  type AgentListResult,
} from '../src/builder/blockAgentFields.js';
import type { Pipeline, Rule } from '../src/builder/fields.js';

type Block = model.Block;
type AgentBlock = model.AgentBlock;

const RULES: readonly Rule[] = [
  { index: 0, id: '98e1e77f-fb50-5bd4-bd43-d48a78098c65', title: 'Plain style', text: 'Write plainly.' },
  { index: 1, id: '0c71d478-327b-5b57-b985-9e4352721ab6', title: 'No secrets', text: 'Keep secrets out.' },
];

// A pipeline with a plan flow that runs start, review, write, end, and a build flow with its own artifact.
// Agent `review` is the first Agent of the plan flow, `write` the second; both flows parse without problems.
function savedPipeline(): Pipeline {
  const planBlocks: Block[] = [
    { index: 0, id: '15e362eb-af40-5e75-8c68-8ac7e7fc6a9e', kind: 'start', next: '3220de8a-cda2-5056-9296-97da044f7176' },
    {
      index: 1,
      id: '3220de8a-cda2-5056-9296-97da044f7176',
      kind: 'agent',
      name: 'review',
      description: 'Reviews the plan.',
      arguments: [{ index: 0, id: '82f01964-ec89-5b1a-8ccc-5a29c72f2adf', required: true, hint: 'The feature.' }],
      next: '39f36fe8-3090-5888-a796-75a0ad01bcfe',
      model: 'sonnet',
      tools: ['Read'],
    },
    {
      index: 2,
      id: '39f36fe8-3090-5888-a796-75a0ad01bcfe',
      kind: 'agent',
      name: 'write',
      description: 'Writes the code.',
      arguments: [],
      next: 'e9921352-41c9-5771-a013-0c63c6a49697',
      body: 'Write the code for the plan.',
    },
    { index: 3, id: 'e9921352-41c9-5771-a013-0c63c6a49697', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ];
  const buildBlocks: Block[] = [
    { index: 0, id: 'begin', kind: 'start', next: '5f555f10-723d-5e0b-94a7-3933be0a0850' },
    { index: 1, id: '5f555f10-723d-5e0b-94a7-3933be0a0850', kind: 'end', outcome: 'done', producedArtifact: 'code.md' },
  ];
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: [
      {
        index: 0,
        id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
        name: 'Plan',
        arguments: [],
        body: 'Plan the work.',
        artifacts: [{ label: 'plan.md', template: 'output.md' }],
        approval: true,
        blocks: planBlocks,
      },
      {
        index: 1,
        id: 'a0c3aad4-8765-5b23-8df5-7c03d481233c',
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
      addAgentArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', { id: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038', required: false, hint: 'The topic.' }),
    );
    expect(agentOf(next, '3220de8a-cda2-5056-9296-97da044f7176').arguments).toEqual([
      { index: 0, id: '82f01964-ec89-5b1a-8ccc-5a29c72f2adf', required: true, hint: 'The feature.' },
      { index: 1, id: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038', required: false, hint: 'The topic.' },
    ]);
  });

  it('F-12 AC-022 refuses an argument row whose id is not file-safe and keeps the saved rows', () => {
    const saved = savedPipeline();
    const refused = refusedOf(
      addAgentArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', { id: 'bad id', required: false, hint: '' }),
    );
    expect(refused.field).toBe('arguments');
    expect(refused.reason).toBe('must be a GUID');
    expect(agentOf(saved, '3220de8a-cda2-5056-9296-97da044f7176').arguments).toHaveLength(1);
  });

  it('F-12 AC-022 refuses an argument row whose id another argument of the project already uses', () => {
    const saved = savedPipeline();
    const refused = refusedOf(
      addAgentArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', { id: '82f01964-ec89-5b1a-8ccc-5a29c72f2adf', required: false, hint: '' }),
    );
    expect(refused.field).toBe('arguments');
    expect(refused.reason).toBe('must be unique: the id 82f01964-ec89-5b1a-8ccc-5a29c72f2adf is already used at pipeline.flows.0.blocks.1.arguments.0.id');
    expect(agentOf(saved, '3220de8a-cda2-5056-9296-97da044f7176').arguments).toHaveLength(1);
  });

  it('F-12 AC-022 throws when an argument row to edit or remove is not there', () => {
    const saved = savedPipeline();
    expect(() => editAgentArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', 3, { id: 'x', required: false, hint: '' })).toThrow(
      /has no argument/,
    );
    expect(() => removeAgentArgument(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', 1)).toThrow(/has no argument at position 1/);
  });

  it('F-12 AC-022 edits an argument row in place and refuses a hint of more than 100 characters', () => {
    const saved = savedPipeline();
    const next = acceptedOf(
      editAgentArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', 0, { id: '82f01964-ec89-5b1a-8ccc-5a29c72f2adf', required: false, hint: 'Short.' }),
    );
    expect(agentOf(next, '3220de8a-cda2-5056-9296-97da044f7176').arguments[0]).toEqual({ index: 0, id: '82f01964-ec89-5b1a-8ccc-5a29c72f2adf', required: false, hint: 'Short.' });

    const refused = refusedOf(
      editAgentArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', 0, {
        id: '82f01964-ec89-5b1a-8ccc-5a29c72f2adf',
        required: true,
        hint: 'x'.repeat(101),
      }),
    );
    expect(refused.field).toBe('arguments');
    expect(agentOf(saved, '3220de8a-cda2-5056-9296-97da044f7176').arguments[0]?.hint).toBe('The feature.');
  });

  it('F-12 AC-022 removes an argument row and renumbers the rows after it', () => {
    const saved = savedPipeline();
    const withTwo = acceptedOf(
      addAgentArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', { id: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038', required: false, hint: '' }),
    );
    const next = removeAgentArgument(withTwo, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', 0);
    expect(agentOf(next, '3220de8a-cda2-5056-9296-97da044f7176').arguments).toEqual([{ index: 0, id: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038', required: false, hint: '' }]);
  });

  it('F-12 AC-022 throws for an argument row that is not there', () => {
    expect(() => removeAgentArgument(savedPipeline(), 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', 5)).toThrow(/has no argument at position 5/);
  });
});

describe('F-12 AC-022 Agent tools', () => {
  it('F-12 AC-022 adds a trimmed tool after the saved tools', () => {
    const next = acceptedOf(addAgentTool(savedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', '  Write  '));
    expect(agentOf(next, '3220de8a-cda2-5056-9296-97da044f7176').tools).toEqual(['Read', 'Write']);
  });

  it('F-12 AC-022 adds nothing for a blank tool', () => {
    const saved = savedPipeline();
    const next = acceptedOf(addAgentTool(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', '   '));
    expect(next).toBe(saved);
  });

  it('F-12 AC-022 refuses a tool of more than 100 characters and keeps the saved tools', () => {
    const saved = savedPipeline();
    const refused = refusedOf(addAgentTool(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', 'x'.repeat(101)));
    expect(refused.field).toBe('tools');
    expect(agentOf(saved, '3220de8a-cda2-5056-9296-97da044f7176').tools).toEqual(['Read']);
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) refuses a tool the Agent already lists, with the reason, and keeps the saved tools', () => {
    const saved = savedPipeline();
    const refused = refusedOf(addAgentTool(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', '  Read  '));
    expect(refused.field).toBe('tools');
    expect(refused.reason).toBe('repeats Read; each tool must be listed once');
    expect(agentOf(saved, '3220de8a-cda2-5056-9296-97da044f7176').tools).toEqual(['Read']);
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) accepts a tool that another Agent lists', () => {
    const next = acceptedOf(addAgentTool(savedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '39f36fe8-3090-5888-a796-75a0ad01bcfe', 'Read'));
    expect(agentOf(next, '39f36fe8-3090-5888-a796-75a0ad01bcfe').tools).toEqual(['Read']);
  });

  it('F-12 AC-022 removes the tool at the position and keeps the others in order', () => {
    const withTwo = acceptedOf(addAgentTool(savedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', 'Edit'));
    const next = removeAgentTool(withTwo, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', 0);
    expect(agentOf(next, '3220de8a-cda2-5056-9296-97da044f7176').tools).toEqual(['Edit']);
  });

  it('F-12 AC-022 throws when the tool to remove is not there', () => {
    expect(() => removeAgentTool(savedPipeline(), 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', 1)).toThrow(/has no tool at position 1/);
  });
});

describe('F-12 AC-025 Agent model', () => {
  it.each(['haiku', 'sonnet', 'opus', 'inherit'])('F-12 AC-025 accepts the model %s', (value) => {
    const next = acceptedOf(setAgentModel(savedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '39f36fe8-3090-5888-a796-75a0ad01bcfe', value));
    expect(agentOf(next, '39f36fe8-3090-5888-a796-75a0ad01bcfe').model).toBe(value);
  });

  it.each(['gpt-4', 'Sonnet', ' haiku', ''])('F-12 AC-025 refuses the model %j and keeps the saved model', (value) => {
    const saved = savedPipeline();
    const refused = refusedOf(setAgentModel(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', value));
    expect(refused.field).toBe('model');
    expect(refused.reason).toMatch(/^must be one of haiku, sonnet, opus, inherit, got /);
    expect(agentOf(saved, '3220de8a-cda2-5056-9296-97da044f7176').model).toBe('sonnet');
  });

  it('F-12 AC-025 unsets the model when the value is undefined', () => {
    const next = acceptedOf(setAgentModel(savedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', undefined));
    expect(agentOf(next, '3220de8a-cda2-5056-9296-97da044f7176')).not.toHaveProperty('model');
  });
});

describe('F-12 AC-027 Agent rule tags', () => {
  it('F-12 AC-027 adds a rule tag that names a rule of the project', () => {
    const next = acceptedOf(addAgentRuleTag(savedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '39f36fe8-3090-5888-a796-75a0ad01bcfe', '98e1e77f-fb50-5bd4-bd43-d48a78098c65'));
    expect(agentOf(next, '39f36fe8-3090-5888-a796-75a0ad01bcfe').ruleTags).toEqual([{ index: 0, ruleId: '98e1e77f-fb50-5bd4-bd43-d48a78098c65' }]);
  });

  it('F-12 AC-027 refuses a rule that the project does not have, with the reason', () => {
    const saved = savedPipeline();
    const refused = refusedOf(addAgentRuleTag(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '39f36fe8-3090-5888-a796-75a0ad01bcfe', 'df24e1e0-8855-56fe-88da-4c36c28d4846'));
    expect(refused.field).toBe('ruleTags');
    expect(refused.reason).toBe('must name a rule of this project, got df24e1e0-8855-56fe-88da-4c36c28d4846');
    expect(agentOf(saved, '39f36fe8-3090-5888-a796-75a0ad01bcfe').ruleTags).toBeUndefined();
  });

  it('F-12 AC-027 refuses a rule tag the Agent already has', () => {
    const tagged = acceptedOf(addAgentRuleTag(savedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '39f36fe8-3090-5888-a796-75a0ad01bcfe', '98e1e77f-fb50-5bd4-bd43-d48a78098c65'));
    const refused = refusedOf(addAgentRuleTag(tagged, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '39f36fe8-3090-5888-a796-75a0ad01bcfe', '98e1e77f-fb50-5bd4-bd43-d48a78098c65'));
    expect(refused.field).toBe('ruleTags');
    expect(refused.reason).toBe('repeats 98e1e77f-fb50-5bd4-bd43-d48a78098c65; each entry must be listed once');
  });

  it('F-12 AC-027 removes a rule tag and renumbers the tags after it', () => {
    const tagged = acceptedOf(addAgentRuleTag(savedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '39f36fe8-3090-5888-a796-75a0ad01bcfe', '98e1e77f-fb50-5bd4-bd43-d48a78098c65'));
    const twice = acceptedOf(addAgentRuleTag(tagged, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '39f36fe8-3090-5888-a796-75a0ad01bcfe', '0c71d478-327b-5b57-b985-9e4352721ab6'));
    const next = removeAgentRuleTag(twice, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '39f36fe8-3090-5888-a796-75a0ad01bcfe', 0);
    expect(agentOf(next, '39f36fe8-3090-5888-a796-75a0ad01bcfe').ruleTags).toEqual([{ index: 0, ruleId: '0c71d478-327b-5b57-b985-9e4352721ab6' }]);
  });

  it('F-12 AC-027 throws when the rule tag to remove is not there', () => {
    expect(() => removeAgentRuleTag(savedPipeline(), 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '39f36fe8-3090-5888-a796-75a0ad01bcfe', 0)).toThrow(/has no rule tag at position 0/);
  });
});

describe('F-12 AC-029 Agent list edits keep the rest of the pipeline', () => {
  it('F-12 AC-029 changes only the edited Agent: its arrows and the other blocks are kept', () => {
    const saved = savedPipeline();
    const next = acceptedOf(addAgentTool(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '3220de8a-cda2-5056-9296-97da044f7176', 'Edit'));
    const before = saved.flows[0]?.blocks.filter((block) => block.id !== '3220de8a-cda2-5056-9296-97da044f7176');
    const after = next.flows[0]?.blocks.filter((block) => block.id !== '3220de8a-cda2-5056-9296-97da044f7176');
    expect(after).toEqual(before);
    expect(agentOf(next, '3220de8a-cda2-5056-9296-97da044f7176').next).toBe('39f36fe8-3090-5888-a796-75a0ad01bcfe');
    expect(next.flows[1]).toEqual(saved.flows[1]);
  });

  it('F-12 AC-029 throws when the block is not an Agent', () => {
    expect(() => setAgentModel(savedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '15e362eb-af40-5e75-8c68-8ac7e7fc6a9e', 'haiku')).toThrow(/is not an Agent/);
  });
});
