import { describe, expect, it } from 'vitest';
import {
  analysisError,
  analysisResult,
  configKey,
  isGreen,
  isOutOfDate,
  startAnalysis,
  type AnalysisFinding,
  type AnalysisResult,
  type AnalysisState,
} from '../src/analyze/analysisState.js';
import { buildProjectConfig } from '../src/analyze/config.js';
import { defaultPipelineValue, type WizardValues } from '../src/wizard/state.js';

function valuesWith(overrides: Partial<WizardValues>): WizardValues {
  return {
    name: 'Shop',
    idea: 'A shop for books.',
    stack: { language: 'TypeScript', framework: 'React', platform: 'Web', buildTool: 'Vite', testFramework: 'Vitest' },
    architecture: 'Layers: web, api, core.',
    rules: [{ id: '513d26bf-922f-546e-9d7f-5db6d267092c', name: 'Code Style', description: 'Use two spaces.' }],
    pipeline: defaultPipelineValue(),
    ...overrides,
  };
}

const KEY = configKey(buildProjectConfig(valuesWith({})));

function finding(severity: AnalysisFinding['severity'], subject = 'Subject'): AnalysisFinding {
  return { severity, subject, message: `${severity} message` };
}

function result(overrides: {
  findings?: AnalysisFinding[];
  status?: AnalysisResult['review']['status'];
  reviewFindings?: AnalysisFinding[];
}): AnalysisResult {
  return {
    findings: overrides.findings ?? [],
    review: {
      status: overrides.status ?? 'ok',
      findings: overrides.reviewFindings ?? [],
      dropped: 0,
    },
  };
}

function stateWith(analysis: AnalysisResult, key = KEY): AnalysisState {
  return analysisResult(key, analysis);
}

describe('F-13 AC-015 green only for a current, ok result with no blocker or warning', () => {
  const cases: Array<{ name: string; state: AnalysisState; green: boolean }> = [
    { name: 'a result with no findings and review ok is green', state: stateWith(result({})), green: true },
    {
      name: 'an info structural finding does not stop it',
      state: stateWith(result({ findings: [finding('info')] })),
      green: true,
    },
    {
      name: 'an info review finding does not stop it',
      state: stateWith(result({ reviewFindings: [finding('info')] })),
      green: true,
    },
    {
      name: 'a structural blocker stops it',
      state: stateWith(result({ findings: [finding('blocker')] })),
      green: false,
    },
    {
      name: 'a structural warning stops it',
      state: stateWith(result({ findings: [finding('warning')] })),
      green: false,
    },
    {
      name: 'a review warning stops it',
      state: stateWith(result({ reviewFindings: [finding('warning')] })),
      green: false,
    },
    {
      name: 'a review blocker stops it',
      state: stateWith(result({ reviewFindings: [finding('blocker')] })),
      green: false,
    },
    {
      name: 'a failed review is not green',
      state: stateWith(result({ status: 'failed' })),
      green: false,
    },
    {
      name: 'a skipped review is not green',
      state: stateWith(result({ status: 'skipped' })),
      green: false,
    },
    {
      name: 'an info finding beside a warning does not make it green',
      state: stateWith(result({ findings: [finding('info'), finding('warning')] })),
      green: false,
    },
    { name: 'not run is not green', state: { kind: 'not-run' }, green: false },
    { name: 'pending is not green', state: startAnalysis(KEY), green: false },
    { name: 'an error is not green', state: analysisError(KEY, 429, {}), green: false },
    {
      name: 'an error with a null status (network) is not green',
      state: analysisError(KEY, null, undefined),
      green: false,
    },
  ];

  it.each(cases)('$name', ({ state, green }) => {
    expect(isGreen(state, KEY)).toBe(green);
  });

  it('F-13 AC-015 a green result on another configuration is not green', () => {
    const otherKey = configKey(buildProjectConfig(valuesWith({ name: 'Other' })));
    expect(isGreen(stateWith(result({})), otherKey)).toBe(false);
  });
});

