import { describe, expect, it } from 'vitest';
import type { GeneratedFile } from '../src/model.js';
import { renderFlowCommands } from '../src/pipeline/generate/flow-commands.js';
import type { AgentBlock, ConnectionBlock, ProjectConfig } from '../src/pipeline/model.js';
import {
  back,
  condition,
  configWith,
  end,
  flow,
  gate,
  NEXT,
  pipelineEnd,
  pipelineStart,
  start,
  STOP,
  validFlow,
} from './pipeline-routes-fixtures.js';

/** An Agent block whose file name differs from its id, so the test sees the file the step names. */
function namedAgent(id: string, name: string, enabled = true): AgentBlock {
  return { kind: 'agent', id, enabled, name, scope: 'feature', description: 'test job' };
}

/** A pipeline connection between two blocks of one flow. */
function connection(id: string, from: string, to: string, enabled = true): ConnectionBlock {
  return { kind: 'connection', id, enabled, from, to, artifact: `${from} output` };
}

/** Two enabled flows and one disabled flow, all in one pipeline, with a gate between the first two. */
function twoFlowsConfig(): ProjectConfig {
  return configWith([
    pipelineStart(),
    validFlow('a', [namedAgent('a1', 'writer')]),
    gate('g1', NEXT, STOP),
    validFlow('c', [namedAgent('c1', 'checker')]),
    pipelineEnd(),
  ]);
}

/** The command file at a path, or a thrown error that names the missing path. */
function fileAt(files: readonly GeneratedFile[], path: string): string {
  const file = files.find((entry) => entry.path === path);
  if (file === undefined) throw new Error(`no file at ${path}`);
  return file.content;
}

/** The numbered step lines of a command file, in the order they appear. */
function stepsOf(content: string): string[] {
  return content.split('\n').filter((line) => /^\d+\. /.test(line));
}

describe('F-02 AC-023 each enabled child flow produces its command file', () => {
  const rows: Array<{ name: string; config: () => ProjectConfig; expected: string[] }> = [
    {
      name: 'one file per enabled flow, at .claude/commands/<flow-id>.md',
      config: twoFlowsConfig,
      expected: ['.claude/commands/a.md', '.claude/commands/c.md'],
    },
    {
      name: 'a disabled flow gives no file',
      config: () =>
        configWith([pipelineStart(), validFlow('a', [namedAgent('a1', 'writer')]), validFlow('b', [namedAgent('b1', 'x')], false), pipelineEnd()]),
      expected: ['.claude/commands/a.md'],
    },
    {
      name: 'a pipeline with no child flow gives no command file',
      config: () => configWith([pipelineStart(), pipelineEnd()]),
      expected: [],
    },
    {
      name: 'files are sorted by path whatever the pipeline order',
      config: () =>
        configWith([pipelineStart(), validFlow('zeta', [namedAgent('z1', 'z')]), validFlow('alpha', [namedAgent('a1', 'a')]), pipelineEnd()]),
      expected: ['.claude/commands/alpha.md', '.claude/commands/zeta.md'],
    },
  ];

  for (const row of rows) {
    it(`F-02 AC-023 ${row.name}`, () => {
      const files = renderFlowCommands(row.config());
      expect(files.map((file) => file.path)).toEqual(row.expected);
    });
  }
});

describe('F-02 AC-023 enabled blocks are numbered steps in block order', () => {
  it('F-02 AC-023 steps follow the flow order, one per enabled block, numbered from 1', () => {
    const config = configWith([
      pipelineStart(),
      flow('a', [
        start('a-start'),
        namedAgent('a1', 'writer'),
        condition('a-check', NEXT, STOP),
        connection('a-link', 'a1', 'a-end'),
        end('a-end'),
      ]),
      pipelineEnd(),
    ]);
    const steps = stepsOf(fileAt(renderFlowCommands(config), '.claude/commands/a.md'));
    expect(steps).toEqual([
      '1. Start the flow (`a-start`).',
      '2. Run the agent in `.claude/agents/writer.md`, once per feature (`a1`).',
      '3. Check review, decided by agent (`a-check`). On pass, continue to the next step. On fail, stop the process.',
      '4. Hand over a1 output from `a1` to `a-end` (`a-link`).',
      '5. End the flow with outcome done (`a-end`).',
    ]);
  });

  it('F-02 AC-023 a disabled block of an enabled flow is not a step, and the rest keep their order', () => {
    const config = configWith([
      pipelineStart(),
      flow('a', [start('a-start'), namedAgent('a1', 'writer'), namedAgent('zz-off', 'off-agent', false), end('a-end')]),
      pipelineEnd(),
    ]);
    const steps = stepsOf(fileAt(renderFlowCommands(config), '.claude/commands/a.md'));
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatch(/^1\. Start the flow/);
    expect(steps[1]).toMatch(/^2\. Run the agent in `\.claude\/agents\/writer\.md`/);
    expect(steps[2]).toMatch(/^3\. End the flow/);
  });

  it('F-02 AC-023 the same config gives the same paths, order and text', () => {
    const first = renderFlowCommands(twoFlowsConfig());
    const second = renderFlowCommands(twoFlowsConfig());
    expect(second).toEqual(first);
  });
});

