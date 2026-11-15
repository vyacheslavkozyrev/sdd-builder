// Builders for the pipeline configurations of the reachability and route refusal tests (F-02 AC-005 to AC-007, AC-014).
import { InvalidConfigError } from '../src/errors.js';
import { generate } from '../src/pipeline/index.js';
import type {
  AgentBlock,
  ChildBlock,
  ConditionBlock,
  EndBlock,
  FlowBlock,
  PipelineBlock,
  PipelineConditionBlock,
  PipelineStartBlock,
  ProjectConfig,
  Route,
  StartBlock,
} from '../src/pipeline/model.js';
import { templateSourceFromRecord } from '../src/template-source.js';

export const NEXT: Route = { kind: 'next' };
export const STOP: Route = { kind: 'stop' };

export function back(blockId: string): Route {
  return { kind: 'back', blockId };
}

export interface Row {
  name: string;
  blocks: PipelineBlock[];
  expected: string[];
}

export function pipelineStart(): PipelineStartBlock {
  return { kind: 'start', id: 'pipeline-start', enabled: true, arguments: [] };
}

export function pipelineEnd(): EndBlock {
  return { kind: 'end', id: 'pipeline-end', enabled: true, outcome: 'done' };
}

export function start(id: string): StartBlock {
  return { kind: 'start', id, enabled: true };
}

export function end(id: string): EndBlock {
  return { kind: 'end', id, enabled: true, outcome: 'done' };
}

export function agent(id: string, enabled = true): AgentBlock {
  return { kind: 'agent', id, enabled, name: id, scope: 'task' };
}

export function condition(id: string, passRoute: Route, failRoute: Route, enabled = true): ConditionBlock {
  return { kind: 'condition', id, enabled, decidedBy: 'agent', checkType: 'review', passRoute, failRoute };
}

export function gate(id: string, passRoute: Route, failRoute: Route, enabled = true): PipelineConditionBlock {
  return { ...condition(id, passRoute, failRoute, enabled), onConnection: 'a-to-b' };
}

export function flow(id: string, blocks: ChildBlock[], enabled = true): FlowBlock {
  return { kind: 'flow', id, name: `${id} flow`, enabled, blocks };
}

/** A flow with a Start and an End around the given blocks, so only the reachability of those blocks can fail. */
export function validFlow(id: string, middle: ChildBlock[], enabled = true): FlowBlock {
  return flow(id, [start(`${id}-start`), ...middle, end(`${id}-end`)], enabled);
}

export function configWith(blocks: PipelineBlock[]): ProjectConfig {
  return {
    schemaVersion: 2,
    name: 'My project',
    idea: 'A tool that tracks reading lists.',
    stack: { language: 'TypeScript' },
    pipeline: { name: 'main', blocks },
    rules: [],
  };
}

const TEMPLATES = templateSourceFromRecord({});

/** The problems `generate` refuses a configuration with, or an empty list when it does not refuse it. */
export function refusalOf(config: ProjectConfig): string[] {
  try {
    generate(config, TEMPLATES);
  } catch (error) {
    if (error instanceof InvalidConfigError) return [...error.problems];
    throw error;
  }
  return [];
}
