// The names the builder shows for a problem (F-16 AC-022). The analyzer's paths and ids stay in core; the
// builder shows names instead. A location is the flow's name, the block's name (an Agent's name, "Start",
// "End", a Condition's description), or "pipeline" for a pipeline field. A message that quotes a path or an
// id is rewritten with the same names. A pure function of the pipeline and the problem: no React and no I/O.

import type { pipeline } from '@sddbuilder/core';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;
type Block = pipeline.Block;

export interface ProblemLabel {
  // Where the problem is: the flow's name, the block's name, or "pipeline".
  readonly location: string;
  // The analyzer's message, with each quoted path and each quoted flow or block id replaced by its name.
  readonly message: string;
}

// A flow's path, with the block's path below it when there is one (`pipeline.flows.<n>.blocks.<m>`).
const PATH_START = /^pipeline\.flows\.(\d+)(?:\.blocks\.(\d+))?(?=\.|$)/;
// A path quoted inside a message: a flow's or block's path, or a pipeline field's path, with every segment below it
// (a key or a list index, such as `arguments.0.id`), so no part of the path is left in the message.
const QUOTED_PATH = /(?<![\w.-])(?:pipeline\.flows\.\d+(?:\.blocks\.\d+)?|pipeline)(?![\w-])(?:\.\w+)*/;
const PATH_TOKEN = /^pipeline(?:\.|$)/;

// The name of a flow. A blank name (refused by the analyzer) is shown as its number in the pipeline.
function flowName(flow: Flow, pipelineState: Pipeline): string {
  return flow.name.trim() === '' ? `Flow ${pipelineState.flows.indexOf(flow) + 1}` : flow.name;
}

// The name of a block. An Agent or Condition with no name or description is shown as its number among the
// blocks of its kind in the flow.
function blockName(block: Block, flow: Flow): string {
  const ordinal = flow.blocks.filter((other) => other.kind === block.kind).indexOf(block) + 1;
  switch (block.kind) {
    case 'start':
      return 'Start';
    case 'end':
      return 'End';
    case 'agent':
      return block.name.trim() === '' ? `Agent ${ordinal}` : block.name;
    case 'condition':
      return block.description.trim() === '' ? `Condition ${ordinal}` : block.description;
  }
}

// The flow and, when the path names one, the block that a path points at. A path that names no flow of the
// pipeline has no location in it.
function locate(
  path: string,
  pipelineState: Pipeline,
): { readonly flow: Flow; readonly block: Block | undefined } | undefined {
  const match = PATH_START.exec(path);
  if (match === null) {
    return undefined;
  }
  const flow = pipelineState.flows.find((candidate) => candidate.index === Number(match[1]));
  if (flow === undefined) {
    return undefined;
  }
  const block =
    match[2] === undefined ? undefined : flow.blocks.find((candidate) => candidate.index === Number(match[2]));
  return { flow, block };
}

// The name of the place a path points at: the block's name, the flow's name, or "pipeline".
function nameOfPath(path: string, pipelineState: Pipeline): string {
  const found = locate(path, pipelineState);
  if (found === undefined) {
    return 'pipeline';
  }
  return found.block === undefined ? flowName(found.flow, pipelineState) : blockName(found.block, found.flow);
}

// The name of each flow id and each block id. A flow id is named by its flow; a block id by the first block
// that has it, looking first in the flow the problem is in.
function namesOfIds(pipelineState: Pipeline, own: Flow | undefined): Map<string, string> {
  const names = new Map<string, string>();
  for (const flow of pipelineState.flows) {
    if (!names.has(flow.id)) {
      names.set(flow.id, flowName(flow, pipelineState));
    }
  }
  const others = pipelineState.flows.filter((flow) => flow !== own);
  const ordered = own === undefined ? pipelineState.flows : [own, ...others];
  for (const flow of ordered) {
    for (const block of flow.blocks) {
      if (!names.has(block.id)) {
        names.set(block.id, blockName(block, flow));
      }
    }
  }
  return names;
}

function escapeForPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The message with every quoted path and every quoted flow or block id replaced by its name. An id is matched
// as a whole word, longest first, so an id that contains another id is not cut short.
function rewriteMessage(message: string, pipelineState: Pipeline, own: Flow | undefined): string {
  const names = namesOfIds(pipelineState, own);
  const ids = [...names.keys()].filter((id) => id !== '').sort((a, b) => b.length - a.length);
  const pattern =
    ids.length === 0
      ? new RegExp(QUOTED_PATH.source, 'g')
      : new RegExp(`${QUOTED_PATH.source}|(?<![\\w-])(?:${ids.map(escapeForPattern).join('|')})(?![\\w-])`, 'g');
  return message.replace(pattern, (token: string) => {
    if (PATH_TOKEN.test(token)) {
      return nameOfPath(token, pipelineState);
    }
    return names.get(token) ?? token;
  });
}

// The label of one problem of the pipeline: where it is, and its message with the names in place of the ids and paths.
export function problemLabel(problem: pipeline.Problem, pipelineState: Pipeline): ProblemLabel {
  const found = locate(problem.path, pipelineState);
  return {
    location: nameOfPath(problem.path, pipelineState),
    message: rewriteMessage(problem.message, pipelineState, found?.flow),
  };
}
