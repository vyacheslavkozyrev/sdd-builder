import { useReducer } from 'react';
import { AppFrame } from './layout/AppFrame.js';
import { Wizard } from './wizard/Wizard.js';
import { initialWizardState, wizardReducer } from './wizard/state.js';

// The application root (F-07 AC-008, F-08 AC-008, AC-012).
// Holds the wizard state in memory and renders the wizard inside the frame.
// New project restarts the wizard; Prev and Next move it one step. The project
// step's name and idea reach the reducer through the update action (F-09 AC-013, AC-014).
// The step 2 values and the rule blocks reach it through the same kind of actions (F-10 AC-008, AC-020, AC-021).
// The pipeline of step 3 reaches it through the update action, and New project restores the default (F-11 AC-040 to AC-042).

export function App() {
  const [state, dispatch] = useReducer(wizardReducer, undefined, initialWizardState);
  return (
    <AppFrame onNewProject={() => dispatch({ type: 'restart' })}>
      <Wizard
        step={state.step}
        values={state.values}
        onUpdate={(patch) => dispatch({ type: 'update', patch })}
        onAddRule={() => dispatch({ type: 'add-rule' })}
        onRemoveRule={(index) => dispatch({ type: 'remove-rule', index })}
        onUpdateRule={(index, patch) => dispatch({ type: 'update-rule', index, patch })}
        onPrev={() => dispatch({ type: 'prev' })}
        onNext={() => dispatch({ type: 'next' })}
      />
    </AppFrame>
  );
}
