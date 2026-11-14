import { validateBrief } from './validate.js';
import type { BriefState } from './state.js';
import type { MapState } from '../builder/map-state.js';

/**
 * Whether the Analyze button is enabled (F-05 AC-015, AC-016, AC-017). It needs a brief with no
 * validation problems, checked against the same builder map that the request is built from, and
 * the privacy checkbox ticked. Either one missing keeps it disabled.
 */
export function canAnalyze(brief: BriefState, accepted: boolean, map: MapState): boolean {
  return accepted && validateBrief(brief, map).length === 0;
}
