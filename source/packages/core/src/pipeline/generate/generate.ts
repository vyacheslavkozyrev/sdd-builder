// The generator entry point for the pipeline model. It runs the refusal checks, collects every problem,
// and throws when there is any; the file list comes in later tasks. No file or network I/O here.
import { InvalidConfigError } from '../../errors.js';
import type { GenerationResult } from '../../model.js';
import type { TemplateSource } from '../../template-source.js';
import type { ProjectConfig } from '../model.js';
import type { PipelineProblem } from '../parse-util.js';
import { checkProblems, descriptionProblems, nameProblems, requiredProblems } from './refusals-names.js';
import { routeProblems } from './refusals-routes.js';
import { shapeProblems, wiringProblems } from './refusals-shape.js';

/** Plain code-unit order, so the same problems always come out in the same order on every machine. */
function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Path order where a number inside a path compares by its value, so `pipeline.blocks[2]` comes before
 * `pipeline.blocks[10]`. Code-unit order for the text around the numbers.
 */
function comparePaths(a: string, b: string): number {
  const left = a.split(/(\d+)/);
  const right = b.split(/(\d+)/);
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const x = left[i] ?? '';
    const y = right[i] ?? '';
    if (x === y) continue;
    // Odd positions hold the digit runs that the split captured.
    if (i % 2 === 1) return Number(x) - Number(y) || compareText(x, y);
    return compareText(x, y);
  }
  return left.length - right.length;
}

/** Every problem as `path: message`, sorted by path and then by message. */
function sortedProblems(problems: readonly PipelineProblem[]): string[] {
  return [...problems]
    .sort((a, b) => comparePaths(a.path, b.path) || compareText(a.message, b.message))
    .map((problem) => `${problem.path}: ${problem.message}`);
}

/**
 * Generates the framework files for a pipeline. A configuration that cannot be generated is refused
 * with every problem in one error, and no files are returned.
 */
export function generate(config: ProjectConfig, templates: TemplateSource): GenerationResult {
  const problems = [
    ...shapeProblems(config),
    ...wiringProblems(config),
    ...routeProblems(config),
    ...descriptionProblems(config),
    ...nameProblems(config),
    ...requiredProblems(config),
    ...checkProblems(config),
  ];
  if (problems.length > 0) throw new InvalidConfigError(sortedProblems(problems));
  return { files: [], warnings: [] };
}
