// Cycles among the Connections as analysis findings (F-06 amendment 6, building-blocks §7). A Connection closes a cycle
// when, in list order, its `to` already leads back to its `from` through the enabled Connections before it. Each such
// Connection is one blocker at its own path, so a cycle is reported once, at the Connection that closes it. The check
// covers the pipeline's Connections (between flows) and each enabled child flow's (between blocks). A back route is a
// Condition's retry, not a Connection, so it adds no edge. Disabled Connections and disabled flows are not checked.
// Pure: no I/O.
import type { AnalysisFinding } from '../../model.js';
import type { ChildBlock, PipelineBlock, ProjectConfig } from '../model.js';
import { childPath, indexPath } from '../parse-util.js';

/** True when `target` can be reached from `start` by following the edges, each node to the nodes it leads to. */
function reaches(edges: ReadonlyMap<string, readonly string[]>, start: string, target: string): boolean {
  const seen = new Set<string>();
  const pending = [start];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (node === target) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    pending.push(...(edges.get(node) ?? []));
  }
  return false;
}

/** The blockers of one list of blocks: each enabled Connection that closes a cycle, in list order. */
function cycleFindingsIn(listPath: string, blocks: readonly (ChildBlock | PipelineBlock)[]): AnalysisFinding[] {
  const edges = new Map<string, string[]>();
  return blocks.flatMap((block, index): AnalysisFinding[] => {
    if (block.kind !== 'connection' || !block.enabled) return [];
    const closesCycle = reaches(edges, block.to, block.from);
    edges.set(block.from, [...(edges.get(block.from) ?? []), block.to]);
    if (!closesCycle) return [];
    return [
      {
        severity: 'blocker',
        subject: indexPath(listPath, index),
        message: `connection "${block.id}" closes a cycle: "${block.to}" already leads back to "${block.from}"`,
      },
    ];
  });
}

/** Every Connection that closes a cycle: the pipeline's Connections first, then each enabled child flow's, in order. */
export function cycleFindings(config: ProjectConfig): AnalysisFinding[] {
  const blocksPath = childPath('pipeline', 'blocks');
  const pipelineLevel = cycleFindingsIn(blocksPath, config.pipeline.blocks);
  const flowLevel = config.pipeline.blocks.flatMap((block, index): AnalysisFinding[] =>
    block.kind === 'flow' && block.enabled
      ? cycleFindingsIn(childPath(indexPath(blocksPath, index), 'blocks'), block.blocks)
      : [],
  );
  return [...pipelineLevel, ...flowLevel];
}
