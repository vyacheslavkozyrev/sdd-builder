import { INPUT_CAPS, parseProjectConfig } from '@sddbuilder/core';
import type { ConfigProblem } from '@sddbuilder/core';
import { groupThousands } from './counter.js';
import type { BriefState } from './state.js';
import { toProjectConfig } from './to-config.js';

/** The idea problems: blank or whitespace-only, or over the cap. The cap counts the raw text (F-05 AC-002). */
function ideaProblems(idea: string): ConfigProblem[] {
  if (idea.trim() === '') {
    return [{ path: 'idea', reason: 'is required' }];
  }
  if (idea.length > INPUT_CAPS.ideaCharacters) {
    const cap = groupThousands(INPUT_CAPS.ideaCharacters);
    return [{ path: 'idea', reason: `must be at most ${cap} characters` }];
  }
  return [];
}

/**
 * The problem of one module's layer, given the module's 0-based list index. The path uses that
 * index, as `parseProjectConfig` does (`architecture.modules[i]`). The reason counts rows from 1,
 * the number a user counts down the module table. Neither echoes the typed value (F-05 AC-010).
 */
function layerProblem(index: number): ConfigProblem {
  return {
    path: `architecture.modules[${index}].layer`,
    reason: `module ${index + 1} layer must be a whole number of 0 or more`,
  };
}

/** The problems of the fields the form owns, in form order. Layers are checked by the build. */
function fieldProblems(brief: BriefState): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  if (brief.name.trim() === '') {
    problems.push({ path: 'name', reason: 'is required' });
  }
  problems.push(...ideaProblems(brief.idea));
  if (brief.stack.language.trim() === '') {
    problems.push({ path: 'stack.language', reason: 'is required' });
  }
  if (brief.architecture.style.trim() === '') {
    problems.push({ path: 'architecture.style', reason: 'is required' });
  }
  return problems;
}

/**
 * Validates the brief and returns one problem per failing field, in form order (F-05 AC-001,
 * AC-004, AC-005, AC-008, AC-010). The layers are checked by the same build that makes the
 * configuration, so a bad layer and its problem cannot disagree. When the fields and layers pass,
 * the built configuration is checked by `parseProjectConfig`, and its problems are returned at
 * their own paths, which are the form field paths. An empty list means the brief is valid (AC-019).
 */
export function validateBrief(brief: BriefState): ConfigProblem[] {
  const problems = fieldProblems(brief);
  const built = toProjectConfig(brief);
  if (!built.ok) {
    return [...problems, ...built.badLayers.map(layerProblem)];
  }
  if (problems.length > 0) {
    return problems;
  }
  const result = parseProjectConfig(built.config);
  return result.ok ? [] : result.problems;
}
