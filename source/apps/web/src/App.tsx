import { useReducer } from 'react';
import { AppFrame } from './layout/AppFrame.js';
import { Wizard } from './wizard/Wizard.js';
import { initialWizardState, wizardReducer } from './wizard/state.js';

// The application root (F-07 AC-008, F-08 AC-008, AC-012).
// Holds the wizard state in memory and renders the wizard inside the frame.
// New project restarts the wizard; Prev and Next move it one step. The project
// step's name and idea reach the reducer through the update action (F-09 AC-013, AC-014).

export function App() {
  const [state, dispatch] = useReducer(wizardReducer, undefined, initialWizardState);
  return (
    <AppFrame onNewProject={() => dispatch({ type: 'restart' })}>
      <Wizard
        step={state.step}
        values={state.values}
        onUpdate={(patch) => dispatch({ type: 'update', patch })}
        onPrev={() => dispatch({ type: 'prev' })}
        onNext={() => dispatch({ type: 'next' })}
      />
    </AppFrame>
  );
}
