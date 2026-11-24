import type { ProjectConfig } from '../model.js';
import type { Finding, PositionedFinding, Position } from './finding.js';
import { startAndEndRule } from './start-end.js';
import { identityAndTextRule } from './text.js';
import { conditionRule } from './condition.js';
import { reuseRule } from './reuse.js';
import { linksRule } from './links.js';
import { outputsRule } from './outputs.js';
import { agentLabelsRule } from './agent-labels.js';
import { routesRule } from './routes.js';
import { reachRules } from './reach.js';

export type { Finding, Severity } from './finding.js';
export type { ReviewEntry, ReviewResult } from './review.js';
export { checkReview } from './review.js';

// A rule module reads the config and returns its findings. It never changes the config.
export type RuleModule = (config: ProjectConfig) => PositionedFinding[];

// The rule modules, in the order they run. Each rule task adds its module here.
const RULE_MODULES: readonly RuleModule[] = [
  startAndEndRule,
  identityAndTextRule,
  conditionRule,
  reuseRule,
  linksRule,
  outputsRule,
  agentLabelsRule,
  routesRule,
  reachRules,
];

function comparePositions(a: Position, b: Position): number {
  return a.flow - b.flow || a.block - b.block || a.slot - b.slot;
}

// Runs the modules, sorts the findings by position (stable, so equal positions keep module order)
// and removes the positions from the result.
export function analyzeWith(modules: readonly RuleModule[], config: ProjectConfig): Finding[] {
  return modules
    .flatMap((run) => run(config))
    .sort((a, b) => comparePositions(a.position, b.position))
    .map(({ severity, rule, path, message }) => ({ severity, rule, path, message }));
}

export function analyzeStructure(config: ProjectConfig): Finding[] {
  return analyzeWith(RULE_MODULES, config);
}
