import { describe, expect, it } from 'vitest';
import { pipeline as core } from '@sddbuilder/core';
import { addBlock } from '../src/builder/blocks.js';
import { flowArrows } from '../src/builder/blockArrows.js';
import { linkBlocks } from '../src/builder/blockLink.js';
import { editAgentField } from '../src/builder/blockFields.js';
import { setConditionRoundLimit } from '../src/builder/blockCondition.js';
import type { Pipeline, Rule } from '../src/builder/fields.js';

type Block = core.Block;

const RULES: readonly Rule[] = [{ index: 0, id: '98e1e77f-fb50-5bd4-bd43-d48a78098c65', title: 'Plain style', text: 'Write plainly.' }];

// A pipeline with one empty flow `plan`, built the way the flow tab builds it: each step returns the new pipeline.
function emptyPipeline(): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: [{ index: 0, id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', name: 'plan', arguments: [], body: 'Plan.', artifacts: [], approval: false, blocks: [] }],
  } as unknown as Pipeline;
}

// The blocks of the flow `plan` of a pipeline.
function blocksOf(pipelineState: Pipeline): readonly Block[] {
  const flow = pipelineState.flows[0];
  if (flow === undefined) throw new Error('no flow plan');
  return flow.blocks;
}

// Adds a block of the kind as the toolbox does and returns the pipeline and the new block id.
function added(pipelineState: Pipeline, kind: Block['kind']): { pipeline: Pipeline; id: string } {
  const flow = pipelineState.flows[0]!;
  const result = addBlock(flow, kind);
  const next = { ...pipelineState, flows: [{ ...flow, blocks: result.flow.blocks }] } as unknown as Pipeline;
  return { pipeline: next, id: result.blockId };
}

// The pipeline with the link of an output set, as the flow tab sets it; a refused link is a test failure here.
function linked(pipelineState: Pipeline, from: string, output: 'next' | 'true' | 'false', to: string): Pipeline {
  const flow = pipelineState.flows[0]!;
  const result = linkBlocks(flow, from, output, to);
  if (!result.ok) throw new Error(`link refused: ${result.reason}`);
  return { ...pipelineState, flows: [result.flow] } as unknown as Pipeline;
}

// The pipeline with an Agent's name set, as the panel sets it.
function named(pipelineState: Pipeline, id: string, name: string): Pipeline {
  const result = editAgentField(pipelineState, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', id, { field: 'name', value: name } as never);
  if (!result.ok) throw new Error(`name refused: ${result.reason}`);
  return result.pipeline as Pipeline;
}

// The return and order problems the structural analysis reports at the routes of the flow `plan`. An empty route
// is not counted: it is an output with no arrow yet.
function routeFindings(pipelineState: Pipeline): string[] {
  return core
    .analyzeStructure({ schemaVersion: 2, rules: RULES as never, pipeline: pipelineState as never })
    .filter((finding) => /\.blocks\.\d+\.(true|false)\.to$/.test(finding.path))
    .filter((finding) => /later block|earlier agent/.test(finding.message))
    .map((finding) => `${finding.path}: ${finding.message}`);
}

// Start, the Agent `specify`, the Agent `stories-analyzer` reached before the Condition, the Condition and the End.
// The Condition's true route is the case the device check reported: its target is an Agent reached before it.
function flowWithStoriesBeforeCondition(): { pipeline: Pipeline; specify: string; stories: string; condition: string } {
  let state = emptyPipeline();
  const start = added(state, 'start');
  state = start.pipeline;
  const specify = added(state, 'agent');
  state = named(specify.pipeline, specify.id, 'specify');
  const stories = added(state, 'agent');
  state = named(stories.pipeline, stories.id, 'stories-analyzer');
  const condition = added(state, 'condition');
  state = condition.pipeline;
  state = added(state, 'end').pipeline;
  state = linked(state, start.id, 'next', specify.id);
  state = linked(state, specify.id, 'next', stories.id);
  state = linked(state, stories.id, 'next', condition.id);
  return { pipeline: state, specify: specify.id, stories: stories.id, condition: condition.id };
}

describe('F-12 AC-016 AC-017 the builder and the analyzer agree on a return', () => {
  it('F-12 AC-016 refuses a true route to an Agent reached before its Condition', () => {
    const { pipeline, condition, stories } = flowWithStoriesBeforeCondition();
    const flow = pipeline.flows[0]!;

    const result = linkBlocks(flow, condition, 'true', stories);

    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.reason).toBe('Only a false route can return to an earlier Agent.');
  });

  it('F-12 AC-017 draws a false route to an Agent reached before its Condition as a return', () => {
    const { pipeline, condition, stories } = flowWithStoriesBeforeCondition();
    const forward = linked(pipeline, condition, 'false', stories);

    const arrow = flowArrows(forward.flows[0]!).find((item) => item.fromId === condition && item.output === 'false');

    expect(arrow?.isReturn).toBe(true);
  });

  it('F-12 AC-017 sets the round limit of a false route to an earlier Agent as a return', () => {
    const { pipeline, condition, specify } = flowWithStoriesBeforeCondition();
    const returned = linked(pipeline, condition, 'false', specify);

    const result = setConditionRoundLimit(returned, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', condition, '3');
    if (!result.ok) throw new Error(result.reason);

    expect(routeFindings(result.pipeline)).toEqual([]);
  });

  it('F-12 AC-016 keeps a forward route to a later block drawn forward', () => {
    const { pipeline, condition, specify } = flowWithStoriesBeforeCondition();
    const returned = linked(pipeline, condition, 'false', specify);
    const withLimit = setConditionRoundLimit(returned, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', condition, '3');
    if (!withLimit.ok) throw new Error(withLimit.reason);
    const ended = blocksOf(withLimit.pipeline).find((block) => block.kind === 'end')!.id;
    const done = linked(withLimit.pipeline, condition, 'true', ended);

    const arrows = flowArrows(done.flows[0]!);

    expect(arrows.find((item) => item.fromId === condition && item.output === 'true')?.isReturn).toBe(false);
    expect(arrows.find((item) => item.fromId === condition && item.output === 'false')?.isReturn).toBe(true);
    expect(routeFindings(done)).toEqual([]);
  });
});
