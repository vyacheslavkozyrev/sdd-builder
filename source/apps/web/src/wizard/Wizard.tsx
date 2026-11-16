// The wizard frame: the top bar, the stepper, the body of the current step and the footer. The state
// is owned by App and passed in; every move goes through the functions in state.ts (F-05 AC-001 to AC-005).
import type { pipeline } from '@sddbuilder/core';
import { PipelineBuilder } from '../builder/PipelineBuilder.js';
import { NameIdeaStep } from './NameIdeaStep.js';
import { StepPlaceholder } from './StepPlaceholder.js';
import type { NameIdeaValues } from './name-idea.js';
import { STEP_TITLES, backStep, nextStep } from './state.js';
import type { StepNumber, WizardState } from './state.js';
import { wizardFrameView } from './view.js';

type ProjectConfig = pipeline.ProjectConfig;

interface WizardProps {
  wizard: WizardState<NameIdeaValues>;
  onWizardChange: (wizard: WizardState<NameIdeaValues>) => void;
  /** The pipeline config, owned by App. Step 3 starts from it. */
  config: ProjectConfig;
  /** Called with each change the builder makes; App stores it. */
  onConfigChange: (config: ProjectConfig) => void;
}

const FOOTER_NOTE: Partial<Record<StepNumber, string>> = {
  1: 'Back is available from step 2.',
  3: 'Next always opens step 4. Pipeline problems are reported at Analyze.',
};

export function Wizard({ wizard, onWizardChange, config, onConfigChange }: WizardProps) {
  const { step, values } = wizard;
  const frame = wizardFrameView(wizard);
  const note = FOOTER_NOTE[step];

  return (
    <>
      <header className="wizard-bar">
        <span className="brand">SDDBuilder</span>
        <span className="muted">New project · Claude Code</span>
      </header>
      <main className="wizard">
        <ol className="stepper" aria-label="Wizard steps">
          {frame.stepper.map((item) => (
            <li
              key={item.step}
              className={`stepper-item stepper-${item.status}`}
              aria-current={item.status === 'current' ? 'step' : undefined}
            >
              <span className="stepper-mark">{item.status === 'done' ? '✓' : item.step}</span>
              <span className="stepper-title">{item.title}</span>
            </li>
          ))}
        </ol>
        <div className="wizard-card">
          <h1 className="wizard-title">{STEP_TITLES[step]}</h1>
          <p className="muted">Step {step} of 4.</p>
          {step === 1 && (
            <NameIdeaStep
              values={values}
              onChange={(next) => onWizardChange({ ...wizard, values: next })}
            />
          )}
          {step === 2 && <StepPlaceholder feature="F-21" />}
          <div hidden={step !== 3}>
            <PipelineBuilder initial={config} onChange={onConfigChange} />
          </div>
          {step === 4 && <StepPlaceholder feature="F-22" />}
        </div>
        <footer className="wizard-footer">
          <button
            type="button"
            disabled={!frame.footer.backEnabled}
            onClick={() => onWizardChange(backStep(wizard))}
          >
            Back
          </button>
          {note !== undefined && <span className="wizard-note">{note}</span>}
          {frame.footer.nextVisible && (
            <button
              type="button"
              className="wizard-next"
              onClick={() => onWizardChange(nextStep(wizard))}
            >
              Next
            </button>
          )}
        </footer>
      </main>
    </>
  );
}
