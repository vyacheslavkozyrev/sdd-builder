import { childPath, ROOT_PATH } from '../check/primitives.js';
import { flowFileName } from '../generate/flow-file.js';
import { ruleFileName } from '../generate/rule-file.js';
import type { Flow, ProjectConfig } from '../model.js';
import type { Position, PositionedFinding } from './finding.js';

// The command file of each flow takes its name (F-16, AC-014, AC-015). A flow name with no letter or digit gives an empty
// file name, and two flows whose names give the same file name would write one file twice; both are blockers at the flow's
// name. A blank name is already refused by the flow-name rule (F-03 AC-028), so it is not reported twice here. The file
// name `pipeline` is the pipeline command's own file, so a flow with that name is refused too.
// The rule file of each rule takes its title's name (F-16, AC-029). Two rules whose titles give the same file name would write
// one file twice, so the later one is a blocker at its title. A title with no letter or digit gives an empty file name, which
// is a blocker at its title too (the same rule as a flow name, AC-014). The rule's id is not used for the name.

const FLOWS_PATH = childPath(childPath(ROOT_PATH, 'pipeline'), 'flows');
const RULES_PATH = childPath(ROOT_PATH, 'rules');
const PIPELINE_FILE_NAME = 'pipeline';
const NAME_RULE = 'command-file-name';
const CLASH_RULE = 'command-file-clash';
const RULE_NAME_RULE = 'rule-file-name';
const RULE_CLASH_RULE = 'rule-file-clash';
const PIPELINE_POSITION: Position = { flow: -1, block: -1, slot: -1 };

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

// The rule files of the project (AC-029). A rule's finding sits at its title, and it is pipeline-level, like the rule ids.
export function ruleFileRule(config: ProjectConfig): PositionedFinding[] {
  const findings: PositionedFinding[] = [];
  const owners = new Map<string, string>();

  for (const rule of config.rules) {
    const fileName = ruleFileName(rule);
    const titlePath = childPath(childPath(RULES_PATH, String(rule.index)), 'title');
    const owner = owners.get(fileName);
    if (fileName === '') {
      findings.push({
        severity: 'blocker',
        rule: RULE_NAME_RULE,
        path: titlePath,
        message: `rule "${rule.title}" gives no rule file name: its title must have a letter or digit`,
        position: PIPELINE_POSITION,
      });
    } else if (owner === undefined) {
      owners.set(fileName, rule.title);
    } else {
      findings.push({
        severity: 'blocker',
        rule: RULE_CLASH_RULE,
        path: titlePath,
        message: `rule "${rule.title}" gives the rule file ${fileName}.md, the same as rule "${owner}"`,
        position: PIPELINE_POSITION,
      });
    }
  }
  return findings;
}
