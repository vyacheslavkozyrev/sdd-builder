import { DEFAULT_CONNECTIONS, DEFAULT_WORKFLOWS } from '@sddbuilder/core';
import type { ModuleSpec, ProjectConfig, TechStack } from '@sddbuilder/core';
import type { BriefModuleRow, BriefState } from './state.js';

/**
 * The result of building a configuration. A layer that is not a whole number of 0 or more
 * is not guessed: the build reports the list positions of those rows, and the field
 * validation (F-05 AC-010) turns them into problems at each module's layer path.
 */
export type ConfigBuild =
  | { ok: true; config: ProjectConfig }
  | { ok: false; badLayers: number[] };

/**
 * Parses a layer typed in the form. Accepts only digits, so `3` and `03` are 3, while `-1`,
 * `1.5`, `1e2`, a blank text, `+1` and a number beyond the safe integer range give `null`.
 */
export function parseLayer(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

/** Builds the stack. A blank optional field is left out, so its key is absent. */
function buildStack(stack: BriefState['stack']): TechStack {
  const built: TechStack = { language: stack.language.trim() };
  const framework = stack.framework.trim();
  if (framework !== '') {
    built.framework = framework;
  }
  const testFramework = stack.testFramework.trim();
  if (testFramework !== '') {
    built.testFramework = testFramework;
  }
  const buildTool = stack.buildTool.trim();
  if (buildTool !== '') {
    built.buildTool = buildTool;
  }
  return built;
}

function buildModule(row: BriefModuleRow, layer: number): ModuleSpec {
  return {
    name: row.name.trim(),
    layer,
    responsibility: row.responsibility.trim(),
    // Placeholder: F-05 T004 splits depends-on into module names.
    dependsOn: [],
  };
}

/**
 * Builds the configuration the API receives. Workflows and connections are deep copies of the
 * core defaults, so the shared constants are never mutated. Modules keep their list order.
 */
export function toProjectConfig(brief: BriefState): ConfigBuild {
  const modules: ModuleSpec[] = [];
  const badLayers: number[] = [];
  brief.architecture.modules.forEach((row, position) => {
    const layer = parseLayer(row.layer);
    if (layer === null) {
      badLayers.push(position);
    } else {
      modules.push(buildModule(row, layer));
    }
  });
  if (badLayers.length > 0) {
    return { ok: false, badLayers };
  }
  return {
    ok: true,
    config: {
      schemaVersion: 1,
      name: brief.name.trim(),
      idea: brief.idea.trim(),
      stack: buildStack(brief.stack),
      architecture: {
        style: brief.architecture.style.trim(),
        modules,
      },
      // Placeholders: F-05 T004 drops blank rules and fills these lists.
      codeRules: [],
      testRules: [],
      customSteps: [],
      workflows: DEFAULT_WORKFLOWS.map((workflow) => structuredClone(workflow)),
      connections: DEFAULT_CONNECTIONS.map((connection) => structuredClone(connection)),
      targets: ['claude'],
    },
  };
}
