// The analysis entry point of the pipeline model (F-04). `analyzeStructure` concatenates the structural check lists and
// sorts the findings by severity (blocker, warning, info), then subject (path order, as the generator's problem list),
// then message. Later checks (reachability, retries, inputs, brief) join the list here. Pure: the configuration is read,
// never changed.
import type { AnalysisFinding } from '../../model.js';
import { comparePaths, compareText } from '../generate/generate.js';
import type { ProjectConfig } from '../model.js';
import { refusalFindings } from './refusals.js';

const SEVERITY_RANK: Record<AnalysisFinding['severity'], number> = { blocker: 0, warning: 1, info: 2 };

function compareFindings(a: AnalysisFinding, b: AnalysisFinding): number {
  return (
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    comparePaths(a.subject, b.subject) ||
    compareText(a.message, b.message)
  );
}

/** Every structural finding of the pipeline, sorted. A new array; the configuration is not changed. */
export function analyzeStructure(config: ProjectConfig): AnalysisFinding[] {
  const findings = [...refusalFindings(config)];
  return findings.sort(compareFindings);
}
