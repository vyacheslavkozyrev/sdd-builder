import { defaultPipelineValue, type WizardValues } from '../src/wizard/state.js';

// The values with a name and an idea set and the step 2 entries empty. The pipeline is the default one (F-11),
// not the empty pipeline a new project starts with (F-16 AC-019).
export function valuesWith(name: string, idea: string): WizardValues {
  return {
    name,
    idea,
    stack: { language: '', framework: '', platform: '', buildTool: '', testFramework: '' },
    architecture: '',
    rules: [],
    pipeline: defaultPipelineValue(),
  };
}
