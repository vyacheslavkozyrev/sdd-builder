import type { ProjectConfig } from '../model.js';
import { DEFAULT_STEP_CATALOG } from '../catalog.js';

/**
 * Ids are one namespace: a workflow, a catalog step and a custom step must
 * not share an id. A catalog step used in several workflows is one definition,
 * so references inside workflows are not checked here.
 */
export function checkDuplicateIds(config: ProjectConfig): string[] {
  const definitions: { id: string; kind: string }[] = [
    ...config.workflows.map((w) => ({ id: w.id, kind: 'workflow' })),
    ...DEFAULT_STEP_CATALOG.map((s) => ({ id: s.id, kind: 'catalog step' })),
    ...config.customSteps.map((s) => ({ id: s.id, kind: 'custom step' })),
  ];

  const byId = new Map<string, string[]>();
  for (const definition of definitions) {
    byId.set(definition.id, [...(byId.get(definition.id) ?? []), definition.kind]);
  }

  const problems: string[] = [];
  for (const [id, kinds] of byId) {
    if (kinds.length > 1) {
      problems.push(`duplicate id "${id}": defined as ${kinds.join(' and ')}`);
    }
  }
  return problems;
}
