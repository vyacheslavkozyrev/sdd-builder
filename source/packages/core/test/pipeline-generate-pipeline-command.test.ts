import { describe, expect, it } from 'vitest';
import { renderPipelineCommand } from '../src/pipeline/generate/pipeline-command.js';
import { backRouteRule, checkRule } from '../src/pipeline/generate/rules-text.js';
import type { ConditionBlock, PipelineConditionBlock, PipelineStartBlock, ProjectConfig } from '../src/pipeline/model.js';
import { back, configWith, gate, NEXT, pipelineEnd, STOP, validFlow } from './pipeline-routes-fixtures.js';

const COMMAND_PATH = '.claude/commands/pipeline.md';

/** A pipeline Start that takes the given arguments. */
function startWith(args: Array<{ name: string; required: boolean }>, enabled = true): PipelineStartBlock {
  return {
    kind: 'start',
    id: 'pipeline-start',
    enabled,
    arguments: args.map((argument) => ({ ...argument, hint: '' })),
  };
}

/** A gate with a given check type and decider, on the pipeline connection `a-to-b`. */
function checkGate(
  id: string,
  checkType: 'approval' | 'checks' | 'review',
  decidedBy: 'human' | 'agent',
  enabled = true,
): PipelineConditionBlock {
  return { ...gate(id, NEXT, STOP, enabled), checkType, decidedBy };
}

/** A diff-size gate with a threshold on the pipeline connection `a-to-b`. */
function diffGate(id: string, threshold: number): PipelineConditionBlock {
  return {
    kind: 'condition',
    id,
    enabled: true,
    decidedBy: 'agent',
    checkType: 'diff-size',
    threshold,
    passRoute: NEXT,
    failRoute: STOP,
    onConnection: 'a-to-b',
  };
}

/** The content of the pipeline command for a config. */
function commandOf(config: ProjectConfig): string {
  return renderPipelineCommand(config).content;
}

/** The numbered lines under a section heading, up to the next heading or the end of the file. */
function sectionLines(content: string, heading: string): string[] {
  const lines = content.split('\n');
  const from = lines.indexOf(heading);
  if (from === -1) throw new Error(`no section ${heading}`);
  const body = lines.slice(from + 1);
  const next = body.findIndex((line) => line.startsWith('## '));
  return (next === -1 ? body : body.slice(0, next)).filter((line) => line.trim() !== '');
}

describe('F-02 AC-024 the pipeline command file', () => {
  it('F-02 AC-024 is written to .claude/commands/pipeline.md', () => {
    expect(renderPipelineCommand(configWith([startWith([]), pipelineEnd()])).path).toBe(COMMAND_PATH);
  });

  describe('arguments are listed with their required flag', () => {
    const rows: Array<{ name: string; args: Array<{ name: string; required: boolean }>; expected: string[] }> = [
      { name: 'no argument gives one line saying so', args: [], expected: ['This pipeline takes no arguments.'] },
      {
        name: 'a required argument is marked required',
        args: [{ name: 'feature', required: true }],
        expected: ['- `feature` (required)'],
      },
      {
        name: 'an optional argument is marked optional',
        args: [{ name: 'note', required: false }],
        expected: ['- `note` (optional)'],
      },
      {
        name: 'several arguments keep their declared order',
        args: [
          { name: 'feature', required: true },
          { name: 'note', required: false },
        ],
        expected: ['- `feature` (required)', '- `note` (optional)'],
      },
    ];

    for (const row of rows) {
      it(`F-02 AC-024 ${row.name}`, () => {
        const config = configWith([startWith(row.args), pipelineEnd()]);
        expect(sectionLines(commandOf(config), '## Arguments')).toEqual(row.expected);
      });
    }
  });

  it('F-02 AC-024 child flows are listed in pipeline order, each naming its command file', () => {
    const config = configWith([
      startWith([]),
      validFlow('zeta', []),
      validFlow('alpha', []),
      pipelineEnd(),
    ]);
    const steps = sectionLines(commandOf(config), '## Steps');
    expect(steps).toEqual([
      '1. Run the flow `zeta flow` (`zeta`), following `.claude/commands/zeta.md`.',
      '2. Run the flow `alpha flow` (`alpha`), following `.claude/commands/alpha.md`.',
    ]);
  });

  it('F-02 AC-024 gates and checks sit between the flows in pipeline order', () => {
    const config = configWith([
      startWith([]),
      validFlow('a', []),
      checkGate('g1', 'approval', 'human'),
      validFlow('b', []),
      checkGate('g2', 'checks', 'agent'),
      validFlow('c', []),
      pipelineEnd(),
    ]);
    const steps = sectionLines(commandOf(config), '## Steps');
    expect(steps).toEqual([
      '1. Run the flow `a flow` (`a`), following `.claude/commands/a.md`.',
      '2. Check approval, decided by human (`g1`).',
      '3. Run the flow `b flow` (`b`), following `.claude/commands/b.md`.',
      '4. Check checks, decided by agent (`g2`).',
      '5. Run the flow `c flow` (`c`), following `.claude/commands/c.md`.',
    ]);
  });

  it('F-02 AC-024 a disabled flow is not mentioned', () => {
    const config = configWith([
      startWith([]),
      validFlow('kept', []),
      validFlow('dropped-flow', [], false),
      pipelineEnd(),
    ]);
    const content = commandOf(config);
    expect(content).toContain('kept');
    expect(content).not.toContain('dropped-flow');
  });

  it('F-02 AC-024 a disabled gate is not mentioned', () => {
    const config = configWith([
      startWith([]),
      validFlow('a', []),
      checkGate('gate-off', 'review', 'agent', false),
      validFlow('b', []),
      pipelineEnd(),
    ]);
    const content = commandOf(config);
    expect(content).not.toContain('gate-off');
    expect(sectionLines(content, '## Steps')).toHaveLength(2);
  });

  it('F-02 AC-024 a disabled Start gives no arguments, so none is listed', () => {
    const config = configWith([startWith([{ name: 'feature', required: true }], false), pipelineEnd()]);
    expect(sectionLines(commandOf(config), '## Arguments')).toEqual(['This pipeline takes no arguments.']);
  });

  it('F-02 AC-024 the same config built twice gives the same file', () => {
    const build = (): ProjectConfig =>
      configWith([startWith([{ name: 'feature', required: true }]), validFlow('a', []), diffGate('g', 10), pipelineEnd()]);
    expect(renderPipelineCommand(build())).toEqual(renderPipelineCommand(build()));
  });
});

