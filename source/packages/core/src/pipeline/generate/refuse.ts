import { analyzeStructure, type Finding } from '../analyze/index.js';
import type { ProjectConfig } from '../model.js';

// The refusal gate of the generator (F-04, AC-019, AC-021 to AC-023). A configuration is generated only when the
// structural analysis (F-03) has no blocker. The problems returned here are exactly the blockers of that analysis,
// in its order. A warning never refuses, so it is not returned. An empty list means the configuration may be planned.

// The blockers of a list of findings, in the same order. A warning is dropped.
export function blockersOf(findings: readonly Finding[]): Finding[] {
  return findings.filter((finding) => finding.severity === 'blocker');
}

export function configProblems(config: ProjectConfig): Finding[] {
  return blockersOf(analyzeStructure(config));
}
