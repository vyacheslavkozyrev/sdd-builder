import type { ModuleSpec, ProjectConfig, TechStack } from '@sddbuilder/core';
import type { MapState } from '../builder/map-state.js';
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

/**
 * Splits a comma-separated depends-on text into module names, in order. Each name is trimmed
 * and blanks are dropped; duplicates are kept. A name that matches no module is kept too, so
 * `/analyze` reports it (F-05 AC-011).
 */
export function splitDependsOn(text: string): string[] {
  return text
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name !== '');
}

/** Trims each rule and drops the blank ones, keeping the order (F-05 AC-012). */
export function buildRules(rules: readonly string[]): string[] {
  return rules.map((rule) => rule.trim()).filter((rule) => rule !== '');
}

function buildModule(row: BriefModuleRow, layer: number): ModuleSpec {
  return {
    name: row.name.trim(),
    layer,
    responsibility: row.responsibility.trim(),
    dependsOn: splitDependsOn(row.dependsOn),
  };
}

/**
 * Builds the configuration the API receives. Workflows and connections are deep copies of the
 * builder's map state (F-06 AC-002), so the state is never shared with the configuration.
 * Modules keep their list order.
 */
export function toProjectConfig(brief: BriefState, map: MapState): ConfigBuild {
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
      codeRules: buildRules(brief.codeRules),
      testRules: buildRules(brief.testRules),
      customSteps: [],
      workflows: map.workflows.map((workflow) => structuredClone(workflow)),
      connections: map.connections.map((connection) => structuredClone(connection)),
      targets: ['claude'],
    },
  };
}
