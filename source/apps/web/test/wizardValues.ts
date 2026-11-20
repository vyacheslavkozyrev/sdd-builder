import type { WizardValues } from '../src/wizard/state.js';

// The values with a name and an idea set and the step 2 entries empty. With '' and '' it is the empty values.
export function valuesWith(name: string, idea: string): WizardValues {
  return {
    name,
    idea,
    stack: { language: '', framework: '', platform: '', buildTool: '', testFramework: '' },
    architecture: '',
    rules: [],
  };
}
