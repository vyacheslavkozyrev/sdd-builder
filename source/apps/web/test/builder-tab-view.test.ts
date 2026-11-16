import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { flowTabView } from '../src/builder/tab-view.js';

type ProjectConfig = pipeline.ProjectConfig;
type PipelineBlock = pipeline.PipelineBlock;
type ChildBlock = pipeline.ChildBlock;
type FlowBlock = pipeline.FlowBlock;

const START: PipelineBlock = { kind: 'start', id: 'pipeline-start', enabled: true, arguments: [] };
const END: PipelineBlock = { kind: 'end', id: 'pipeline-end', enabled: true, outcome: 'done' };

function config(blocks: PipelineBlock[]): ProjectConfig {
  return { ...structuredClone(pipeline.defaultProjectConfig), pipeline: { name: 'P', blocks } };
}

function flow(id: string, blocks: ChildBlock[], extra: Partial<FlowBlock> = {}): FlowBlock {
  return { kind: 'flow', id, name: id.toUpperCase(), description: 'does work', enabled: true, blocks, ...extra };
}

/** A flow with every block kind: Start, Agent, Condition, Connection and End, in that order. */
function buildFlow(): FlowBlock {
  return flow('build', [
    { kind: 'start', id: 'build-start', enabled: true },
    {
      kind: 'agent',
      id: 'implement',
      enabled: true,
      name: 'implement',
      scope: 'task',
      description: 'writes the code',
      model: 'sonnet',
      tools: ['Read', 'Edit'],
      body: 'Implement one task.',
      reads: ['spec', 'plan'],
      writes: ['code'],
      ruleTags: ['typescript'],
    },
    {
      kind: 'condition',
      id: 'checks-gate',
      enabled: true,
      checkType: 'checks',
      decidedBy: 'agent',
      description: 'the checks pass.',
      passRoute: { kind: 'next' },
      failRoute: { kind: 'back', blockId: 'implement' },
      roundLimit: 3,
    },
    { kind: 'connection', id: 'implement-to-size', enabled: true, from: 'checks-gate', to: 'size-gate', artifact: ' code ' },
    {
      kind: 'condition',
      id: 'size-gate',
      enabled: false,
      checkType: 'diff-size',
      decidedBy: 'agent',
      description: 'the change is small.',
      threshold: 400,
      passRoute: { kind: 'next' },
      failRoute: { kind: 'stop' },
    },
    { kind: 'end', id: 'build-end', enabled: true, outcome: 'done', produced: 'the commit' },
  ]);
}

describe('F-06 AC-017 a flow tab shows its blocks in order, numbered, with the Start first and the End last', () => {
  it('F-06 AC-017 numbers the boxes from 1 in flow order, with the Start first and the End last', () => {
    const view = flowTabView(config([START, buildFlow(), END]), 'build');
    expect(view.boxes.map((box) => box.number)).toEqual([1, 2, 3, 4, 5]);
    expect(view.boxes.map((box) => box.id)).toEqual(['build-start', 'implement', 'checks-gate', 'size-gate', 'build-end']);
    expect(view.boxes[0]?.kind).toBe('start');
    expect(view.boxes.at(-1)?.kind).toBe('end');
  });

  it('F-06 AC-017 draws a Connection as an arrow with no number, between the numbers of its two blocks', () => {
    const view = flowTabView(config([START, buildFlow(), END]), 'build');
    expect(view.boxes.some((box) => box.id === 'implement-to-size')).toBe(false);
    expect(view.arrows).toEqual([
      {
        id: 'implement-to-size',
        from: 'checks-gate',
        to: 'size-gate',
        fromNumber: 3,
        toNumber: 4,
        label: 'code',
        enabled: true,
      },
    ]);
  });

  it('F-06 AC-017 shows a blank artifact label as null and an arrow to an unknown block with no number', () => {
    const blank = buildFlow();
    blank.blocks = blank.blocks.map((block) =>
      block.kind === 'connection' ? { ...block, artifact: '   ', to: 'nowhere' } : block,
    );
    const [arrow] = flowTabView(config([START, blank, END]), 'build').arrows;
    expect(arrow?.label).toBeNull();
    expect(arrow?.toNumber).toBeNull();
  });

  it('F-06 AC-017 gives each box a title and a subtitle, and keeps a switched-off block in place', () => {
    const view = flowTabView(config([START, buildFlow(), END]), 'build');
    expect(view.boxes.map((box) => [box.title, box.subtitle, box.enabled])).toEqual([
      ['Start', 'entry of the flow', true],
      ['implement', 'agent · task', true],
      ['checks', 'agent', true],
      ['diff-size', 'agent', false],
      ['End', 'done', true],
    ]);
  });

  it('F-06 AC-017 shows an empty flow with no boxes and no arrows', () => {
    const view = flowTabView(config([START, flow('empty', []), END]), 'empty');
    expect(view.boxes).toEqual([]);
    expect(view.arrows).toEqual([]);
  });

  it('F-06 AC-017 throws on an unknown flow id, as a programmer error', () => {
    expect(() => flowTabView(config([START, buildFlow(), END]), 'missing')).toThrow('Unknown flow id missing');
  });

  it('F-06 AC-017 throws on a selected id that is not a block of the flow', () => {
    expect(() => flowTabView(config([START, buildFlow(), END]), 'build', 'missing')).toThrow(
      'Unknown block id missing in flow build',
    );
  });
});

