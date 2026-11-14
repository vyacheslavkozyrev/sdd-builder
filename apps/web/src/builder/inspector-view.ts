// Builder inspector read model: what the selected step shows in the inspector.
// Pure: no DOM, no storage, no network. Works the same for a catalog step and a custom step,
// since both are StepDefinition values.
import type { StepDefinition } from '@sddbuilder/core';

/** Shown in place of the file list when a step produces no file. */
export const NO_FILE_TEXT = 'no file generated';

/** What the inspector shows for one step. Empty lists are kept as lists; the text is for display. */
export interface StepInspector {
  /** Files the step produces, in the order of the definition. */
  files: string[];
  /** The files joined for display, or `NO_FILE_TEXT` when the step produces none. */
  producesText: string;
  /** Rule-set files attached to the step. Empty when the step has none. */
  ruleTags: string[];
}

/** The inspector read model of one step definition. */
export function stepInspector(step: StepDefinition): StepInspector {
  const files = [...step.produces];
  return {
    files,
    producesText: files.length === 0 ? NO_FILE_TEXT : files.join(', '),
    ruleTags: [...step.ruleTags],
  };
}