describe('F-02 AC-025 back routes become numbered rules with their round limit', () => {
  const rows: Array<{ name: string; block: PipelineConditionBlock; expected: string[] }> = [
    {
      name: 'a back fail route without a limit says no limit set',
      block: { ...checkGate('g1', 'review', 'agent'), failRoute: back('a-write') },
      expected: ['1. On fail, go back to `a-write` and run again from there; no limit set.'],
    },
    {
      name: 'a back fail route with a limit shows the limit',
      block: { ...checkGate('g1', 'review', 'agent'), failRoute: back('a-write'), roundLimit: 3 },
      expected: ['1. On fail, go back to `a-write` and run again from there; round limit 3.'],
    },
    {
      name: 'a back pass route is a rule too',
      block: { ...gate('g1', back('a-write'), STOP), roundLimit: 2 },
      expected: ['1. On pass, go back to `a-write` and run again from there; round limit 2.'],
    },
    {
      name: 'a route that is not back gives no rule',
      block: gate('g1', NEXT, STOP),
      expected: ['There are no back routes.'],
    },
  ];

  for (const row of rows) {
    it(`F-02 AC-025 ${row.name}`, () => {
      const config = configWith([startWith([]), validFlow('a', []), row.block, pipelineEnd()]);
      expect(sectionLines(commandOf(config), '## Rules')).toEqual(row.expected);
    });
  }

  it('F-02 AC-025 a disabled gate with a back route gives no rule', () => {
    const config = configWith([
      startWith([]),
      validFlow('a', []),
      { ...gate('g1', NEXT, back('a-write'), false), roundLimit: 1 },
      pipelineEnd(),
    ]);
    expect(sectionLines(commandOf(config), '## Rules')).toEqual(['There are no back routes.']);
  });

  it('F-02 AC-025 rules are numbered across gates in pipeline order', () => {
    const config = configWith([
      startWith([]),
      validFlow('a', []),
      { ...gate('g1', NEXT, back('x'), true), roundLimit: 1 },
      validFlow('b', []),
      { ...gate('g2', NEXT, back('y'), true) },
      pipelineEnd(),
    ]);
    expect(sectionLines(commandOf(config), '## Rules')).toEqual([
      '1. On fail, go back to `x` and run again from there; round limit 1.',
      '2. On fail, go back to `y` and run again from there; no limit set.',
    ]);
  });
});

describe('F-02 AC-025 checks show their threshold or their decider', () => {
  const rows: Array<{ name: string; block: ConditionBlock; expected: string }> = [
    {
      name: 'a diff-size check shows its threshold',
      block: diffGate('size', 400),
      expected: 'Check diff-size: the staged change is at most 400 lines (`size`).',
    },
    {
      name: 'an approval check shows a human decider',
      block: checkGate('approve', 'approval', 'human'),
      expected: 'Check approval, decided by human (`approve`).',
    },
    {
      name: 'a checks check shows an agent decider',
      block: checkGate('tests', 'checks', 'agent'),
      expected: 'Check checks, decided by agent (`tests`).',
    },
    {
      name: 'a review check shows an agent decider',
      block: checkGate('review', 'review', 'agent'),
      expected: 'Check review, decided by agent (`review`).',
    },
  ];

  for (const row of rows) {
    it(`F-02 AC-025 ${row.name}`, () => {
      expect(checkRule(row.block)).toBe(row.expected);
    });
  }

  it('F-02 AC-025 the check step of a diff-size gate appears in the pipeline command', () => {
    const config = configWith([startWith([]), validFlow('a', []), diffGate('size', 250), validFlow('b', []), pipelineEnd()]);
    expect(sectionLines(commandOf(config), '## Steps')[1]).toBe('2. Check diff-size: the staged change is at most 250 lines (`size`).');
  });

  it('F-02 AC-025 backRouteRule gives no rule for an outcome that does not route back', () => {
    expect(backRouteRule(gate('g', NEXT, STOP), 'pass')).toBeUndefined();
    expect(backRouteRule(gate('g', NEXT, STOP), 'fail')).toBeUndefined();
  });
});
