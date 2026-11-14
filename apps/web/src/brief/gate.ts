import { validateBrief } from './validate.js';
import type { BriefState } from './state.js';

/**
 * Whether the Analyze button is enabled (F-05 AC-015, AC-016, AC-017). It needs a brief with no
 * validation problems and the privacy checkbox ticked. Either one missing keeps it disabled.
 */
export function canAnalyze(brief: BriefState, accepted: boolean): boolean {
  return accepted && validateBrief(brief).length === 0;
}
