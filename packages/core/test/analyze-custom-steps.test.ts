import { describe, expect, it } from 'vitest';
import {
  customStepFindings,
  type AnalysisFinding,
  type ProjectConfig,
  type StepDefinition,
  type Workflow,
} from '../src/index.js';
import { baseConfig, workflow } from './fixtures.js';

function customStep(id: string): StepDefinition {
  return {
    id,
    name: id,
    summary: `${id} summary`,
    kind: 'command',
    origin: 'custom',
    required: false,
    consumes: [],
    produces: [],
    ruleTags: [],
    body: `Body of ${id}.`,
  };
}

/** A configuration with the given custom steps and workflows. The defaults are replaced, not kept. */
function configWith(customSteps: StepDefinition[], workflows: Workflow[]): ProjectConfig {
  return baseConfig({ customSteps, workflows });
}

const warning = (id: string): AnalysisFinding => ({
  severity: 'warning',
  subject: `custom step "${id}"`,
  message: `custom step "${id}" is not placed in any enabled workflow`,
});

describe('F-04 AC-011 custom steps placed in no enabled workflow', () => {
  const rows: { name: string; config: ProjectConfig; expected: AnalysisFinding[] }[] = [
    {
      name: 'a custom step placed in an enabled workflow gives no finding',
      config: configWith(
        [customStep('lint')],
        [workflow('build', { steps: [{ stepId: 'lint', enabled: true }] })],
      ),
      expected: [],
    },
    {
      name: 'a custom step placed only in a disabled workflow gives a warning',
      config: configWith(
        [customStep('lint')],
        [
          workflow('build', { steps: [{ stepId: 'release', enabled: true }] }),
          workflow('audit', { enabled: false, steps: [{ stepId: 'lint', enabled: true }] }),
        ],
      ),
      expected: [warning('lint')],
    },
    {
      name: 'a custom step whose only entry is disabled gives a warning',
      config: configWith(
        [customStep('lint')],
        [workflow('build', { steps: [{ stepId: 'lint', enabled: false }] })],
      ),
      expected: [warning('lint')],
    },
    {
      name: 'a custom step placed in no workflow gives a warning',
      config: configWith([customStep('lint')], [workflow('build')]),
      expected: [warning('lint')],
    },
    {
      name: 'several custom steps give findings in list order',
      config: configWith(
        [customStep('zeta'), customStep('alpha'), customStep('mid')],
        [workflow('build', { steps: [{ stepId: 'alpha', enabled: true }] })],
      ),
      expected: [warning('zeta'), warning('mid')],
    },
    {
      name: 'a catalog step is never checked here, even when placed nowhere',
      config: configWith(
        [{ ...customStep('verify'), origin: 'catalog', required: true }],
        [workflow('build', { steps: [] })],
      ),
      expected: [],
    },
    {
      name: 'a custom step whose id clashes with a catalog id and is placed nowhere gives the placement warning',
      config: configWith([customStep('verify')], [workflow('build', { steps: [] })]),
      expected: [warning('verify')],
    },
    {
      name: 'a custom step placed in one enabled workflow and one disabled workflow gives no finding',
      config: configWith(
        [customStep('lint')],
        [
          workflow('build', { steps: [{ stepId: 'lint', enabled: true }] }),
          workflow('audit', { enabled: false, steps: [{ stepId: 'lint', enabled: true }] }),
        ],
      ),
      expected: [],
    },
  ];

  it.each(rows)('$name', ({ config, expected }) => {
    expect(customStepFindings(config)).toEqual(expected);
  });
});
