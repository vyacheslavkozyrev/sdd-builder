import { AnalyzeStep } from '../analyze/AnalyzeStep.js';
import { loadGenerationTemplates } from '../analyze/templates.js';
import type { Pipeline } from '../builder/model.js';
import { PipelineStep } from './PipelineStep.js';
import { ProjectStep } from './ProjectStep.js';
import type { RuleActions } from './RuleList.js';
import type { StepNumber } from './steps.js';
import { TechnicalStep } from './TechnicalStep.js';
import type { ProjectValuesPatch, WizardValues } from './state.js';

// The body of the current wizard step, below the stepper and the buttons. Step 1 shows the project
// step (F-09 AC-012) and step 2 the technical details step (F-10 AC-021). Step 3 is the Workflow step,
// the pipeline builder (F-11). Step 4 is the analyze and generate step (F-13 AC-020, AC-030). Its state
// is held by the step and is lost when the user leaves it.

const TEMPLATES = loadGenerationTemplates();

export interface StepBodyProps {
  readonly step: StepNumber;
  readonly values: WizardValues;
  readonly onChange: (patch: ProjectValuesPatch) => void;
  readonly ruleActions: RuleActions;
  readonly onPipelineChange: (pipeline: Pipeline) => void;
}

export function StepBody({ step, values, onChange, ruleActions, onPipelineChange }: StepBodyProps) {
  if (step === 1) {
    return <ProjectStep values={values} onChange={onChange} />;
  }
  if (step === 2) {
    return <TechnicalStep values={values} onChange={onChange} ruleActions={ruleActions} />;
  }
  if (step === 3) {
    return <PipelineStep values={values} onPipelineChange={onPipelineChange} />;
  }
  return <AnalyzeStep values={values} templates={TEMPLATES} />;
}
