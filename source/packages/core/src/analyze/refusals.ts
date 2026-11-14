import type { AnalysisFinding, ProjectConfig } from '../model.js';
import { validateConfig } from '../validate/index.js';

/**
 * The quoted label that opens a validator message, such as `workflow "x"` or `condition "c1"`.
 * The id inside the quotes may hold any character, so the label ends at the first quote that is
 * followed by one of the separators the validators write after it: `: `, ` is ` or ` cannot `.
 */
const LABEL = /^(?:duplicate id|required workflow|workflow|connection|condition|custom step) "[\s\S]*?"(?=: | is | cannot )/;

/** Each problem that makes `generate()` refuse the configuration, as a blocker finding, in `validateConfig` order. */
export function refusalFindings(config: ProjectConfig): AnalysisFinding[] {
  return validateConfig(config).map((message): AnalysisFinding => ({
    severity: 'blocker',
    subject: subjectOf(message),
    message,
  }));
}

function subjectOf(problem: string): string {
  const label = LABEL.exec(problem);
  return label ? label[0] : 'configuration';
}