describe('F-02 AC-023 each Agent step names its agent file', () => {
  const rows: Array<{ name: string; agentName: string; expected: string }> = [
    { name: 'the agent file is named after the block name, not its id', agentName: 'reviewer', expected: '.claude/agents/reviewer.md' },
    { name: 'a name with a hyphen is kept as the file name', agentName: 'code-writer', expected: '.claude/agents/code-writer.md' },
  ];

  for (const row of rows) {
    it(`F-02 AC-023 ${row.name}`, () => {
      const config = configWith([
        pipelineStart(),
        flow('a', [start('a-start'), namedAgent('a1', row.agentName), end('a-end')]),
        pipelineEnd(),
      ]);
      const content = fileAt(renderFlowCommands(config), '.claude/commands/a.md');
      expect(content).toContain(`\`${row.expected}\``);
      expect(stepsOf(content)[1]).toContain(row.expected);
    });
  }
});

describe('F-02 AC-026 a command file never mentions a disabled block or flow', () => {
  const rows: Array<{ name: string; config: () => ProjectConfig; hidden: string[] }> = [
    {
      name: 'a disabled block of an enabled flow is not mentioned by id or agent name',
      config: () =>
        configWith([
          pipelineStart(),
          flow('a', [start('a-start'), namedAgent('zz-off', 'hidden-agent', false), end('a-end')]),
          pipelineEnd(),
        ]),
      hidden: ['zz-off', 'hidden-agent'],
    },
    {
      name: 'an enabled connection to a disabled block does not name that block',
      config: () =>
        configWith([
          pipelineStart(),
          flow('a', [
            start('a-start'),
            namedAgent('a1', 'writer'),
            connection('a-link', 'a1', 'zz-off'),
            namedAgent('zz-off', 'hidden-agent', false),
            end('a-end'),
          ]),
          pipelineEnd(),
        ]),
      hidden: ['zz-off', 'hidden-agent'],
    },
    {
      name: 'a disabled flow is not mentioned by id, name or its blocks',
      config: () =>
        configWith([
          pipelineStart(),
          validFlow('a', [namedAgent('a1', 'writer')]),
          flow('hidden', [start('hidden-start'), namedAgent('hidden-work', 'hidden-agent'), end('hidden-end')], false),
          pipelineEnd(),
        ]),
      hidden: ['hidden', 'hidden-agent', 'hidden-work', 'hidden-start'],
    },
    {
      name: 'a disabled flow beside an enabled one is not mentioned in any file',
      config: () =>
        configWith([
          pipelineStart(),
          validFlow('a', [namedAgent('a1', 'writer')]),
          gate('g1', NEXT, STOP),
          flow('zz-gone', [namedAgent('zz-work', 'gone-agent')], false),
          pipelineEnd(),
        ]),
      hidden: ['zz-gone', 'zz-work', 'gone-agent'],
    },
  ];

  for (const row of rows) {
    it(`F-02 AC-026 ${row.name}`, () => {
      const files = renderFlowCommands(row.config());
      for (const file of files) {
        for (const word of row.hidden) expect(file.content, `${file.path} mentions ${word}`).not.toContain(word);
      }
    });
  }
});

describe('F-02 AC-023 a connection step names its ends only when both are selected', () => {
  it('F-02 AC-023 a connection to a disabled block gives the artifact without the disabled end', () => {
    const config = configWith([
      pipelineStart(),
      flow('a', [
        start('a-start'),
        namedAgent('a1', 'writer'),
        connection('a-link', 'a1', 'zz-off'),
        namedAgent('zz-off', 'hidden-agent', false),
        end('a-end'),
      ]),
      pipelineEnd(),
    ]);
    const steps = stepsOf(fileAt(renderFlowCommands(config), '.claude/commands/a.md'));
    expect(steps).toEqual([
      '1. Start the flow (`a-start`).',
      '2. Run the agent in `.claude/agents/writer.md`, once per feature (`a1`).',
      '3. Hand over a1 output (`a-link`).',
      '4. End the flow with outcome done (`a-end`).',
    ]);
  });
});

describe('F-02 AC-023 a back route is shown in the step that names its target', () => {
  it('F-02 AC-023 a Condition with a back route names the block it returns to', () => {
    const config = configWith([
      pipelineStart(),
      flow('a', [
        start('a-start'),
        namedAgent('a1', 'writer'),
        condition('a-check', NEXT, back('a1')),
        end('a-end'),
      ]),
      pipelineEnd(),
    ]);
    const steps = stepsOf(fileAt(renderFlowCommands(config), '.claude/commands/a.md'));
    expect(steps[2]).toBe(
      '3. Check review, decided by agent (`a-check`). On pass, continue to the next step. On fail, go back to block `a1` and run again from there.',
    );
  });
});
