import { childPath, ROOT_PATH } from './primitives.js';
import type { Argument, Block, Problem, ProjectConfig } from '../model.js';

// Ids unique across the project (pipeline-schema.md §5; decision 18; AC-018, AC-026, AC-043, AC-048, AC-068).
// The ids of rules, flows, blocks and argument rows share one pool: a repeated id is refused at the path of
// the later occurrence in document order (rules first, then the pipeline's arguments, then each flow's id,
// arguments and blocks). A flow id or an argument id that clashes with an id of another kind is refused at its
// own path wherever that other id sits (AC-018, AC-026). Agent names are unique among the agents of the
// pipeline, and a repeated name is refused at the path of the later `name` (AC-048). Ids that are not in the
// file-safe form are refused by the readers, not here. Returns the problems in document order; an empty list
// means the ids are unique.

type Kind = 'rule' | 'flow' | 'block' | 'argument';

interface Occurrence {
  readonly id: string;
  readonly kind: Kind;
  readonly path: string;
}

interface AgentName {
  readonly name: string;
  readonly path: string;
}

const RULES_PATH = childPath(ROOT_PATH, 'rules');
const PIPELINE_PATH = childPath(ROOT_PATH, 'pipeline');
const PIPELINE_ARGUMENTS_PATH = childPath(PIPELINE_PATH, 'arguments');
const FLOWS_PATH = childPath(PIPELINE_PATH, 'flows');

function argumentOccurrences(list: readonly Argument[], listPath: string): Occurrence[] {
  return list.map((row) => ({
    id: row.id,
    kind: 'argument',
    path: childPath(childPath(listPath, String(row.index)), 'id'),
  }));
}

function blockOccurrences(block: Block, path: string): Occurrence[] {
  const own: Occurrence = { id: block.id, kind: 'block', path: childPath(path, 'id') };
  if (block.kind !== 'agent') return [own];
  return [own, ...argumentOccurrences(block.arguments, childPath(path, 'arguments'))];
}

function collectOccurrences(config: Pick<ProjectConfig, 'rules' | 'pipeline'>): Occurrence[] {
  const { rules, pipeline } = config;
  const occurrences: Occurrence[] = rules.map((rule) => ({
    id: rule.id,
    kind: 'rule',
    path: childPath(childPath(RULES_PATH, String(rule.index)), 'id'),
  }));

  occurrences.push(...argumentOccurrences(pipeline.arguments, PIPELINE_ARGUMENTS_PATH));
  pipeline.flows.forEach((flow) => {
    const flowPath = childPath(FLOWS_PATH, String(flow.index));
    occurrences.push({ id: flow.id, kind: 'flow', path: childPath(flowPath, 'id') });
    occurrences.push(...argumentOccurrences(flow.arguments, childPath(flowPath, 'arguments')));
    flow.blocks.forEach((block) => {
      occurrences.push(...blockOccurrences(block, childPath(childPath(flowPath, 'blocks'), String(block.index))));
    });
  });
  return occurrences;
}

function collectAgentNames(config: Pick<ProjectConfig, 'pipeline'>): AgentName[] {
  const names: AgentName[] = [];
  config.pipeline.flows.forEach((flow) => {
    const blocksPath = childPath(childPath(FLOWS_PATH, String(flow.index)), 'blocks');
    flow.blocks.forEach((block) => {
      if (block.kind !== 'agent') return;
      names.push({ name: block.name, path: childPath(childPath(blocksPath, String(block.index)), 'name') });
    });
  });
  return names;
}

// The occurrences of each id, in document order, so each lookup is a map read and not a scan.
function groupById(occurrences: readonly Occurrence[]): Map<string, Occurrence[]> {
  const groups = new Map<string, Occurrence[]>();
  for (const occurrence of occurrences) {
    const group = groups.get(occurrence.id);
    if (group === undefined) groups.set(occurrence.id, [occurrence]);
    else group.push(occurrence);
  }
  return groups;
}

export function checkIdsUnique(config: Pick<ProjectConfig, 'rules' | 'pipeline'>): Problem[] {
  const occurrences = collectOccurrences(config);
  const groups = groupById(occurrences);
  const problems: Problem[] = [];

  for (const occurrence of occurrences) {
    const group = groups.get(occurrence.id) ?? [];
    const [first] = group;
    if (first !== undefined && first !== occurrence) {
      problems.push({
        path: occurrence.path,
        message: `must be unique: the id ${occurrence.id} is already used at ${first.path}`,
      });
      continue;
    }
    if (occurrence.kind !== 'flow' && occurrence.kind !== 'argument') continue;
    const clashing = group.find((other) => other.kind !== occurrence.kind);
    if (clashing !== undefined) {
      problems.push({
        path: occurrence.path,
        message: `must be unique: the id ${occurrence.id} is also used at ${clashing.path}`,
      });
    }
  }

  const firstPathByName = new Map<string, string>();
  for (const agent of collectAgentNames(config)) {
    const earlier = firstPathByName.get(agent.name);
    if (earlier !== undefined) {
      problems.push({
        path: agent.path,
        message: `must be unique: the agent name ${agent.name} is already used at ${earlier}`,
      });
    } else {
      firstPathByName.set(agent.name, agent.path);
    }
  }

  return problems;
}
