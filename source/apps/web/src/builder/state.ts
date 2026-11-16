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

/**
 * The host's configuration, held through the parser (AC-039). A configuration the parser accepts is held as the parser
 * returns it. A refused one is held as given: the wizard hands back a configuration the builder reached by edits, and
 * such a state carries marks that say why it is not complete (`marks.ts`). Either way the state holds a copy (AC-044).
 */
function heldConfig(initial: ProjectConfig): ProjectConfig {
  const parsed = pipeline.parsePipelineConfig(structuredClone(initial));
  return parsed.ok ? parsed.config : structuredClone(initial);
}

/** Creates the builder state for one page session. */
export function createBuilderState(host: BuilderHost = {}): BuilderState {
  // A copy, so that edits to the state never reach the host's object or the shared default (AC-044).
  let config: ProjectConfig =
    host.initial === undefined ? structuredClone(pipeline.defaultProjectConfig) : heldConfig(host.initial);
  return {
    current: () => config,
    replace(next) {
      config = next;
      host.onChange?.(config);
    },
  };
}
