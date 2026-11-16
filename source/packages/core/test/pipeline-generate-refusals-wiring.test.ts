import { describe, expect, it } from 'vitest';
import { InvalidConfigError } from '../src/errors.js';
import { generate } from '../src/pipeline/index.js';
import type {
  AgentBlock,
  ChildBlock,
  ConditionBlock,
  ConnectionBlock,
  EndBlock,
  FlowBlock,
  PipelineBlock,
  PipelineConditionBlock,
  PipelineStartBlock,
  ProjectConfig,
  Route,
  StartBlock,
} from '../src/pipeline/model.js';
import { BASE_TEMPLATES, requiredGates } from './pipeline-routes-fixtures.js';

const TEMPLATES = BASE_TEMPLATES;
const NEXT: Route = { kind: 'next' };
const STOP: Route = { kind: 'stop' };

function pipelineStart(): PipelineStartBlock {
  return { kind: 'start', id: 'pipeline-start', enabled: true, arguments: [] };
}

function start(id: string, enabled = true): StartBlock {
  return { kind: 'start', id, enabled };
}

function end(id: string, enabled = true): EndBlock {
  return { kind: 'end', id, enabled, outcome: 'done' };
}

function agent(id: string): AgentBlock {
  return { kind: 'agent', id, enabled: true, name: id, scope: 'task', description: 'test job' };
}

function connection(id: string, from: string, to: string, enabled = true): ConnectionBlock {
  return { kind: 'connection', id, enabled, from, to, artifact: 'note' };
}

function condition(id: string, enabled = true): ConditionBlock {
  return { kind: 'condition', id, enabled, decidedBy: 'agent', checkType: 'checks', passRoute: NEXT, failRoute: STOP };
}

/** A Condition with one output left unwired. The key is removed, as a config read from outside could lack it. */
function withoutRoute<T extends ConditionBlock>(block: T, key: 'passRoute' | 'failRoute'): T {
  const copy: Partial<T> = { ...block };
  delete copy[key];
  return copy as T;
}

function gate(id: string, onConnection: string, enabled = true): PipelineConditionBlock {
  return { ...condition(id, enabled), onConnection };
}

function flow(id: string, blocks: ChildBlock[], enabled = true): FlowBlock {
  return { kind: 'flow', id, name: `${id} flow`, description: `${id} flow description`, enabled, blocks };
}

/** A flow with a Start and an End, so that only the wiring of its blocks can be refused. */
function validFlow(id: string, middle: ChildBlock[] = [agent(`${id}-agent`)], enabled = true): FlowBlock {
  return flow(id, [start(`${id}-start`), ...middle, end(`${id}-end`)], enabled);
}

function configWith(blocks: PipelineBlock[]): ProjectConfig {
  return {
    schemaVersion: 2,
    name: 'My project',
    idea: 'A tool that tracks reading lists.',
    stack: { language: 'TypeScript' },
    pipeline: { name: 'main', blocks },
    rules: [],
  };
}

/** The problems `generate` refuses a configuration with, or an empty list when it does not refuse it. */
function refusalOf(config: ProjectConfig): string[] {
  try {
    generate(config, TEMPLATES);
  } catch (error) {
    if (error instanceof InvalidConfigError) return [...error.problems];
    throw error;
  }
  return [];
}