describe('F-06 AC-018 the flow toolbox holds Start, Agent, Condition, Connection and End, and refuses a second Start', () => {
  it('F-06 AC-018 offers the five kinds in order, with the toolbox hints', () => {
    const view = flowTabView(config([START, buildFlow(), END]), 'build');
    expect(view.toolbox.map((item) => item.kind)).toEqual(['start', 'agent', 'condition', 'connection', 'end']);
    expect(view.toolbox.map((item) => item.hint)).toEqual([
      'entry of the flow',
      'runs an agent',
      'check with pass and fail',
      'artifact handed over',
      'done or stopped',
    ]);
  });

  it('F-06 AC-018 disables the Start item with its reason when the flow already has a Start', () => {
    const [start] = flowTabView(config([START, buildFlow(), END]), 'build').toolbox;
    expect(start).toMatchObject({ kind: 'start', disabled: true, reason: 'A flow has one Start; this flow already has one.' });
  });

  it('F-06 AC-018 enables the Start item when the flow has no Start', () => {
    const [start] = flowTabView(config([START, flow('empty', []), END]), 'empty').toolbox;
    expect(start).toMatchObject({ kind: 'start', disabled: false, reason: null });
  });

  it('F-06 AC-018 keeps the other toolbox items enabled', () => {
    const view = flowTabView(config([START, buildFlow(), END]), 'build');
    expect(view.toolbox.slice(1).every((item) => !item.disabled && item.reason === null)).toBe(true);
  });
});

