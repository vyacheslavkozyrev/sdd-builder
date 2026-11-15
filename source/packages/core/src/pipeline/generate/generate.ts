// The generator entry point for the pipeline model. It runs the refusal checks, collects every problem, and throws when
// there is any. Otherwise it builds the file list from the parts (base, flow commands, pipeline command, agent and rule
// files), sorts it by path in code-unit order and refuses two files with one path. No file or network I/O here.
import { GenerationError, InvalidConfigError } from '../../errors.js';
import type { GeneratedFile, GenerationResult } from '../../model.js';
import type { ListableTemplateSource } from '../../template-source.js';
import type { ProjectConfig } from '../model.js';
import type { PipelineProblem } from '../parse-util.js';
import { renderAgentAndRuleFiles } from './agent-rule-files.js';
import { renderBaseFiles } from './base-files.js';
import { renderFlowCommands } from './flow-commands.js';
import { renderPipelineCommand } from './pipeline-command.js';
import { checkProblems, descriptionProblems, nameProblems, requiredProblems, ruleTagProblems } from './refusals-names.js';
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

/** Problems sorted by path and then by message. */
function sortProblems(problems: readonly PipelineProblem[]): PipelineProblem[] {
  return [...problems].sort((a, b) => comparePaths(a.path, b.path) || compareText(a.message, b.message));
}

/** A problem as `path: message`. */
function formatProblem(problem: PipelineProblem): string {
  return `${problem.path}: ${problem.message}`;
}

/**
 * The output files sorted by path in plain code-unit order, so `step10.md` comes before `step2.md` (F-02 AC-030). Two
 * files with one path are refused with the path named, and none is returned: a second file never overwrites the
 * first (AC-031).
 */
export function sortedFileList(files: readonly GeneratedFile[]): GeneratedFile[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const file of files) {
    if (seen.has(file.path) && !duplicates.includes(file.path)) duplicates.push(file.path);
    seen.add(file.path);
  }
  if (duplicates.length > 0) {
    throw new GenerationError(duplicates.map((path) => `duplicate output path "${path}"`));
  }
  return [...files].sort((a, b) => compareText(a.path, b.path));
}

/**
 * Every refusal problem of the configuration, sorted by path and then by message. Empty when the configuration can be
 * generated. The generator refuses with this list; the analyzer (F-04) reports the same list as blockers.
 */
export function configProblems(config: ProjectConfig): PipelineProblem[] {
  return sortProblems([
    ...shapeProblems(config),
    ...wiringProblems(config),
    ...routeProblems(config),
    ...descriptionProblems(config),
    ...nameProblems(config),
    ...requiredProblems(config),
    ...checkProblems(config),
    ...ruleTagProblems(config),
  ]);
}

/**
 * The refusal part of the generator: throws InvalidConfigError with every problem when the configuration cannot be
 * generated, and returns nothing otherwise (F-02 AC-013). The planner runs it before it checks the templates.
 */
export function refuseInvalidConfig(config: ProjectConfig): void {
  const problems = configProblems(config);
  if (problems.length > 0) throw new InvalidConfigError(problems.map(formatProblem));
}

/**
 * Generates the framework files for a pipeline. A configuration that cannot be generated is refused
 * with every problem in one error, and no files are returned. The files come out sorted by path, and the same
 * configuration and templates always give the same paths, order and content (F-02 AC-030, AC-031, AC-032).
 */
export function generate(config: ProjectConfig, templates: ListableTemplateSource): GenerationResult {
  refuseInvalidConfig(config);
  const files = [
    ...renderBaseFiles(config, templates),
    ...renderFlowCommands(config),
    renderPipelineCommand(config),
    ...renderAgentAndRuleFiles(config),
  ];
  return { files: sortedFileList(files), warnings: [] };
}
