import { childPath, ROOT_PATH } from '../check/primitives.js';
import { flowFileName } from '../generate/flow-file.js';
import type { Flow, ProjectConfig } from '../model.js';
import type { Position, PositionedFinding } from './finding.js';

// The command file of each flow takes its name (F-16, AC-014, AC-015). A flow name with no letter or digit gives an empty
// file name, and two flows whose names give the same file name would write one file twice; both are blockers at the flow's
// name. A blank name is already refused by the flow-name rule (F-03 AC-028), so it is not reported twice here. The file
// name `pipeline` is the pipeline command's own file, so a flow with that name is refused too.

const FLOWS_PATH = childPath(childPath(ROOT_PATH, 'pipeline'), 'flows');
const PIPELINE_FILE_NAME = 'pipeline';
const NAME_RULE = 'command-file-name';
const CLASH_RULE = 'command-file-clash';

function flowPath(flow: Flow): string {
  return childPath(FLOWS_PATH, String(flow.index));
}

function blocker(rule: string, flow: Flow, message: string): PositionedFinding {
  const position: Position = { flow: flow.index, block: -1, slot: -1 };
  return { severity: 'blocker', rule, path: childPath(flowPath(flow), 'name'), message, position };
}

export function commandFileRule(config: ProjectConfig): PositionedFinding[] {
  const findings: PositionedFinding[] = [];
  const owners = new Map<string, Flow>();

  for (const flow of config.pipeline.flows) {
    if (!/\S/.test(flow.name)) continue;
    const fileName = flowFileName(flow);
    if (fileName === '') {
      findings.push(
        blocker(NAME_RULE, flow, `flow ${flow.id} gives no command file name: its name must have a letter or digit`),
      );
      continue;
    }
    if (fileName === PIPELINE_FILE_NAME) {
      findings.push(
        blocker(CLASH_RULE, flow, `flow ${flow.id} gives the command file ${fileName}.md, the pipeline command's file`),
      );
      continue;
    }
    const owner = owners.get(fileName);
    if (owner === undefined) {
      owners.set(fileName, flow);
    } else {
      findings.push(
        blocker(CLASH_RULE, flow, `flow ${flow.id} gives the command file ${fileName}.md, the same as flow ${owner.id}`),
      );
    }
  }
  return findings;
}