describe('F-06 AC-023 selecting a block or a flow opens its property panel with the properties of its kind', () => {
  const cfg = config([START, buildFlow(), END]);

  it('F-06 AC-023 opens the flow panel when nothing is selected, with its name, scope, count and description', () => {
    const view = flowTabView(cfg, 'build');
    expect(view.selected).toBe('build');
    expect(view.panel).toEqual({
      kind: 'flow',
      id: 'build',
      name: 'BUILD',
      description: 'does work',
      enabled: true,
      scope: 'task',
      blockCount: 6,
      ruleTags: [],
      generatedFile: '.claude/commands/build.md',
    });
  });

  it('F-06 AC-023 opens the Agent panel with name, description, scope, model, tools and body', () => {
    const view = flowTabView(cfg, 'build', 'implement');
    expect(view.selected).toBe('implement');
    expect(view.panel).toMatchObject({
      kind: 'agent',
      id: 'implement',
      enabled: true,
      name: 'implement',
      description: 'writes the code',
      scope: 'task',
      model: 'sonnet',
      tools: ['Read', 'Edit'],
      body: 'Implement one task.',
    });
  });

  it('F-06 AC-023 shows the reads and writes of an Agent block, in the order the model holds them', () => {
    expect(flowTabView(cfg, 'build', 'implement').panel).toMatchObject({
      kind: 'agent',
      reads: ['spec', 'plan'],
      writes: ['code'],
    });
  });

  it('F-06 AC-023 shows empty reads and writes when the Agent block has none set', () => {
    const plain = flow('plain', [
      { kind: 'start', id: 'plain-start', enabled: true },
      { kind: 'agent', id: 'a', enabled: true, name: 'a', scope: 'project', description: 'job' },
      { kind: 'end', id: 'plain-end', enabled: true, outcome: 'done' },
    ]);
    expect(flowTabView(config([START, plain, END]), 'plain', 'a').panel).toMatchObject({ reads: [], writes: [] });
  });

  it('F-06 AC-023 opens the Condition panel with check type, decider, description, threshold and routes', () => {
    expect(flowTabView(cfg, 'build', 'checks-gate').panel).toEqual({
      kind: 'condition',
      id: 'checks-gate',
      enabled: true,
      checkType: 'checks',
      decidedBy: 'agent',
      description: 'the checks pass.',
      threshold: null,
      passRoute: 'next',
      failRoute: 'back to implement',
      roundLimit: 3,
      generatedFile: '.claude/commands/build.md',
    });
  });

  it('F-06 AC-023 gives a diff-size Condition its threshold, and no round limit when none is set', () => {
    expect(flowTabView(cfg, 'build', 'size-gate').panel).toMatchObject({
      kind: 'condition',
      checkType: 'diff-size',
      threshold: 400,
      roundLimit: null,
      passRoute: 'next',
      failRoute: 'stop',
    });
  });

  it('F-06 AC-023 opens the Connection panel with its two blocks and the artifact label', () => {
    expect(flowTabView(cfg, 'build', 'implement-to-size').panel).toEqual({
      kind: 'connection',
      id: 'implement-to-size',
      enabled: true,
      from: 'checks-gate',
      to: 'size-gate',
      artifact: ' code ',
      generatedFile: '.claude/commands/build.md',
    });
  });

  it('F-06 AC-023 opens the End panel with its outcome and produced artifact', () => {
    expect(flowTabView(cfg, 'build', 'build-end').panel).toEqual({
      kind: 'end',
      id: 'build-end',
      enabled: true,
      outcome: 'done',
      produced: 'the commit',
      generatedFile: '.claude/commands/build.md',
    });
  });

  it('F-06 AC-023 opens the Start panel of a flow, which has no properties of its own beyond on or off', () => {
    expect(flowTabView(cfg, 'build', 'build-start').panel).toEqual({
      kind: 'start',
      id: 'build-start',
      enabled: true,
      generatedFile: '.claude/commands/build.md',
    });
  });

  it('F-06 AC-023 shows a null model, an empty tool list and no End product when none is set', () => {
    const plain = flow('plain', [
      { kind: 'start', id: 'plain-start', enabled: true },
      { kind: 'agent', id: 'a', enabled: true, name: 'a', scope: 'project', description: 'job' },
      { kind: 'end', id: 'plain-end', enabled: true, outcome: 'stopped' },
    ]);
    const plainCfg = config([START, plain, END]);
    expect(flowTabView(plainCfg, 'plain', 'a').panel).toMatchObject({ model: null, tools: [], body: '', ruleTags: [] });
    expect(flowTabView(plainCfg, 'plain', 'plain-end').panel).toMatchObject({ outcome: 'stopped', produced: null });
  });

  it('F-06 AC-023 shows the rule tags of a flow', () => {
    const tagged = flow('tagged', [{ kind: 'start', id: 't-start', enabled: true }], { ruleTags: ['general'] });
    expect(flowTabView(config([START, tagged, END]), 'tagged').panel).toMatchObject({ kind: 'flow', ruleTags: ['general'] });
  });

  it('F-06 AC-023 names a back route target with its box number when another box has the same title', () => {
    const twins = flow('twins', [
      { kind: 'start', id: 'w-start', enabled: true },
      {
        kind: 'condition',
        id: 'first-checks',
        enabled: true,
        checkType: 'checks',
        decidedBy: 'agent',
        description: 'first',
        passRoute: { kind: 'next' },
        failRoute: { kind: 'stop' },
      },
      {
        kind: 'condition',
        id: 'second-checks',
        enabled: true,
        checkType: 'checks',
        decidedBy: 'agent',
        description: 'second',
        passRoute: { kind: 'next' },
        failRoute: { kind: 'back', blockId: 'first-checks' },
      },
      { kind: 'end', id: 'w-end', enabled: true, outcome: 'done' },
    ]);
    const twinCfg = config([START, twins, END]);
    expect(flowTabView(twinCfg, 'twins', 'second-checks').panel).toMatchObject({ failRoute: 'back to checks (2)' });
    expect(flowTabView(twinCfg, 'twins').boxes.map((box) => box.title)).toEqual(['Start', 'checks', 'checks', 'End']);
  });

  it('F-06 AC-023 gives the panel its own copy of the tool and rule tag lists, not the configuration arrays', () => {
    const fresh = config([START, buildFlow(), END]);
    const panel = flowTabView(fresh, 'build', 'implement').panel;
    if (panel.kind !== 'agent') {
      throw new Error('expected an agent panel');
    }
    panel.tools.push('Bash');
    panel.reads.push('extra');
    panel.writes.push('extra');
    panel.ruleTags.push('extra');
    const agent = (fresh.pipeline.blocks[1] as FlowBlock).blocks[1];
    expect(agent).toMatchObject({
      tools: ['Read', 'Edit'],
      reads: ['spec', 'plan'],
      writes: ['code'],
      ruleTags: ['typescript'],
    });
  });

  it('F-06 AC-023 throws on a selected block id that is unknown to the flow', () => {
    expect(() => flowTabView(cfg, 'build', 'pipeline-end')).toThrow('Unknown block id pipeline-end in flow build');
  });
});

