// The id pass (architecture.md §6 decisions 18 and 33). It runs once the structure is parsed, because uniqueness needs
// the whole pipeline: the ids of the pipeline arguments, the flows and the blocks are unique together, and agent names
// are unique among agents. Each clash is refused at the path of the second occurrence. Rule ids are checked by the
// rules parser in ./project.ts (AC-023) and are not checked again here.

import type { Pipeline } from '../model.js';
import { childPath, itemPath, type Problems } from '../check/primitives.js';

// `written` is the pipeline as the document wrote it, so its key order gives the document order of `arguments` and `flows`.
export function checkIds(pipeline: Pipeline, written: unknown, problems: Problems): void {
  const ids = new Set<string>();
  const agentNames = new Set<string>();

  const claimId = (id: string, path: string): void => {
    if (ids.has(id)) {
      problems.add(path, 'duplicates the id of an earlier flow, block or argument');
    } else {
      ids.add(id);
    }
  };

  const claimAgentName = (name: string, path: string): void => {
    if (agentNames.has(name)) {
      problems.add(path, 'duplicates the name of an earlier agent');
    } else {
      agentNames.add(name);
    }
  };

  const claimArguments = (): void => {
    pipeline.arguments.forEach((argument, index) => {
      claimId(argument.id, childPath(itemPath('pipeline.arguments', index), 'id'));
    });
  };

  const claimFlows = (): void => {
    pipeline.flows.forEach((flow, flowIndex) => {
      const flowPath = itemPath('pipeline.flows', flowIndex);
      claimId(flow.id, childPath(flowPath, 'id'));
      flow.blocks.forEach((block, blockIndex) => {
        const at = itemPath(childPath(flowPath, 'blocks'), blockIndex);
        claimId(block.id, childPath(at, 'id'));
        if (block.kind === 'agent') {
          claimAgentName(block.name, childPath(at, 'name'));
        }
      });
    });
  };

  // Document order: whichever of `arguments` and `flows` the document writes first is claimed first, as the
  // parser reports its problems in that order. Each flow's blocks are claimed in turn.
  if (argumentsWrittenFirst(written)) {
    claimArguments();
    claimFlows();
  } else {
    claimFlows();
    claimArguments();
  }
}

function argumentsWrittenFirst(written: unknown): boolean {
  const keys = typeof written === 'object' && written !== null ? Object.keys(written) : [];
  return keys.indexOf('arguments') < keys.indexOf('flows');
}
