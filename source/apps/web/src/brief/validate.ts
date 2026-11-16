import { INPUT_CAPS, parseProjectConfig } from '@sddbuilder/core';
import type { ConfigProblem } from '@sddbuilder/core';
import { codePointLength, groupThousands } from '../wizard/counter.js';
import type { MapState } from '../builder/map-state.js';
import type { BriefState } from './state.js';
import { toProjectConfig } from './to-config.js';

/**
 * The idea problems: blank or whitespace-only, or over the cap. The cap counts the raw text in code
 * points (F-05 AC-002, AC-008).
 */
function ideaProblems(idea: string): ConfigProblem[] {
  if (idea.trim() === '') {
    return [{ path: 'idea', reason: 'is required' }];
  }
  if (codePointLength(idea) > INPUT_CAPS.ideaCharacters) {
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

/**
 * The problem of one module's name that is blank or whitespace-only. The core model accepts an
 * empty name, so this check is the form's own (F-05 AC-027). It does not echo the typed value.
 */
function moduleNameProblem(index: number): ConfigProblem {
  return {
    path: `architecture.modules[${index}].name`,
    reason: `module ${index + 1} name is required`,
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
  if (brief.architecture.modules.length === 0) {
    problems.push({ path: 'architecture.modules', reason: 'needs at least one module' });
  }
  brief.architecture.modules.forEach((row, index) => {
    if (row.name.trim() === '') {
      problems.push(moduleNameProblem(index));
    }
  });
  return problems;
}

/**
 * Validates the brief and returns one problem per failing field, in form order (F-05 AC-001,
 * AC-004, AC-005, AC-008, AC-010, AC-027, AC-028). The field checks, including the module names
 * and the presence of at least one module, always run, so no problem hides another. The layers are
 * checked by the same build that makes the configuration, so a bad layer and its problem cannot
 * disagree. `parseProjectConfig` runs only when no field problem exists, on the configuration that
 * includes the builder's workflows and connections (F-06 AC-002); its problems are returned at their
 * own paths, which are the form field paths or, for the map, the `workflows` and `connections` paths.
 * An empty list means the brief and the map are valid (AC-019).
 */
export function validateBrief(brief: BriefState, map: MapState): ConfigProblem[] {
  const problems = fieldProblems(brief);
  const built = toProjectConfig(brief, map);
  if (!built.ok) {
    return [...problems, ...built.badLayers.map(layerProblem)];
  }
  if (problems.length > 0) {
    return problems;
  }
  const result = parseProjectConfig(built.config);
  return result.ok ? [] : result.problems;
}
