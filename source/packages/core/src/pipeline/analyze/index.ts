// The structural checks entry (architecture.md §12). Every rule module adds itself to RULES; the order of
// that list is the rule order used when findings sort.

import type { ProjectConfig } from '../model.js';
import type { Finding, LocatedFinding } from './finding.js';
import { checkLoops } from './cycles.js';
import { checkReachability } from './reach.js';
import { checkRoutes } from './routes.js';
import { checkBlockReferences, checkFlowAndTagReferences } from './references.js';
import { checkGeneratedNames } from './generated-names.js';
import { checkStartAndEnd } from './start-end.js';

export type { Finding, LocatedFinding, Severity } from './finding.js';

// A rule module reads the config and returns the findings it finds, each with its position.
export type Rule = (config: ProjectConfig) => LocatedFinding[];

const RULES: readonly Rule[] = [
  checkStartAndEnd,
  checkBlockReferences,
  checkFlowAndTagReferences,
  checkLoops,
  checkRoutes,
  checkReachability,
  checkGeneratedNames,
];

// Runs the rules in the given order and returns every finding, sorted by flow, then block, then rule
// order, then path. The positions are removed from the result.
export function runRules(config: ProjectConfig, rules: readonly Rule[]): Finding[] {
  const ranked = rules.flatMap((rule, ruleIndex) =>
    rule(config).map((finding) => ({ finding, ruleIndex })),
  );
  ranked.sort(
    (a, b) =>
      a.finding.flow - b.finding.flow ||
      a.finding.block - b.finding.block ||
      a.ruleIndex - b.ruleIndex ||
      compareText(a.finding.path, b.finding.path),
  );
  return ranked.map(({ finding }) => ({
    severity: finding.severity,
    path: finding.path,
    message: finding.message,
  }));
}

// Returns every structural finding of the config in document order. Pure: the config is not changed.
export function analyzeStructure(config: ProjectConfig): Finding[] {
  return runRules(config, RULES);
}

function compareText(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}
