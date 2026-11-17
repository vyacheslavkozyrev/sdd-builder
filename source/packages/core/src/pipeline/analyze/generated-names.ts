// The names the generator writes that the config could clash with (architecture.md §6, decision 35). A flow
// whose id is `pipeline` would write `.claude/commands/pipeline.md`, the path of the pipeline command, so the
// flow is a blocker at its own path.

import type { ProjectConfig } from '../model.js';
import type { LocatedFinding } from './finding.js';

export function checkGeneratedNames(config: ProjectConfig): LocatedFinding[] {
  return config.pipeline.flows.flatMap((flow, flowIndex) => {
    if (flow.id !== 'pipeline') {
      return [];
    }
    return [
      {
        severity: 'blocker',
        path: `pipeline.flows[${flowIndex}]`,
        message:
          'The flow id "pipeline" clashes with pipeline.md: its command file would be .claude/commands/pipeline.md, the same file as the pipeline command. Rename the flow.',
        flow: flowIndex,
        block: -1,
      },
    ];
  });
}
