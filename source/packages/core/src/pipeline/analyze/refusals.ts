// The refusal checks as analysis findings (F-04 AC-004). Each problem that makes `generate` refuse the configuration is a
// blocker whose subject is the problem's path. The list is the one `configProblems` returns, so the analyzer and the
// generator refuse the same things. Pure: no I/O.
import type { AnalysisFinding } from '../../model.js';
import { configProblems } from '../generate/generate.js';
import type { ProjectConfig } from '../model.js';

/** Each refusal problem of the configuration as a blocker, in the order of `configProblems`. */
export function refusalFindings(config: ProjectConfig): AnalysisFinding[] {
  return configProblems(config).map(
    (problem): AnalysisFinding => ({ severity: 'blocker', subject: problem.path, message: problem.message }),
  );
}
