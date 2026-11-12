import type { AnalysisFinding, ProjectConfig } from '../model.js';

/**
 * A warning for each custom step (origin `custom`) that no step entry places in an enabled workflow,
 * in custom step list order. A placement counts only when the workflow is enabled and the entry is
 * enabled. An id clash with a catalog or workflow id is reported by `refusalFindings` as a blocker;
 * this check does not look at ids, so a clashing step placed nowhere also gets the warning.
 */
export function customStepFindings(config: ProjectConfig): AnalysisFinding[] {
  const placed = new Set(
    config.workflows
      .filter((workflow) => workflow.enabled)
      .flatMap((workflow) => workflow.steps.filter((entry) => entry.enabled).map((entry) => entry.stepId)),
  );
  return config.customSteps
    .filter((step) => step.origin === 'custom' && !placed.has(step.id))
    .map(
      (step): AnalysisFinding => ({
        severity: 'warning',
        subject: `custom step "${step.id}"`,
        message: `custom step "${step.id}" is not placed in any enabled workflow`,
      }),
    );
}
