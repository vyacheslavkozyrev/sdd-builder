import { childPath, ROOT_PATH } from './primitives.js';
import type { Problem, ProjectConfig } from '../model.js';

// Flow names and the `next` links between flows (decisions 38, 39; AC-028, AC-031 to AC-035).
// A flow name is unique among the flows of the pipeline, compared as written: "plan" and "Plan" are two names
// (AC-028). A flow's `next` names the id of another flow of the same pipeline: not its own id, and not an id that
// is no flow (AC-031, AC-032). At most one flow names a given flow (AC-033). Following `next` from a flow never
// returns to a flow already in the chain (AC-034). In a pipeline of more than one flow, a flow with neither an
// outgoing nor an incoming `next` is refused (AC-035). Each check returns its problems; an empty list means the
// names and links are valid.

const FLOWS_PATH = childPath(childPath(ROOT_PATH, 'pipeline'), 'flows');

function flowPath(index: number): string {
  return childPath(FLOWS_PATH, String(index));
}

export function checkFlowNames(config: Pick<ProjectConfig, 'pipeline'>): Problem[] {
  const seen = new Set<string>();
  const problems: Problem[] = [];
  config.pipeline.flows.forEach((flow, index) => {
    if (seen.has(flow.name)) {
      problems.push({
        path: childPath(flowPath(index), 'name'),
        message: `must be unique among the flows, got ${flow.name}, which another flow already has`,
      });
    }
    seen.add(flow.name);
  });
  return problems;
}

export function checkFlowLinks(config: Pick<ProjectConfig, 'pipeline'>): Problem[] {
  const { flows } = config.pipeline;
  const indexById = new Map<string, number>();
  flows.forEach((flow, index) => {
    if (!indexById.has(flow.id)) indexById.set(flow.id, index);
  });

  const problems: Problem[] = [];
  const namedTargets = new Set<number>();

  // The index of the flow each valid `next` names; undefined when the flow has no next or the link is refused.
  const targets: (number | undefined)[] = flows.map(() => undefined);
  flows.forEach((flow, index) => {
    if (flow.next === undefined) return;
    const path = childPath(flowPath(index), 'next');
    if (flow.next === flow.id) {
      problems.push({ path, message: 'must name another flow of this pipeline, not the flow itself' });
      return;
    }
    const target = indexById.get(flow.next);
    if (target === undefined) {
      problems.push({ path, message: `must name a flow of this pipeline, got ${flow.next}` });
      return;
    }
    if (namedTargets.has(target)) {
      problems.push({ path, message: `must not name a flow that another flow already names, got ${flow.next}` });
      return;
    }
    namedTargets.add(target);
    targets[index] = target;
  });

  // Walks each chain of links once. A link into a flow already on the current walk closes a loop; it is refused
  // at the `next` that closes it. Flows already walked are not walked again.
  const walked = new Set<number>();
  flows.forEach((_flow, start) => {
    if (walked.has(start)) return;
    const onWalk = new Set<number>();
    let current: number | undefined = start;
    while (current !== undefined && !walked.has(current)) {
      onWalk.add(current);
      const following: number | undefined = targets[current];
      if (following !== undefined && onWalk.has(following)) {
        problems.push({
          path: childPath(flowPath(current), 'next'),
          message: 'must not lead back to a flow already in the chain of next links',
        });
        break;
      }
      current = following;
    }
    onWalk.forEach((index) => walked.add(index));
  });

  if (flows.length > 1) {
    const referencedIds = new Set<string>();
    flows.forEach((flow) => {
      if (flow.next !== undefined && flow.next !== flow.id) referencedIds.add(flow.next);
    });
    flows.forEach((flow, index) => {
      if (flow.next === undefined && !referencedIds.has(flow.id)) {
        problems.push({
          path: flowPath(index),
          message: 'must be linked to another flow: a next here, or a next of another flow that names it',
        });
      }
    });
  }

  return problems;
}
