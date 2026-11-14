import type { ConfigProblem } from '@sddbuilder/core';
import type { MapState } from '../builder/map-state.js';
import type { BriefState } from './state.js';
import { buildRules } from './to-config.js';
import { validateBrief } from './validate.js';

/**
 * The state of one progress entry: `valid` shows ✓, `optional` shows ○ "optional", and
 * `incomplete` shows an empty mark (F-05 AC-013).
 */
export type ProgressStatus = 'valid' | 'incomplete' | 'optional';

/** One row of the progress panel: `label` is the text the panel shows (F-05 AC-013). */
export interface ProgressEntry {
  key: 'idea' | 'stack' | 'modules' | 'rules';
  label: string;
  status: ProgressStatus;
}

/** True when the problem belongs to the field at `path` or to one of its nested paths. */
function belongsTo(problem: ConfigProblem, path: string): boolean {
  return problem.path === path || problem.path.startsWith(`${path}.`) || problem.path.startsWith(`${path}[`);
}

/** The status of an entry whose required fields are the problems at `paths`. */
function requiredStatus(problems: readonly ConfigProblem[], paths: readonly string[]): ProgressStatus {
  const failing = problems.some((problem) => paths.some((path) => belongsTo(problem, path)));
  return failing ? 'incomplete' : 'valid';
}

/**
 * The four progress entries, in panel order (F-05 AC-013). Idea, stack and modules are valid when
 * the validation finds no problem at their own paths. Rules are optional until one or more
 * non-blank rules exist across both lists, then valid.
 */
export function progressEntries(brief: BriefState, map: MapState): ProgressEntry[] {
  const problems = validateBrief(brief, map);
  const ruleCount = buildRules(brief.codeRules).length + buildRules(brief.testRules).length;
  return [
    { key: 'idea', label: 'Idea written', status: requiredStatus(problems, ['idea']) },
    { key: 'stack', label: 'Stack chosen', status: requiredStatus(problems, ['stack']) },
    { key: 'modules', label: 'Modules listed', status: requiredStatus(problems, ['architecture.modules']) },
    { key: 'rules', label: 'Rules (optional)', status: ruleCount === 0 ? 'optional' : 'valid' },
  ];
}
