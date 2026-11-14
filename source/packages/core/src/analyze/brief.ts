import type { AnalysisFinding, ModuleSpec, ProjectConfig } from '../model.js';

/**
 * Findings on the project brief, in a fixed order: the required fields (blockers), the empty rule
 * lists and module list (warnings), then the module dependencies (blockers), each module in list
 * order and its `dependsOn` entries in their order. A blank value is one that is empty after trimming.
 * A module may depend only on a module in its own layer or a lower one; a dependency on a higher
 * layer is a blocker, and so is a dependency that names no module.
 */
export function briefFindings(config: ProjectConfig): AnalysisFinding[] {
  return [
    ...requiredFields(config),
    ...emptyWarnings(config),
    ...dependencyFindings(config.architecture.modules),
  ];
}

function requiredFields(config: ProjectConfig): AnalysisFinding[] {
  const fields: { subject: string; value: string }[] = [
    { subject: 'name', value: config.name },
    { subject: 'idea', value: config.idea },
    { subject: 'stack.language', value: config.stack.language },
  ];
  return fields
    .filter((field) => isBlank(field.value))
    .map((field): AnalysisFinding => ({
      severity: 'blocker',
      subject: field.subject,
      message: `${field.subject} is required`,
    }));
}

function emptyWarnings(config: ProjectConfig): AnalysisFinding[] {
  const checks: { subject: string; empty: boolean }[] = [
    { subject: 'codeRules', empty: config.codeRules.every(isBlank) },
    { subject: 'testRules', empty: config.testRules.every(isBlank) },
    { subject: 'architecture.modules', empty: config.architecture.modules.length === 0 },
  ];
  return checks
    .filter((check) => check.empty)
    .map((check): AnalysisFinding => ({
      severity: 'warning',
      subject: check.subject,
      message: `${check.subject} is empty`,
    }));
}

function dependencyFindings(modules: ModuleSpec[]): AnalysisFinding[] {
  return modules.flatMap((module) =>
    module.dependsOn.flatMap((dependency): AnalysisFinding[] => {
      const target = modules.find((candidate) => candidate.name === dependency);
      if (target === undefined) {
        return [
          {
            severity: 'blocker',
            subject: `module "${module.name}"`,
            message: `module "${module.name}" depends on unknown module "${dependency}"`,
          },
        ];
      }
      if (target.layer <= module.layer) {
        return [];
      }
      return [
        {
          severity: 'blocker',
          subject: `module "${module.name}"`,
          message: `module "${module.name}" (layer ${module.layer}) depends on "${dependency}" (layer ${target.layer}), a higher layer`,
        },
      ];
    }),
  );
}

function isBlank(value: string): boolean {
  return value.trim() === '';
}
