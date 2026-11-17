// The brief checks (architecture.md §6 decision 37). They are kept apart from the structural rules: a
// pipeline without a brief gets no brief blocker from `analyzeStructure`, which does not read the brief.

import type { ProjectConfig } from '../model.js';
import type { Finding } from './finding.js';

// A value is blank when it is absent, empty, or only spaces or line breaks.
function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim() === '';
}

// Returns the brief findings of the config, in the order: name, idea, stack.language, the four optional
// stack fields, rules. Pure: the config is not changed.
export function analyzeBrief(config: ProjectConfig): Finding[] {
  const findings: Finding[] = [];
  const stack = config.stack;

  if (isBlank(config.name)) {
    findings.push({ severity: 'blocker', path: 'name', message: 'The project needs a name.' });
  }
  if (isBlank(config.idea)) {
    findings.push({ severity: 'blocker', path: 'idea', message: 'The project needs an idea.' });
  }
  if (isBlank(stack?.language)) {
    findings.push({
      severity: 'blocker',
      path: 'stack.language',
      message: 'The project needs a language.',
    });
  }

  const optional: [string, string | undefined][] = [
    ['framework', stack?.framework],
    ['platform', stack?.platform],
    ['buildTool', stack?.buildTool],
    ['testFramework', stack?.testFramework],
  ];
  for (const [field, value] of optional) {
    if (isBlank(value)) {
      findings.push({
        severity: 'warning',
        path: `stack.${field}`,
        message: `The stack has no ${field}.`,
      });
    }
  }

  if (config.rules.length === 0) {
    findings.push({
      severity: 'warning',
      path: 'rules',
      message: 'The project has no rules.',
    });
  }

  return findings;
}
