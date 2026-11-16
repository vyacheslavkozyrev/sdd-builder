import { useState } from 'react';
import { startState } from './builder/map-state.js';
import type { MapState } from './builder/map-state.js';
import type { NameIdeaValues } from './wizard/name-idea.js';
import { Wizard } from './wizard/Wizard.js';
import { startWizard } from './wizard/state.js';
import type { WizardState } from './wizard/state.js';

/**
 * The page: the project wizard. The wizard state and the builder map live in React memory only, so
 * nothing is stored in the browser and a reload starts at step 1 with every field empty (F-05 AC-006).
 * The map is kept here, not in the step, so the pipeline survives moving between steps (F-05 AC-004).
 */
export function App() {
  const [wizard, setWizard] = useState<WizardState<NameIdeaValues>>(() =>
    startWizard<NameIdeaValues>({ name: '', idea: '' }),
  );
  const [map, setMap] = useState<MapState>(startState);
  return <Wizard wizard={wizard} onWizardChange={setWizard} map={map} onMapChange={setMap} />;
}