describe('F-13 AC-018 and AC-019 a changed configuration makes the analysis out of date', () => {
  it('F-13 AC-018 a changed brief field (name) gives a different key', () => {
    const changed = configKey(buildProjectConfig(valuesWith({ name: 'Shop 2' })));
    expect(changed).not.toBe(KEY);
  });

  it('F-13 AC-018 a changed idea, architecture, stack field and rule text give a different key', () => {
    const variants: WizardValues[] = [
      valuesWith({ idea: 'Another idea.' }),
      valuesWith({ architecture: 'One layer.' }),
      valuesWith({ stack: { ...valuesWith({}).stack, language: 'Go' } }),
      valuesWith({ rules: [{ id: '1fc47f47-2646-514e-8fc4-20b5863e8499', name: 'Code Style', description: 'Use four spaces.' }] }),
      valuesWith({ rules: [{ id: '64b490f1-f6e4-5f87-b9a5-b992ce687ee9', name: 'Naming', description: 'Use two spaces.' }] }),
    ];
    for (const values of variants) {
      expect(configKey(buildProjectConfig(values))).not.toBe(KEY);
    }
  });

  it('F-13 AC-019 a changed pipeline description, flow name or flow body gives a different key', () => {
    const pipeline = defaultPipelineValue();
    const [flow, ...otherFlows] = pipeline.flows;
    if (flow === undefined) throw new Error('the default pipeline has no flow');
    const variants = [
      { ...pipeline, description: `${pipeline.description} changed` },
      { ...pipeline, flows: [{ ...flow, name: `${flow.name} changed` }, ...otherFlows] },
      { ...pipeline, flows: [{ ...flow, body: `${flow.body} changed` }, ...otherFlows] },
    ];
    for (const variant of variants) {
      expect(configKey(buildProjectConfig(valuesWith({ pipeline: variant })))).not.toBe(KEY);
    }
  });

  it('F-13 AC-018 the same configuration gives the same key', () => {
    expect(configKey(buildProjectConfig(valuesWith({})))).toBe(KEY);
  });

  it('F-13 AC-018 a result on the old key is out of date and not green on the new key', () => {
    const newKey = configKey(buildProjectConfig(valuesWith({ name: 'Shop 2' })));
    const state = stateWith(result({}));
    expect(isOutOfDate(state, newKey)).toBe(true);
    expect(isGreen(state, newKey)).toBe(false);
  });

  it('F-13 AC-018 a result on the current key is not out of date', () => {
    expect(isOutOfDate(stateWith(result({})), KEY)).toBe(false);
  });

  it('F-13 AC-019 a pending or error state on an old key is out of date', () => {
    const newKey = `${KEY}!`;
    expect(isOutOfDate(startAnalysis(KEY), newKey)).toBe(true);
    expect(isOutOfDate(analysisError(KEY, 500, {}), newKey)).toBe(true);
  });

  it('F-13 AC-018 not run is not out of date', () => {
    expect(isOutOfDate({ kind: 'not-run' }, KEY)).toBe(false);
  });
});

describe('F-13 AC-014 a new analysis replaces the previous state', () => {
  it('F-13 AC-014 starting a run replaces a green result with a pending state', () => {
    const previous = stateWith(result({}));
    expect(isGreen(previous, KEY)).toBe(true);
    const next = startAnalysis(KEY);
    expect(next).toEqual({ kind: 'pending', key: KEY });
    expect(isGreen(next, KEY)).toBe(false);
  });

  it('F-13 AC-014 a finished run replaces the previous findings and status', () => {
    const previous = stateWith(result({ findings: [finding('blocker', 'Old')], status: 'failed' }));
    const next = analysisResult(KEY, result({ findings: [finding('info', 'New')] }));
    expect(next).toEqual({ kind: 'result', key: KEY, result: result({ findings: [finding('info', 'New')] }) });
    expect(previous).not.toEqual(next);
    expect(isGreen(next, KEY)).toBe(true);
  });

  it('F-13 AC-014 an error replaces a previous result', () => {
    const next = analysisError(KEY, 502, { error: 'bad gateway' });
    expect(next).toEqual({ kind: 'error', key: KEY, status: 502, body: { error: 'bad gateway' } });
  });

  it('F-13 AC-014 a run on a new configuration starts from its own key', () => {
    const newKey = `${KEY}!`;
    expect(startAnalysis(newKey)).toEqual({ kind: 'pending', key: newKey });
  });
});
