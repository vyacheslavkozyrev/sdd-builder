// The refusals of the generator (architecture.md §6, decision 35). A config with a blocker is not generated;
// warnings never refuse a config, so they are left out here.

import type { ProjectConfig } from '../model.js';
import type { Finding } from '../analyze/index.js';
import { analyzeStructure } from '../analyze/index.js';

// Returns the blocker findings of the structural analysis, in the analysis order. An empty list means the
// config can be generated. Pure: the config is not changed.
export function configProblems(config: ProjectConfig): Finding[] {
  return analyzeStructure(config).filter((finding) => finding.severity === 'blocker');
}
