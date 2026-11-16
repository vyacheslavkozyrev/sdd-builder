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
describe('F-02 AC-014 disabled Connections, Conditions and child flows are not checked', () => {
  it.each<[string, PipelineBlock[]]>([
    [
      'a disabled flow Connection with a missing end',
      [pipelineStart(), validFlow('specify', [connection('c1', 'ghost', 'ghost-b', false)]), ...requiredGates(), end('pipeline-end')],
    ],
    [
      'a disabled Condition in an enabled flow with no pass and no fail route',
      [
        pipelineStart(),
        validFlow('specify', [withoutRoute(withoutRoute(condition('review', false), 'passRoute'), 'failRoute')]),
        ...requiredGates(),
        end('pipeline-end'),
      ],
    ],
    [
      'a disabled pipeline Connection with a flow that does not exist',
      [pipelineStart(), validFlow('specify'), connection('p1', 'specify', 'ghost', false), ...requiredGates(), end('pipeline-end')],
    ],
    [
      'a disabled pipeline gate with a missing fail route',
      [
        pipelineStart(),
        validFlow('specify'),
        withoutRoute(gate('gate', 'p1', false), 'failRoute'),
        validFlow('build'),
        ...requiredGates(),
        end('pipeline-end'),
      ],
    ],
    [
      'a disabled child flow with no Start, no End, a dangling Connection and an unwired Condition',
      [
        pipelineStart(),
        flow('broken', [agent('broken-agent'), connection('c1', 'broken-agent', 'build-agent'), withoutRoute(condition('review'), 'passRoute')], false),
        ...requiredGates(),
        end('pipeline-end'),
      ],
    ],
  ])('F-02 AC-014 does not refuse the configuration for %s', (_name, blocks) => {
    expect(refusalOf(configWith(blocks))).toEqual([]);
  });

  it('F-02 AC-014 refuses the same broken content once the flow is enabled, so the skip is the cause', () => {
    const config = configWith([
      pipelineStart(),
      flow('broken', [agent('broken-agent'), connection('c1', 'broken-agent', 'ghost'), withoutRoute(condition('review'), 'passRoute')]),
      ...requiredGates(),
      end('pipeline-end'),
    ]);
    expect(refusalOf(config)).toEqual([
      'pipeline.blocks[1]: flow "broken" has no End block',
      'pipeline.blocks[1]: flow "broken" has no Start block',
      'pipeline.blocks[1].blocks[1]: Connection "c1" must join two blocks of flow "broken"; "ghost" is not a block of flow "broken"',
      'pipeline.blocks[1].blocks[2]: Condition "review" has no pass route; its pass output is not wired',
    ]);
  });
});

describe('F-02 AC-012 Connection and Condition problems are listed together, sorted by path', () => {
  it('F-02 AC-012 sorts the combined list by path, comparing numbers by value so block 2 comes before block 10', () => {
    const blocks: PipelineBlock[] = [pipelineStart(), validFlow('specify')];
    blocks.push(flow('early', [start('early-start'), agent('early-agent'), connection('bad-link', 'early-agent', 'ghost')]));
    for (let index = 3; index < 10; index++) {
      blocks.push(connection(`link-${index}`, 'specify', 'early'));
    }
    blocks.push(validFlow('late', [agent('late-agent'), withoutRoute(condition('late-review'), 'failRoute')]));
    blocks.push(connection('p-late', 'early', 'ghost'));
    blocks.push(...requiredGates(), end('pipeline-end'));

    expect(refusalOf(configWith(blocks))).toEqual([
      'pipeline.blocks[2]: flow "early" has no End block',
      'pipeline.blocks[2].blocks[2]: Connection "bad-link" must join two blocks of flow "early"; "ghost" is not a block of flow "early"',
      'pipeline.blocks[10].blocks[2]: Condition "late-review" has no fail route; its fail output is not wired',
      'pipeline.blocks[11]: Connection "p-late" must join two flows of the pipeline; "ghost" is not a flow of the pipeline',
    ]);
  });

  it('F-02 AC-012 returns no files and throws one InvalidConfigError for a combined list', () => {
    const config = configWith([
      pipelineStart(),
      validFlow('specify', [agent('specify-agent'), connection('c1', 'specify-agent', 'ghost')]),
      connection('p1', 'specify', 'ghost'),
      ...requiredGates(),
      end('pipeline-end'),
    ]);
    expect(() => generate(config, TEMPLATES)).toThrow(InvalidConfigError);
    expect(refusalOf(config)).toHaveLength(2);
  });
});
