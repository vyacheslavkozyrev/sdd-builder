// Block connections and Check routes name a block of their own flow (architecture.md §12, decision 33).
// A `connectedTo` that names a block of another flow, or no block, is a blocker at its path. A Check route
// is checked the same way; a route with `stop` names no block and is accepted.
// A flow's `connectedTo` names a flow of the pipeline, and a rule tag on the pipeline, a flow or an agent
// names an id of `rules` (decision 21). Each refusal is a blocker at the path of the item that is wrong.

import type { ProjectConfig, Route } from '../model.js';
import type { LocatedFinding } from './finding.js';

export function checkFlowAndTagReferences(config: ProjectConfig): LocatedFinding[] {
  const flowIds = new Set(config.pipeline.flows.map((flow) => flow.id));
  const ruleIds = new Set(config.rules.map((rule) => rule.id));
  const pipelinePosition = { flow: -1, block: -1 };
  return [
    ...tagFindings(ruleIds, 'pipeline', config.pipeline.ruleTags ?? [], pipelinePosition),
    ...config.pipeline.flows.flatMap((flow, flowIndex) => {
      const flowPath = `pipeline.flows[${flowIndex}]`;
      const flowPosition = { flow: flowIndex, block: -1 };
      const linkFindings =
        flow.connectedTo === undefined
          ? []
          : flowLinkFindings(flowIds, `${flowPath}.connectedTo`, flow.connectedTo.to, flowPosition);
      return [
        ...linkFindings,
        ...tagFindings(ruleIds, flowPath, flow.ruleTags ?? [], flowPosition),
        ...flow.blocks.flatMap((block, blockIndex) =>
          block.kind === 'agent'
            ? tagFindings(ruleIds, `${flowPath}.blocks[${blockIndex}]`, block.ruleTags ?? [], {
                flow: flowIndex,
                block: blockIndex,
              })
            : [],
        ),
      ];
    }),
  ];
}

export function checkBlockReferences(config: ProjectConfig): LocatedFinding[] {
  const allBlockIds = new Set(config.pipeline.flows.flatMap((flow) => flow.blocks.map((block) => block.id)));
  return config.pipeline.flows.flatMap((flow, flowIndex) => {
    const ownBlockIds = new Set(flow.blocks.map((block) => block.id));
    return flow.blocks.flatMap((block, blockIndex) => {
      const blockPath = `pipeline.flows[${flowIndex}].blocks[${blockIndex}]`;
      const scope: Scope = { ownBlockIds, allBlockIds, position: { flow: flowIndex, block: blockIndex } };
      if (block.kind === 'check') {
        return [
          ...routeFindings(scope, `${blockPath}.connectedTo.true`, block.connectedTo.true),
          ...routeFindings(scope, `${blockPath}.connectedTo.false`, block.connectedTo.false),
        ];
      }
      if (block.kind === 'end' || block.connectedTo === undefined) {
        return [];
      }
      return targetFindings(scope, `${blockPath}.connectedTo`, block.connectedTo.to, 'connection');
    });
  });
}

// Where a finding sits in the config: the flow index and the block index (-1 for the pipeline or a flow).
interface Position {
  flow: number;
  block: number;
}

interface Scope {
  ownBlockIds: ReadonlySet<string>;
  allBlockIds: ReadonlySet<string>;
  position: Position;
}

function routeFindings(scope: Scope, path: string, route: Route): LocatedFinding[] {
  if (!('to' in route)) {
    return [];
  }
  return targetFindings(scope, path, route.to, 'route');
}

// One blocker when `to` names no block of the flow: a block of another flow, or no block at all.
function targetFindings(scope: Scope, path: string, to: string, kind: 'connection' | 'route'): LocatedFinding[] {
  if (scope.ownBlockIds.has(to)) {
    return [];
  }
  const named = `The ${kind} names "${to}"`;
  const inAnotherFlow = scope.allBlockIds.has(to);
  const message = inAnotherFlow
    ? `${named}, a block of another flow. Name a block of this flow.`
    : `${named}, which is no block. Name a block of this flow.`;
  return [{ severity: 'blocker', path, message, ...scope.position }];
}

// One blocker at a flow's `connectedTo` when it names no flow of the pipeline.
function flowLinkFindings(
  flowIds: ReadonlySet<string>,
  path: string,
  to: string,
  position: Position,
): LocatedFinding[] {
  if (flowIds.has(to)) {
    return [];
  }
  const message = `The flow connection names "${to}", which is no flow of the pipeline. Name a flow of this pipeline.`;
  return [{ severity: 'blocker', path, message, ...position }];
}

// One blocker per rule tag, at `<owner>.ruleTags[n]`, when the tag names no id of `rules`.
function tagFindings(
  ruleIds: ReadonlySet<string>,
  owner: string,
  tags: readonly string[],
  position: Position,
): LocatedFinding[] {
  return tags.flatMap((tag, tagIndex) => {
    if (ruleIds.has(tag)) {
      return [];
    }
    const message = `The rule tag "${tag}" names no rule. Name an id of the rules.`;
    return [{ severity: 'blocker', path: `${owner}.ruleTags[${tagIndex}]`, message, ...position }];
  });
}
