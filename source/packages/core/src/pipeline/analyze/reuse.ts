import { checkIdsUnique } from '../check/ids.js';
import { checkRuleTags } from '../check/rule-tags.js';
import type { Problem, ProjectConfig } from '../model.js';
import type { Position, PositionedFinding } from './finding.js';

// Ids unique across the project and rule tags that name a rule (F-03 AC-025, AC-027 duplicate part, AC-030).
// Both checks are the F-02 functions in check/, so the rules are not written twice: each problem they return
// becomes a blocker at the same path. The problems carry no position, so it is read from the path: `rules.<n>.id`,
// `pipeline.arguments.<n>.id` and `pipeline.ruleTags.<n>` are pipeline-level; `pipeline.flows.<n>.<key>` is in flow
// n; `pipeline.flows.<n>.blocks.<m>.<key>` is in block m of that flow. The keys are the flow and block fields
// that hold text, lists or ids. Any other path throws, so a route (`true`/`false`) or a new path shape cannot
// silently get the wrong position: it needs its own slot before a check returns it.

const UNIQUE_ID_RULE = 'unique-id';
const RULE_TAG_RULE = 'rule-tag';

const PIPELINE_POSITION: Position = { flow: -1, block: -1, slot: -1 };
const PIPELINE_LEVEL_PATH = /^(?:rules\.\d+\.id|pipeline\.arguments\.\d+\.id|pipeline\.ruleTags\.\d+)$/;
const FLOW_KEYS = 'id|name|body|description|next|model|approval|artifacts|arguments|ruleTags';
const BLOCK_KEYS =
  'id|kind|name|description|next|model|tools|body|outcome|producedArtifact|arguments|ruleTags';
const FLOW_PATH = new RegExp(`^pipeline\\.flows\\.(\\d+)\\.(?:${FLOW_KEYS})(?:\\.|$)`);
const BLOCK_PATH = new RegExp(`^pipeline\\.flows\\.(\\d+)\\.blocks\\.(\\d+)\\.(?:${BLOCK_KEYS})(?:\\.|$)`);

function positionOf(path: string): Position {
  if (PIPELINE_LEVEL_PATH.test(path)) return PIPELINE_POSITION;
  const block = BLOCK_PATH.exec(path);
  if (block !== null) return { flow: Number(block[1]), block: Number(block[2]), slot: -1 };
  const flow = FLOW_PATH.exec(path);
  if (flow !== null) return { flow: Number(flow[1]), block: -1, slot: -1 };
  throw new Error(`the structural analysis has no position for the problem path ${path}`);
}

function asBlockers(rule: string, problems: readonly Problem[]): PositionedFinding[] {
  return problems.map(({ path, message }) => ({
    severity: 'blocker',
    rule,
    path,
    message,
    position: positionOf(path),
  }));
}

export function reuseRule(config: ProjectConfig): PositionedFinding[] {
  return [
    ...asBlockers(UNIQUE_ID_RULE, checkIdsUnique(config)),
    ...asBlockers(RULE_TAG_RULE, checkRuleTags(config)),
  ];
}
