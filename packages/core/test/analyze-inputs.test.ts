import { describe, expect, it } from 'vitest';
import {
  inputFindings,
  refusalFindings,
  type AnalysisFinding,
  type MapConnection,
  type ProjectConfig,
  type StepDefinition,
  type Workflow,
  type WorkflowStep,
} from '../src/index.js';
import { baseConfig, connection, workflow } from './fixtures.js';

const on = (stepId: string): WorkflowStep => ({ stepId, enabled: true });
const off = (stepId: string): WorkflowStep => ({ stepId, enabled: false });

function step(id: string, consumes: string[] = [], produces: string[] = []): StepDefinition {
  return { id, name: id, summary: id, kind: 'command', origin: 'custom', required: false, consumes, produces, ruleTags: [], body: `${id} body` };
}

const producer = step('producer', [], ['x']);
const consumer = step('consumer', ['x']);
const feeder = step('feeder', [], ['y']);
const needsXY = step('needs-xy', ['x', 'y']);
const plain = step('plain');
const featuresReader = step('features-reader', ['features.md']);
const planReader = step('plan-reader', ['plan.md']);

/** Every custom step the cases use. Their ids clash with no catalog id. */
const STEPS = [producer, consumer, feeder, needsXY, plain, featuresReader, planReader];

function flow(id: string, steps: WorkflowStep[], overrides: Partial<Workflow> = {}): Workflow {
  return workflow(id, { steps, ...overrides });
}

function configWith(workflows: Workflow[], connections: MapConnection[] = []): ProjectConfig {
  return baseConfig({ workflows, connections, customSteps: STEPS });
}

/** The finding AC-004 gives for an input nothing supplies. */
function unsatisfied(workflowId: string, stepId: string, input: string): AnalysisFinding {
  return {
    severity: 'warning',
    subject: `workflow "${workflowId}" step "${stepId}"`,
    message: `step "${stepId}" in workflow "${workflowId}" consumes "${input}" that no step produces and that is not the iteration source`,
  };
}

