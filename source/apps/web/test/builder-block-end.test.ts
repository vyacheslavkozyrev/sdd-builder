import { describe, expect, it } from 'vitest';
import { pipeline as core } from '@sddbuilder/core';
import { addBlock } from '../src/builder/blocks.js';
import {
  END_OUTCOMES,
  NO_OUTCOME_ARTIFACT_TEXT,
  type EndOutcome,
  editEndArtifact,
  editEndOutcome,
  producedArtifactChoices,
  producedArtifactNote,
} from '../src/builder/blockEnd.js';
import { editFlowArtifact, removeFlowArtifact, type Pipeline, type Rule } from '../src/builder/fields.js';

type Flow = core.Flow;
type Artifact = core.Artifact;
type Block = core.Block;

const RULES: readonly Rule[] = [{ index: 0, id: 'style', title: 'Style', text: 'Write plainly.' }];

// A flow with the required fields only: its artifacts and blocks are given.
function flow(id: string, artifacts: Artifact[], blocks: Block[] = [], next?: string): Flow {
  const base: Flow = {
    index: 0,
    id,
    name: id,
    description: `The ${id} step.`,
    arguments: [],
    body: `Do the ${id} work.`,
    artifacts,
    approval: true,
    blocks,
  };
  return next === undefined ? base : { ...base, next };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((item, index) => ({ ...item, index })),
  };
}

// The `specify` flow with two outcome artifacts, the End `finish` naming `stories.md`, and the flow `build`
// after it, so no link problem is reported.
function specifyPipeline(endBlocks: Block[]): Pipeline {
  return pipelineOf(
    flow(
      'specify',
      [
        { label: 'stories.md', template: 'the stories' },
        { label: 'design.md', template: 'the design' },
      ],
      [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'stories.md' }, ...endBlocks],
      'build',
    ),
    flow('build', [{ label: 'build.md', template: 'the build' }]),
  );
}

// The blocks of the flow `id` of a pipeline.
function blocksOf(pipelineState: Pipeline, id: string): readonly Block[] {
  const found = pipelineState.flows.find((item) => item.id === id);
  if (found === undefined) throw new Error(`no flow ${id}`);
  return found.blocks;
}

describe('F-12 AC-035 End outcome: done or stopped, a new End starts done', () => {
  it('F-12 AC-035 offers done and stopped as the outcomes', () => {
    expect(END_OUTCOMES).toEqual(['done', 'stopped']);
  });

  it('F-12 AC-035 a new End block starts with the outcome done and no produced artifact', () => {
    const added = addBlock(flow('plan', [{ label: 'plan.md', template: 'the plan' }]), 'end');
    expect(added.flow.blocks).toEqual([{ index: 0, id: added.blockId, kind: 'end', outcome: 'done', producedArtifact: '' }]);
  });

  it('F-12 AC-035 sets the outcome to stopped and keeps the other blocks and flows', () => {
    const saved = specifyPipeline([]);
    const result = editEndOutcome(saved, RULES, 'specify', 'finish', 'stopped');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(blocksOf(result.pipeline, 'specify')).toEqual([
      { index: 0, id: 'finish', kind: 'end', outcome: 'stopped', producedArtifact: 'stories.md' },
    ]);
    expect(result.pipeline.flows[1]).toEqual(saved.flows[1]);
    expect(blocksOf(saved, 'specify')[0]).toEqual({ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'stories.md' });
  });

  it('F-12 AC-035 refuses an outcome that is neither done nor stopped, and keeps the saved End', () => {
    const saved = specifyPipeline([]);
    const result = editEndOutcome(saved, RULES, 'specify', 'finish', 'maybe' as EndOutcome);
    expect(result).toEqual({ ok: false, field: 'outcome', reason: 'must be done or stopped, got text' });
    expect(blocksOf(saved, 'specify')[0]).toEqual({
      index: 0,
      id: 'finish',
      kind: 'end',
      outcome: 'done',
      producedArtifact: 'stories.md',
    });
  });

  it('F-12 AC-035 an edit on a block that is not an End is a programmer error', () => {
    const saved = pipelineOf(
      flow('plan', [{ label: 'plan.md', template: 'the plan' }], [{ index: 0, id: 'start', kind: 'start', next: '' }]),
    );
    expect(() => editEndOutcome(saved, RULES, 'plan', 'start', 'done')).toThrow(
      'F-12: the block "start" of the flow "plan" is not an End',
    );
  });
});

