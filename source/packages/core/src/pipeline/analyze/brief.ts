import type { ProjectConfig } from '../model.js';
import type { Finding } from './finding.js';

// Brief checks (F-06 AC-001 to AC-004, AC-006). They read the brief of the config, not the pipeline, so they are kept
// apart from the structural rules: `analyzeStructure` does not see them (AC-005). A required brief field is a blocker
// when it is absent or blank; an optional stack field and the rules list are warnings. A blank value holds only
// whitespace (spaces, tabs, line breaks). The findings come in a fixed order: name, idea, stack.language, the four
// optional stack fields, rules.

function isBlank(text: string | undefined): boolean {
  return text === undefined || !/\S/.test(text);
}

function requiredBlocker(rule: string, path: string): Finding {
  return { severity: 'blocker', rule, path, message: 'must not be blank' };
}

function optionalWarning(rule: string, path: string): Finding {
  return { severity: 'warning', rule, path, message: 'is blank; the generated project will not use it' };
}

// The optional stack fields, in the order the findings list them, with the rule id of each warning.
const OPTIONAL_STACK_FIELDS = [
  ['framework', 'brief-stack-framework'],
  ['platform', 'brief-stack-platform'],
  ['buildTool', 'brief-stack-build-tool'],
  ['testFramework', 'brief-stack-test-framework'],
] as const;

export function analyzeBrief(config: ProjectConfig): Finding[] {
  const findings: Finding[] = [];

  if (isBlank(config.name)) findings.push(requiredBlocker('brief-name', 'name'));
  if (isBlank(config.idea)) findings.push(requiredBlocker('brief-idea', 'idea'));
  if (isBlank(config.stack?.language)) findings.push(requiredBlocker('brief-stack-language', 'stack.language'));

  for (const [field, rule] of OPTIONAL_STACK_FIELDS) {
    if (isBlank(config.stack?.[field])) {
      findings.push(optionalWarning(rule, `stack.${field}`));
    }
  }

  if (config.rules.length === 0) {
    findings.push({
      severity: 'warning',
      rule: 'brief-rules',
      path: 'rules',
      message: 'has no rules; the generated project will have no code rules',
    });
  }

  return findings;
}
