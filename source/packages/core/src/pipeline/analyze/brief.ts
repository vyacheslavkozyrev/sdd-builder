// Brief findings of the pipeline model (F-04 AC-010, AC-011, AC-012). A required brief field (`name`, `idea`,
// `stack.language`) that is blank after trimming is a blocker at its field name. An optional stack field that is
// present but blank is a warning at `stack.<field>`; an absent one gives no finding. An empty `rules` list is a warning
// at `rules`. Pure: no I/O.
import type { AnalysisFinding } from '../../model.js';
import type { ProjectConfig, ProjectStack } from '../model.js';

const OPTIONAL_STACK_FIELDS: (keyof Omit<ProjectStack, 'language'>)[] = [
  'framework',
  'platform',
  'buildTool',
  'testFramework',
];

/** True when a value is empty after trimming. Spaces only count as blank. */
function isBlank(value: string): boolean {
  return value.trim() === '';
}

/** Every brief finding of the configuration, in a fixed order: required fields, optional stack fields, then rules. */
export function briefFindings(config: ProjectConfig): AnalysisFinding[] {
  return [...requiredFindings(config), ...optionalStackFindings(config.stack), ...rulesFindings(config)];
}

function requiredFindings(config: ProjectConfig): AnalysisFinding[] {
  const required: { subject: string; value: string }[] = [
    { subject: 'name', value: config.name },
    { subject: 'idea', value: config.idea },
    { subject: 'stack.language', value: config.stack.language },
  ];
  return required
    .filter((field) => isBlank(field.value))
    .map((field): AnalysisFinding => ({
      severity: 'blocker',
      subject: field.subject,
      message: `${field.subject} is required`,
    }));
}

function optionalStackFindings(stack: ProjectStack): AnalysisFinding[] {
  return OPTIONAL_STACK_FIELDS.flatMap((field): AnalysisFinding[] => {
    const value = stack[field];
    if (value === undefined || !isBlank(value)) return [];
    return [
      {
        severity: 'warning',
        subject: `stack.${field}`,
        message: `stack.${field} is blank`,
      },
    ];
  });
}

function rulesFindings(config: ProjectConfig): AnalysisFinding[] {
  if (config.rules.length > 0) return [];
  return [{ severity: 'warning', subject: 'rules', message: 'rules is empty' }];
}
