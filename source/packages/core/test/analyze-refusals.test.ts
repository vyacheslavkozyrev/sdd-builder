import { describe, expect, it } from 'vitest';
import {
  generate,
  InvalidConfigError,
  refusalFindings,
  validateConfig,
  type AnalysisFinding,
  type Condition,
  type ProjectConfig,
} from '../src/index.js';
import { baseConfig, connection, withDefaults, workflow } from './fixtures.js';
import { fullTemplates } from './fixtures-templates.js';

const gate = (id: string, type: Condition['gate']['type'] = 'checks') => ({ id, type, required: false });

/** A workflow 'w' with steps release, verify, commit and one condition c1 after verify. */
function withCondition(condition: Record<string, unknown>): ProjectConfig {
  const w = workflow('w', {
    steps: [
      { stepId: 'release', enabled: true },
      { stepId: 'verify', enabled: true },
      { stepId: 'commit', enabled: true },
    ],
    conditions: [
      { id: 'c1', enabled: true, afterStepId: 'verify', gate: gate('c1'), pass: { kind: 'next' }, fail: { kind: 'stop' }, ...condition } as unknown as Condition,
    ],
  });
  return baseConfig({ workflows: withDefaults([w]), connections: [] });
}

function withoutStep(workflowId: string, stepId: string): ProjectConfig {
  const base = baseConfig();
  return {
    ...base,
    workflows: base.workflows.map((w) => (w.id === workflowId ? { ...w, steps: w.steps.filter((s) => s.stepId !== stepId) } : w)),
  };
}

/** The problems generate() reports when it refuses a configuration. */
function refusedProblems(config: ProjectConfig): readonly string[] {
  try {
    generate(config, fullTemplates());
  } catch (error) {
    if (error instanceof InvalidConfigError) {
      return error.problems;
    }
    throw error;
  }
  throw new Error('expected generate() to refuse the configuration');
}

const customStep = (id: string) => ({
  id,
  name: id,
  summary: '',
  kind: 'script' as const,
  origin: 'custom' as const,
  required: false,
  consumes: [],
  produces: [],
  ruleTags: [],
  body: '',
});

/** A map cycle a -> b -> a: its problem has no quoted label. */
const cycleConfig = baseConfig({
  workflows: withDefaults([workflow('a'), workflow('b')]),
  connections: [connection('a', 'b'), connection('b', 'a')],
});

/** Each refused configuration with the subjects its findings must carry, in order. */
const refused: { name: string; config: ProjectConfig; subjects: string[] }[] = [
  {
    name: 'a duplicate id',
    config: baseConfig({ customSteps: [customStep('verify')] }),
    subjects: ['duplicate id "verify"'],
  },
  {
    name: 'a connection to an unknown workflow',
    config: baseConfig({ connections: [connection('specify', 'nowhere')] }),
    subjects: ['connection "specify-nowhere"'],
  },
  {
    name: 'a map cycle',
    config: cycleConfig,
    subjects: ['configuration'],
  },
  {
    name: 'an unwired fail output',
    config: withCondition({ fail: undefined }),
    subjects: ['condition "c1"'],
  },
  {
    name: 'an unknown gate type',
    config: withCondition({ gate: gate('c1', 'bogus' as Condition['gate']['type']) }),
    subjects: ['condition "c1"'],
  },
  {
    name: 'an invalid round limit',
    config: withCondition({ roundLimit: 0 }),
    subjects: ['condition "c1"'],
  },
  {
    name: 'a missing required step',
    config: withoutStep('implement-cycle', 'commit'),
    subjects: ['workflow "implement-cycle"'],
  },
  {
    name: 'a route to a disabled step',
    config: baseConfig({
      workflows: withDefaults([
        workflow('w', {
          steps: [
            { stepId: 'release', enabled: false },
            { stepId: 'verify', enabled: true },
            { stepId: 'commit', enabled: true },
          ],
          conditions: [{ id: 'c1', enabled: true, afterStepId: 'verify', gate: gate('c1'), pass: { kind: 'next' }, fail: { kind: 'step', stepId: 'release' } }],
        }),
      ]),
      connections: [],
    }),
    subjects: ['condition "c1"'],
  },
  {
    name: 'an id that holds a quote and a colon',
    config: baseConfig({ workflows: withDefaults([workflow('x"y:z', { steps: [{ stepId: 'nope', enabled: true }] })]) }),
    subjects: ['workflow "x"y:z"'],
  },
  {
    name: 'several problems at once',
    config: baseConfig({ customSteps: [customStep('verify')], connections: [connection('specify', 'nowhere')] }),
    subjects: ['duplicate id "verify"', 'connection "specify-nowhere"'],
  },
];

describe('F-04 T003 refusals as blockers', () => {
  it.each(refused)('F-04 AC-001 $name gives one blocker per problem, in validateConfig order', ({ config, subjects }) => {
    const findings = refusalFindings(config);
    const problems = validateConfig(config);

    expect(problems.length).toBeGreaterThan(0);
    expect(findings.map((f) => f.message)).toEqual(problems);
    expect(findings.map((f) => f.subject)).toEqual(subjects);
    expect(findings.every((f) => f.severity === 'blocker')).toBe(true);
  });

  it.each(refused)('F-04 AC-001 $name matches the problems generate() refuses with', ({ config }) => {
    expect(refusalFindings(config).map((f) => f.message)).toEqual([...refusedProblems(config)]);
  });

  it('F-04 AC-001 a problem with no quoted label gets the subject configuration', () => {
    expect(refusalFindings(cycleConfig)).toEqual([{ severity: 'blocker', subject: 'configuration', message: 'map cycle: a -> b -> a' }]);
  });

  it.each(refused)('F-04 AC-001 $name has a non-empty subject and message on every finding', ({ config }) => {
    const findings: AnalysisFinding[] = refusalFindings(config);

    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
      expect(finding.subject.trim()).not.toBe('');
      expect(finding.message.trim()).not.toBe('');
    }
  });
});

const validConfigs: { name: string; config: ProjectConfig }[] = [
  { name: 'the default configuration', config: baseConfig() },
  {
    name: 'a valid retry to an earlier step',
    config: withCondition({ fail: { kind: 'step', stepId: 'release' } }),
  },
];

describe('F-04 T003 refusals for a valid configuration', () => {
  it.each(validConfigs)('F-04 AC-002 $name gives no refusal findings', ({ config }) => {
    expect(validateConfig(config)).toEqual([]);
    expect(refusalFindings(config)).toEqual([]);
  });
});
