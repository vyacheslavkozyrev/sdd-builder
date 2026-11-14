import type { ConfigProblem } from '@sddbuilder/core';

/** The paths that have a field on the form. A problem at one of them is shown beside that field. */
const FIELD_PATHS: readonly string[] = [
  'name',
  'idea',
  'stack.language',
  'stack.framework',
  'stack.testFramework',
  'stack.buildTool',
  'architecture.style',
  'architecture.modules',
];

/** A module's name or layer, by list position. Their problems are shown beside those inputs. */
const MODULE_FIELD_PATH = /^architecture\.modules\[\d+\]\.(name|layer)$/;

/**
 * True when the form shows a problem at `path` beside a field (F-05 AC-010, AC-027). Any other
 * path, such as a module's responsibility or a core-only check, goes to the "Other problems"
 * list, so no problem can block Analyze without a visible reason.
 */
export function isShownBeside(path: string): boolean {
  return FIELD_PATHS.includes(path) || MODULE_FIELD_PATH.test(path);
}

/** The reasons of the problems at exactly `path`, shown beside the field that owns the path. */
export function messagesAt(problems: readonly ConfigProblem[], path: string): string[] {
  return problems.filter((problem) => problem.path === path).map((problem) => problem.reason);
}