describe('F-02 AC-003 a Connection in a flow joins two blocks of that flow, and a pipeline Connection joins two flows', () => {
  it('F-02 AC-003 accepts Connections that join blocks of one flow and flows of the pipeline', () => {
    const config = configWith([
      pipelineStart(),
      validFlow('specify', [agent('specify-agent'), connection('specify-link', 'specify-agent', 'specify-end')]),
      connection('specify-to-build', 'specify', 'build'),
      validFlow('build'),
      ...requiredGates(),
      end('pipeline-end'),
    ]);
    expect(refusalOf(config)).toEqual([]);
  });

  it.each<[string, PipelineBlock[], string[]]>([
    [
      'a flow Connection names a block that is not in the flow',
      [
        pipelineStart(),
        validFlow('specify', [agent('specify-agent'), connection('c1', 'specify-agent', 'ghost')]),
        ...requiredGates(),
        end('pipeline-end'),
      ],
      ['pipeline.blocks[1].blocks[2]: Connection "c1" must join two blocks of flow "specify"; "ghost" is not a block of flow "specify"'],
    ],
    [
      'a flow Connection joins a block of another flow',
      [
        pipelineStart(),
        validFlow('specify', [agent('specify-agent'), connection('c1', 'specify-agent', 'build-agent')]),
        validFlow('build'),
        ...requiredGates(),
        end('pipeline-end'),
      ],
      [
        'pipeline.blocks[1].blocks[2]: Connection "c1" must join two blocks of flow "specify"; "build-agent" is in another flow or in the pipeline, not a block of flow "specify"',
      ],
    ],
    [
      'a flow Connection joins a block to the pipeline End',
      [
        pipelineStart(),
        validFlow('specify', [agent('specify-agent'), connection('c1', 'specify-agent', 'pipeline-end')]),
        ...requiredGates(),
        end('pipeline-end'),
      ],
      [
        'pipeline.blocks[1].blocks[2]: Connection "c1" must join two blocks of flow "specify"; "pipeline-end" is in another flow or in the pipeline, not a block of flow "specify"',
      ],
    ],
    [
      'a flow Connection names both ends missing, one message per end',
      [
        pipelineStart(),
        validFlow('specify', [connection('c1', 'ghost-a', 'ghost-b')]),
        ...requiredGates(),
        end('pipeline-end'),
      ],
      [
        'pipeline.blocks[1].blocks[1]: Connection "c1" must join two blocks of flow "specify"; "ghost-a" is not a block of flow "specify"',
        'pipeline.blocks[1].blocks[1]: Connection "c1" must join two blocks of flow "specify"; "ghost-b" is not a block of flow "specify"',
      ],
    ],
    [
      'a pipeline Connection names a flow that does not exist',
      [pipelineStart(), validFlow('specify'), connection('p1', 'specify', 'ghost'), validFlow('build'), ...requiredGates(), end('pipeline-end')],
      ['pipeline.blocks[2]: Connection "p1" must join two flows of the pipeline; "ghost" is not a flow of the pipeline'],
    ],
    [
      'a pipeline Connection joins a flow to a block inside another flow',
      [pipelineStart(), validFlow('specify'), connection('p1', 'specify', 'build-agent'), validFlow('build', [agent('build-agent')]), ...requiredGates(), end('pipeline-end')],
      [
        'pipeline.blocks[2]: Connection "p1" must join two flows of the pipeline; "build-agent" is in another flow or in the pipeline, not a flow of the pipeline',
      ],
    ],
    [
      'a pipeline Connection joins a flow to the pipeline Start',
      [pipelineStart(), validFlow('specify'), connection('p1', 'specify', 'pipeline-start'), validFlow('build'), ...requiredGates(), end('pipeline-end')],
      [
        'pipeline.blocks[2]: Connection "p1" must join two flows of the pipeline; "pipeline-start" is in another flow or in the pipeline, not a flow of the pipeline',
      ],
    ],
  ])('F-02 AC-003 refuses when %s, with its path', (_name, blocks, expected) => {
    expect(refusalOf(configWith(blocks))).toEqual(expected);
  });
});

describe('F-02 AC-004 both outputs of every Condition are wired, or the Condition is refused', () => {
  it('F-02 AC-004 accepts a Condition whose pass and fail routes are wired, whatever the route kind', () => {
    const back: Route = { kind: 'back', blockId: 'specify-agent' };
    const config = configWith([
      pipelineStart(),
      validFlow('specify', [
        agent('specify-agent'),
        { ...condition('review'), failRoute: back },
        { ...condition('checks'), passRoute: STOP },
      ]),
      ...requiredGates(),
      end('pipeline-end'),
    ]);
    expect(refusalOf(config)).toEqual([]);
  });

  it.each<[string, PipelineBlock[], string[]]>([
    [
      'a flow Condition has no pass route',
      [pipelineStart(), validFlow('specify', [withoutRoute(condition('review'), 'passRoute')]), ...requiredGates(), end('pipeline-end')],
      ['pipeline.blocks[1].blocks[1]: Condition "review" has no pass route; its pass output is not wired'],
    ],
    [
      'a flow Condition has no fail route',
      [pipelineStart(), validFlow('specify', [withoutRoute(condition('review'), 'failRoute')]), ...requiredGates(), end('pipeline-end')],
      ['pipeline.blocks[1].blocks[1]: Condition "review" has no fail route; its fail output is not wired'],
    ],
    [
      'a flow Condition has neither route, and the fail output is listed first',
      [
        pipelineStart(),
        validFlow('specify', [withoutRoute(withoutRoute(condition('review'), 'passRoute'), 'failRoute')]),
        ...requiredGates(),
        end('pipeline-end'),
      ],
      [
        'pipeline.blocks[1].blocks[1]: Condition "review" has no fail route; its fail output is not wired',
        'pipeline.blocks[1].blocks[1]: Condition "review" has no pass route; its pass output is not wired',
      ],
    ],
    [
      'a pipeline gate has no fail route',
      [
        pipelineStart(),
        validFlow('specify'),
        withoutRoute(gate('gate', 'p1'), 'failRoute'),
        connection('p1', 'specify', 'build'),
        validFlow('build'),
        ...requiredGates(),
        end('pipeline-end'),
      ],
      ['pipeline.blocks[2]: Condition "gate" has no fail route; its fail output is not wired'],
    ],
  ])('F-02 AC-004 refuses when %s, naming the Condition and the output', (_name, blocks, expected) => {
    expect(refusalOf(configWith(blocks))).toEqual(expected);
  });
});
