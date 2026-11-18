// Structure marks on the Pipeline tab (F-11 AC-035 to AC-039). A pure function: it runs the structural analyzer of
// `core` on the pipeline and places each finding on the flow box or the arrow it names. No rule is copied here: the
// findings are exactly the analyzer's (AC-039). Brief problems are not in the analyzer's result, so they never appear
// on this tab (AC-038).

import { pipeline } from '@sddbuilder/core';
import { ruleIdFromName } from '../wizard/technical.js';

type Pipeline = pipeline.Pipeline;
type Finding = pipeline.Finding;
type Rule = pipeline.Rule;

// A rule block of step 2: its name and its description, as the wizard holds them.
export interface RuleBlock {
  readonly name: string;
  readonly description: string;
}

// The rule list of the config: each block's id is the F-10 rule-id function of its name (ui.md §2).
export function rulesFor(blocks: readonly RuleBlock[]): Rule[] {
  return blocks.map((block) => ({
    id: ruleIdFromName(block.name),
    title: block.name,
    text: block.description,
  }));
}

// The findings of the pipeline, by where they are drawn. `boxes[i]` and `arrows[i]` belong to flow i, in pipeline
// order; `arrows[i]` is the arrow that leaves flow i. `notDrawn` holds the findings that name no drawn item.
export interface Marks {
  readonly boxes: readonly (readonly Finding[])[];
  readonly arrows: readonly (readonly Finding[])[];
  readonly notDrawn: readonly Finding[];
}

type Placement =
  | { readonly kind: 'box'; readonly index: number }
  | { readonly kind: 'arrow'; readonly index: number }
  | { readonly kind: 'none' };

const NOT_DRAWN: Placement = { kind: 'none' };

// Where a finding path is drawn. `pipeline.flows[i]` and `pipeline.flows[i].<key>` are on box i, except
// `connectedTo` (a link or its gate), which is on arrow i, and `blocks`, which names a block. Any other path
// (a block, `pipeline.flows`, `pipeline.<key>`, `rules`) is not drawn.
function placement(path: string, config: Pipeline): Placement {
  const match = /^pipeline\.flows\[(\d+)\](?:\.(\w+))?/.exec(path);
  if (match === null) {
    return NOT_DRAWN;
  }
  const index = Number(match[1]);
  const flow = config.flows[index];
  if (flow === undefined) {
    return NOT_DRAWN;
  }
  const key = match[2];
  if (key === undefined) {
    return { kind: 'box', index };
  }
  if (key === 'connectedTo') {
    return flow.connectedTo === undefined ? NOT_DRAWN : { kind: 'arrow', index };
  }
  if (key === 'blocks') {
    return NOT_DRAWN;
  }
  return { kind: 'box', index };
}

// The marks of each arrow, keyed by the id of the flow the arrow leaves (its source), for the canvas edges.
export function arrowMarksBySource(config: Pipeline, marks: Marks): Map<string, readonly Finding[]> {
  return new Map(config.flows.map((flow, index) => [flow.id, marks.arrows[index] ?? []]));
}

// Runs the analyzer on the pipeline with the given rule list and places every finding. The config is not changed.
export function marksFor(config: Pipeline, rules: readonly Rule[]): Marks {
  const findings = pipeline.analyzeStructure({ schemaVersion: 2, rules: [...rules], pipeline: config });
  const boxes: Finding[][] = config.flows.map((): Finding[] => []);
  const arrows: Finding[][] = config.flows.map((): Finding[] => []);
  const notDrawn: Finding[] = [];
  for (const finding of findings) {
    const slot = slotFor(placement(finding.path, config), boxes, arrows);
    if (slot === undefined) {
      notDrawn.push(finding);
    } else {
      slot.push(finding);
    }
  }
  return { boxes, arrows, notDrawn };
}

// The list a finding goes into, or undefined when it is not drawn.
function slotFor(
  placed: Placement,
  boxes: Finding[][],
  arrows: Finding[][],
): Finding[] | undefined {
  if (placed.kind === 'box') {
    return boxes[placed.index];
  }
  if (placed.kind === 'arrow') {
    return arrows[placed.index];
  }
  return undefined;
}
