import { checkBlockLinks } from '../check/block-links.js';
import { checkEndArtifacts } from '../check/end-artifact.js';
import { checkFlowLinks, checkFlowNames } from '../check/flow-links.js';
import { checkIdsUnique } from '../check/ids.js';
import { createProblemCollector, isRecord } from '../check/primitives.js';
import { checkRuleTags } from '../check/rule-tags.js';
import type { Flow, Problem, ProjectConfig, Rule } from '../model.js';
import { parseRoot } from './project.js';

// The parser entry. It takes an unknown value (a parsed JSON document) and returns either the typed
// config, when there is no problem at all, or the non-empty list of every problem found, each with its
// path (AC-001, AC-005, AC-006). It never throws on bad input and never changes the value it is given
// (AC-085). The shape pass runs first. The cross-checks then run on the rules and the pipeline that
// parsed, grouped by check in this order: ids, rule tags, flow names, flow links, block links, End
// artifacts. A check is skipped when a list it reads lost an item to the shape pass: a reference to a
// refused item would be reported as missing, and the refusal of that item already names it.

export type ParseResult =
  | { readonly ok: true; readonly config: ProjectConfig }
  | { readonly ok: false; readonly problems: readonly Problem[] };

// The lists the shape pass shortened: at least one item of the document was refused and left out.
interface Shortened {
  readonly rules: boolean;
  readonly flows: boolean;
  readonly blocks: boolean;
  readonly artifacts: boolean;
}

// A list is kept whole when the parsed list has as many items as the document list.
function keptWhole(documentList: unknown, kept: readonly unknown[]): boolean {
  return Array.isArray(documentList) && documentList.length === kept.length;
}

// Compares each list with its document list. A flow is found by its document index, so the blocks and
// artifacts are compared with the right flow whatever the position of the flow in the parsed list.
function findShortened(input: unknown, rules: readonly Rule[], flows: readonly Flow[]): Shortened {
  const root = isRecord(input) ? input : {};
  const pipeline = isRecord(root.pipeline) ? root.pipeline : {};
  const documentFlows: unknown[] | undefined = Array.isArray(pipeline.flows) ? pipeline.flows : undefined;
  const shortened = {
    rules: !keptWhole(root.rules, rules),
    flows: documentFlows === undefined || !keptWhole(documentFlows, flows),
    blocks: false,
    artifacts: false,
  };
  if (documentFlows === undefined) return shortened;

  for (const flow of flows) {
    const document: unknown = documentFlows[flow.index];
    if (!isRecord(document)) continue;
    if (!keptWhole(document.blocks, flow.blocks)) shortened.blocks = true;
    if (!keptWhole(document.artifacts, flow.artifacts)) shortened.artifacts = true;
  }
  return shortened;
}

function checkAcrossProject(config: Pick<ProjectConfig, 'rules' | 'pipeline'>, shortened: Shortened): Problem[] {
  return [
    ...checkIdsUnique(config),
    ...(shortened.rules ? [] : checkRuleTags(config)),
    ...checkFlowNames(config),
    ...(shortened.flows ? [] : checkFlowLinks(config)),
    ...(shortened.flows || shortened.blocks ? [] : checkBlockLinks(config)),
    ...(shortened.artifacts ? [] : checkEndArtifacts(config)),
  ];
}

export function parseProjectConfig(input: unknown): ParseResult {
  const problems = createProblemCollector();
  const parts = parseRoot(input, problems);

  if (parts.rules !== undefined && parts.pipeline !== undefined) {
    const shortened = findShortened(input, parts.rules, parts.pipeline.flows);
    for (const problem of checkAcrossProject({ rules: parts.rules, pipeline: parts.pipeline }, shortened)) {
      problems.add(problem.path, problem.message);
    }
  }

  const list = problems.list();
  if (list.length > 0) return { ok: false, problems: list };

  // Without a problem, every required key was read: a reader that returned nothing always reported a problem.
  if (parts.rules === undefined || parts.pipeline === undefined) {
    throw new Error('F-02: a config with no problems must have its rules and its pipeline');
  }
  return {
    ok: true,
    config: { ...parts, schemaVersion: 2, rules: parts.rules, pipeline: parts.pipeline },
  };
}
