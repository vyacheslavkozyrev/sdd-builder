import { childPath, ROOT_PATH } from '../check/primitives.js';
import type { AgentBlock, Block, Flow, ProjectConfig } from '../model.js';
import type { PositionedFinding, Position } from './finding.js';

// The labels an Agent reads and writes must be outcome artifacts of the pipeline (F-12 AC-026). A label in an
// Agent's `reads` or `writes` that no flow of the pipeline lists as an outcome artifact is a blocker at the
// label's own path, `reads.<k>` or `writes.<k>`. The labels are the flows' artifact labels, pooled over every flow.

const PIPELINE_PATH = childPath(ROOT_PATH, 'pipeline');
const FLOWS_PATH = childPath(PIPELINE_PATH, 'flows');

function blockPath(flow: Flow, block: Block): string {
  return childPath(childPath(childPath(FLOWS_PATH, String(flow.index)), 'blocks'), String(block.index));
}

function labelFindings(
  flow: Flow,
  agent: AgentBlock,
  list: 'reads' | 'writes',
  labels: readonly string[] | undefined,
  outcomes: ReadonlySet<string>,
): PositionedFinding[] {
  if (labels === undefined) return [];
  const position: Position = { flow: flow.index, block: agent.index, slot: -1 };
  return labels.flatMap((label, k) =>
    outcomes.has(label)
      ? []
      : [
          {
            severity: 'blocker',
            rule: 'agent-label',
            path: childPath(childPath(blockPath(flow, agent), list), String(k)),
            message: `must name an outcome artifact of a flow, got ${label}`,
            position,
          },
        ],
  );
}

function labelsOfAgent(flow: Flow, agent: AgentBlock, outcomes: ReadonlySet<string>): PositionedFinding[] {
  return [
    ...labelFindings(flow, agent, 'reads', agent.reads, outcomes),
    ...labelFindings(flow, agent, 'writes', agent.writes, outcomes),
  ];
}

export function agentLabelsRule(config: ProjectConfig): PositionedFinding[] {
  const outcomes = new Set(config.pipeline.flows.flatMap((flow) => flow.artifacts.map((artifact) => artifact.label)));
  return config.pipeline.flows.flatMap((flow) =>
    flow.blocks.flatMap((block) => (block.kind === 'agent' ? labelsOfAgent(flow, block, outcomes) : [])),
  );
}
