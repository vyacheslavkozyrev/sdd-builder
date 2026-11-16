import { useState } from 'react';
import { pipeline } from '@sddbuilder/core';
import type { NameIdeaValues } from './wizard/name-idea.js';
import { Wizard } from './wizard/Wizard.js';
import { startWizard } from './wizard/state.js';
import type { WizardState } from './wizard/state.js';

type ProjectConfig = pipeline.ProjectConfig;

/**
 * The page: the project wizard. The wizard state and the pipeline config live in React memory only,
 * so nothing is stored in the browser and a reload starts at step 1 with every field empty
 * (F-05 AC-006). The pipeline config is kept here, not in the step, so the pipeline survives moving
 * between steps and step 4 can read it (F-05 AC-004, AC-011). The builder reports every change here.
 */
export function App() {
  const [wizard, setWizard] = useState<WizardState<NameIdeaValues>>(() =>
    startWizard<NameIdeaValues>({ name: '', idea: '' }),
  );
  const [config, setConfig] = useState<ProjectConfig>(() => pipeline.defaultProjectConfig);
  return (
    <Wizard
      wizard={wizard}
      onWizardChange={setWizard}
      config={config}
      onConfigChange={setConfig}
    />
  );
}
