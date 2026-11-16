// Builder state and the host contract. The builder keeps its configuration in memory for the page
// session only: no storage and no network call (F-06 AC-044). A host (the wizard, F-05) may pass an
// initial configuration; otherwise the builder starts from the default pipeline (F-06 AC-041). After
// each change the builder reports its current configuration to the host (F-06 AC-043).
import { pipeline } from '@sddbuilder/core';

type ProjectConfig = pipeline.ProjectConfig;

/** What the host gives the builder. Both fields are optional. */
export interface BuilderHost {
  /** The starting configuration. Absent, the builder starts from the default pipeline. */
  initial?: ProjectConfig;
  /** Called after each change with the current configuration. Not called for the starting state. */
  onChange?: (config: ProjectConfig) => void;
}

/** The builder's in-memory state. Every change goes through `replace`, which reports to the host. */
export interface BuilderState {
  /** The current configuration. */
  current(): ProjectConfig;
  /** Makes `next` the current configuration and reports it to the host. */
  replace(next: ProjectConfig): void;
}

/** Creates the builder state for one page session. */
export function createBuilderState(host: BuilderHost = {}): BuilderState {
  // A copy, so that edits to the state never reach the host's object or the shared default (AC-044).
  let config: ProjectConfig = structuredClone(host.initial ?? pipeline.defaultProjectConfig);
  return {
    current: () => config,
    replace(next) {
      config = next;
      host.onChange?.(config);
    },
  };
}