describe('F-06 AC-024 each panel shows the file the block generates and the block rule tags', () => {
  const cfg = config([START, buildFlow(), END]);

  it('F-06 AC-024 an Agent panel generates .claude/agents/<name>.md, with its rule tags', () => {
    expect(flowTabView(cfg, 'build', 'implement').panel).toMatchObject({
      kind: 'agent',
      generatedFile: '.claude/agents/implement.md',
      ruleTags: ['typescript'],
    });
  });

  it('F-06 AC-024 a Flow panel generates .claude/commands/<flow>.md', () => {
    expect(flowTabView(cfg, 'build').panel).toMatchObject({ kind: 'flow', generatedFile: '.claude/commands/build.md' });
  });

  it('F-06 AC-024 the Start, Condition, Connection and End of a flow are written to the flow command file', () => {
    for (const blockId of ['build-start', 'checks-gate', 'implement-to-size', 'build-end']) {
      expect(flowTabView(cfg, 'build', blockId).panel).toMatchObject({ generatedFile: '.claude/commands/build.md' });
    }
  });

  it('F-06 AC-024 the generated file of an Agent follows its name, not its id', () => {
    const named = flow('named', [
      { kind: 'start', id: 'n-start', enabled: true },
      { kind: 'agent', id: 'agent-id', enabled: true, name: 'reviewer', scope: 'project', description: 'job' },
      { kind: 'end', id: 'n-end', enabled: true, outcome: 'done' },
    ]);
    expect(flowTabView(config([START, named, END]), 'named', 'agent-id').panel).toMatchObject({
      generatedFile: '.claude/agents/reviewer.md',
    });
  });

  it('F-06 AC-024 the view is deterministic: the same configuration gives the same view', () => {
    expect(flowTabView(cfg, 'build', 'implement')).toEqual(flowTabView(cfg, 'build', 'implement'));
  });
});