describe('F-12 AC-036 End produced artifact: one of the flow outcome artifacts, required', () => {
  it('F-12 AC-036 offers the outcome artifact labels of the flow, in order, with no "none"', () => {
    const planFlow = flow('plan', [
      { label: 'plan.md', template: 'the plan' },
      { label: 'spec.md', template: 'the spec' },
    ]);
    expect(producedArtifactChoices(planFlow)).toEqual(['plan.md', 'spec.md']);
    expect(producedArtifactChoices(planFlow)).not.toContain('none');
    expect(producedArtifactNote(planFlow)).toBeUndefined();
  });

  it('F-12 AC-036 a flow with no outcome artifacts offers no choice and reads the add-first text', () => {
    const empty = flow('plan', []);
    expect(producedArtifactChoices(empty)).toEqual([]);
    expect(producedArtifactNote(empty)).toBe('Add an outcome artifact on the flow panel first.');
    expect(NO_OUTCOME_ARTIFACT_TEXT).toBe('Add an outcome artifact on the flow panel first.');
  });

  it('F-12 AC-036 sets the produced artifact to another outcome artifact of the flow', () => {
    const saved = specifyPipeline([]);
    const result = editEndArtifact(saved, RULES, 'specify', 'finish', 'design.md');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(blocksOf(result.pipeline, 'specify')[0]).toEqual({
      index: 0,
      id: 'finish',
      kind: 'end',
      outcome: 'done',
      producedArtifact: 'design.md',
    });
  });

  it('F-12 AC-036 refuses a produced artifact that is not an outcome artifact of the flow, and keeps the saved one', () => {
    const saved = specifyPipeline([]);
    const result = editEndArtifact(saved, RULES, 'specify', 'finish', 'build.md');
    expect(result).toEqual({
      ok: false,
      field: 'producedArtifact',
      reason: 'must name an artifact of this flow, got build.md',
    });
    expect(blocksOf(saved, 'specify')[0]).toEqual({
      index: 0,
      id: 'finish',
      kind: 'end',
      outcome: 'done',
      producedArtifact: 'stories.md',
    });
  });

  it('F-12 AC-036 refuses a blank produced artifact, since the field is required', () => {
    const result = editEndArtifact(specifyPipeline([]), RULES, 'specify', 'finish', '');
    expect(result).toEqual({ ok: false, field: 'producedArtifact', reason: 'must be at least 1 character' });
  });
});

describe('F-12 AC-037 an outcome artifact named by an End moves or renames with the End', () => {
  it('F-12 AC-037 removing the artifact an End names moves that End to the first remaining outcome', () => {
    const saved = specifyPipeline([]);
    const result = removeFlowArtifact(saved, RULES, 'specify', 0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(blocksOf(result.pipeline, 'specify')).toEqual([
      { index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'design.md' },
    ]);
  });

  it('F-12 AC-037 renaming the artifact an End names renames the End reference to it', () => {
    const saved = specifyPipeline([]);
    const result = editFlowArtifact(saved, RULES, 'specify', 0, { field: 'label', value: 'brief.md' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(blocksOf(result.pipeline, 'specify')).toEqual([
      { index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'brief.md' },
    ]);
  });

  it('F-12 AC-037 removing the flow only outcome is refused and the End keeps the artifact', () => {
    const saved = pipelineOf(
      flow(
        'plan',
        [{ label: 'plan.md', template: 'the plan' }],
        [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' }],
        'build',
      ),
      flow('build', []),
    );
    const before = structuredClone(saved);
    const result = removeFlowArtifact(saved, RULES, 'plan', 0);
    expect(result).toEqual({
      ok: false,
      reason:
        'This is the only outcome of this flow, and its End block produces it. Add another outcome first; then this one can be removed.',
    });
    expect(saved).toEqual(before);
    expect(saved.flows[0]?.blocks).toEqual([
      { index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
    ]);
  });
});

describe('F-12 AC-038 a flow may hold more than one End, each with its own outcome and artifact', () => {
  it('F-12 AC-038 accepts a second End with its own outcome and produced artifact', () => {
    const saved = specifyPipeline([{ index: 1, id: 'halt', kind: 'end', outcome: 'stopped', producedArtifact: 'design.md' }]);
    const result = editEndOutcome(saved, RULES, 'specify', 'halt', 'done');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(blocksOf(result.pipeline, 'specify')).toEqual([
      { index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'stories.md' },
      { index: 1, id: 'halt', kind: 'end', outcome: 'done', producedArtifact: 'design.md' },
    ]);
  });

  it('F-12 AC-038 an edit to one End leaves the other End as it was', () => {
    const saved = specifyPipeline([{ index: 1, id: 'halt', kind: 'end', outcome: 'stopped', producedArtifact: 'design.md' }]);
    const result = editEndArtifact(saved, RULES, 'specify', 'finish', 'design.md');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(blocksOf(result.pipeline, 'specify')[1]).toEqual({
      index: 1,
      id: 'halt',
      kind: 'end',
      outcome: 'stopped',
      producedArtifact: 'design.md',
    });
  });
});