const rows: { name: string; config: ProjectConfig; expected: AnalysisFinding[] }[] = [
  {
    name: 'an input produced by an earlier enabled step of the same workflow gives none',
    config: configWith([flow('w', [on('producer'), on('consumer')])]),
    expected: [],
  },
  {
    name: 'an input produced only by a later step of the same workflow gives a warning',
    config: configWith([flow('w', [on('consumer'), on('producer')])]),
    expected: [unsatisfied('w', 'consumer', 'x')],
  },
  {
    name: 'an input produced in an upstream workflow connected to this one gives none',
    config: configWith([flow('a', [on('producer')]), flow('w', [on('consumer')])], [connection('a', 'w')]),
    expected: [],
  },
  {
    name: 'an input produced through a chain of upstream workflows gives none',
    config: configWith(
      [flow('a', [on('producer')]), flow('m', [on('plain')]), flow('w', [on('consumer')])],
      [connection('a', 'm'), connection('m', 'w')],
    ),
    expected: [],
  },
  {
    name: 'an input produced only in a workflow downstream of this one gives a warning',
    config: configWith([flow('a', [on('producer')]), flow('w', [on('consumer')])], [connection('w', 'a')]),
    expected: [unsatisfied('w', 'consumer', 'x')],
  },
  {
    name: 'an input produced in a workflow with no connection gives a warning',
    config: configWith([flow('a', [on('producer')]), flow('w', [on('consumer')])]),
    expected: [unsatisfied('w', 'consumer', 'x')],
  },
  {
    name: 'an input equal to the iteration source gives none',
    config: configWith([flow('w', [on('features-reader')], { iterationSource: 'features.md' })]),
    expected: [],
  },
  {
    name: 'an input that is not the iteration source and no step produces gives a warning',
    config: configWith([flow('w', [on('plan-reader')], { iterationSource: 'features.md' })]),
    expected: [unsatisfied('w', 'plan-reader', 'plan.md')],
  },
  {
    name: 'a disabled producing step does not satisfy an input',
    config: configWith([flow('w', [off('producer'), on('consumer')])]),
    expected: [unsatisfied('w', 'consumer', 'x')],
  },
  {
    name: 'a disabled producing step in an upstream workflow does not satisfy an input',
    config: configWith([flow('a', [off('producer')]), flow('w', [on('consumer')])], [connection('a', 'w')]),
    expected: [unsatisfied('w', 'consumer', 'x')],
  },
  {
    name: 'a producer in a disabled upstream workflow does not satisfy an input',
    config: configWith(
      [flow('a', [on('producer')], { enabled: false }), flow('w', [on('consumer')])],
      [connection('a', 'w')],
    ),
    expected: [unsatisfied('w', 'consumer', 'x')],
  },
  {
    name: 'a path through a disabled workflow does not carry a producer upstream',
    config: configWith(
      [flow('a', [on('producer')]), flow('m', [on('plain')], { enabled: false }), flow('w', [on('consumer')])],
      [connection('a', 'm'), connection('m', 'w')],
    ),
    expected: [unsatisfied('w', 'consumer', 'x')],
  },
  {
    name: 'a disabled step is not checked for its inputs',
    config: configWith([flow('w', [off('consumer')])]),
    expected: [],
  },
  {
    name: 'a disabled workflow is not checked for its inputs',
    config: configWith([flow('w', [on('consumer')], { enabled: false })]),
    expected: [],
  },
  {
    name: 'a step id with no definition is skipped, not reported here',
    config: configWith([flow('w', [on('ghost-step')])]),
    expected: [],
  },
  {
    name: 'a step listed twice with an unsatisfied input gives one warning for it',
    config: configWith([flow('w', [on('consumer'), on('consumer')])]),
    expected: [unsatisfied('w', 'consumer', 'x')],
  },
  {
    name: 'a step listed twice is satisfied when a later occurrence sees its input produced',
    config: configWith([flow('w', [on('consumer'), on('producer'), on('consumer')])]),
    expected: [],
  },
  {
    name: 'a cycle in connections ends and still checks what nothing supplies',
    config: configWith(
      [flow('a', [on('needs-xy')]), flow('b', [on('producer')])],
      [connection('b', 'a'), connection('a', 'b')],
    ),
    expected: [unsatisfied('a', 'needs-xy', 'y')],
  },
  {
    name: 'a cycle with no producer gives a warning for every input',
    config: configWith(
      [flow('a', [on('needs-xy')]), flow('b', [on('plain')])],
      [connection('a', 'b'), connection('b', 'a')],
    ),
    expected: [unsatisfied('a', 'needs-xy', 'x'), unsatisfied('a', 'needs-xy', 'y')],
  },
];

describe('F-04 T005 inputs', () => {
  it.each(rows)('F-04 AC-004 $name', ({ config, expected }) => {
    expect(inputFindings(config)).toEqual(expected);
  });

  it('F-04 AC-004 an unknown step id is skipped here and reported as a blocker by refusalFindings', () => {
    const config = configWith([flow('w', [on('ghost-step'), on('consumer')])]);
    expect(inputFindings(config)).toEqual([unsatisfied('w', 'consumer', 'x')]);
    expect(refusalFindings(config)).toContainEqual({
      severity: 'blocker',
      subject: 'workflow "w"',
      message: 'workflow "w": unknown step "ghost-step"',
    });
  });

  it('F-04 AC-004 gives the findings in workflow, step and consumes order, the same on every call', () => {
    const config = configWith([
      flow('w1', [on('needs-xy'), on('consumer')]),
      flow('w2', [on('consumer')]),
    ]);
    const first = inputFindings(config);
    expect(first).toEqual([
      unsatisfied('w1', 'needs-xy', 'x'),
      unsatisfied('w1', 'needs-xy', 'y'),
      unsatisfied('w1', 'consumer', 'x'),
      unsatisfied('w2', 'consumer', 'x'),
    ]);
    expect(inputFindings(config)).toEqual(first);
  });
});
