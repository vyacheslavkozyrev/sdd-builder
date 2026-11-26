import { describe, expect, it } from 'vitest';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { parseProjectConfig } from '../../src/pipeline/parse/index.js';
import { problemsOf } from './problems-of.js';

// The whole config through the entry: the typed result, every problem with its path, and the
// unknown and wrong-typed keys at each level. Documents are copies of the default pipeline, so
// each test changes one thing and nothing else.

type Doc = Record<string, unknown>;

function cloneDefault(): Doc {
  return structuredClone(defaultPipeline) as Doc;
}

function rootWith(pipeline: Doc, extra: Doc = {}): Doc {
  return { schemaVersion: 2, rules: [], pipeline, ...extra };
}

function flowDoc(pipeline: Doc, index: number): Doc {
  return (pipeline.flows as Doc[])[index] as Doc;
}

function blockDoc(flow: Doc, index: number): Doc {
  return (flow.blocks as Doc[])[index] as Doc;
}

// The flow and block index of the first Condition block of the default pipeline.
function conditionPosition(pipeline: Doc): { flow: number; block: number } {
  const flows = pipeline.flows as Doc[];
  for (const [flow, flowRecord] of flows.entries()) {
    const block = (flowRecord.blocks as Doc[]).findIndex((candidate) => candidate.kind === 'condition');
    if (block >= 0) return { flow, block };
  }
  throw new Error('the default pipeline has no condition block');
}

describe('F-02 AC-001 a valid config is returned typed with no problems', () => {
  it('returns the typed config of a valid document', () => {
    const result = parseProjectConfig({
      schemaVersion: 2,
      name: 'Shop',
      rules: [{ id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Style', text: 'Keep it short.' }],
      pipeline: defaultPipeline,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.schemaVersion).toBe(2);
    expect(result.config.name).toBe('Shop');
    expect(result.config.rules).toEqual([{ index: 0, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Style', text: 'Keep it short.' }]);
    expect(result.config.pipeline.flows).toHaveLength(6);
    expect(result).not.toHaveProperty('problems');
  });

  it('returns every brief field the document gives, typed', () => {
    const result = parseProjectConfig(
      rootWith(cloneDefault(), {
        name: 'Shop',
        idea: 'A shop for handmade goods.',
        architecture: 'Three layers.',
        stack: { language: 'TypeScript', framework: 'React' },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config).toMatchObject({
      schemaVersion: 2,
      name: 'Shop',
      idea: 'A shop for handmade goods.',
      architecture: 'Three layers.',
      stack: { language: 'TypeScript', framework: 'React' },
      rules: [],
      pipeline: { name: cloneDefault().name, flows: expect.any(Array) },
    });
  });

  it('returns no brief field the document did not give', () => {
    const result = parseProjectConfig(rootWith(cloneDefault()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config).not.toHaveProperty('name');
    expect(result.config).not.toHaveProperty('stack');
  });
});

describe('F-02 AC-005 every problem is returned, in document order, each with its own path', () => {
  it('returns three problems for three independent errors in three places', () => {
    const input = {
      schemaVersion: 2,
      rules: [{ id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 3, text: 'Keep it short.' }],
      pipeline: { ...cloneDefault(), name: 3 },
      zeta: 1,
    };
    expect(problemsOf(input)).toEqual([
      { path: 'rules.0.title', message: expect.stringContaining('must be text') },
      { path: 'pipeline.name', message: expect.stringContaining('must be text') },
      { path: 'zeta', message: 'is not a known key' },
    ]);
  });

  it('runs the cross-checks on the rules and pipeline that parsed', () => {
    const input = rootWith(cloneDefault(), {
      rules: [
        { id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Style', text: 'Keep it short.' },
        { id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Again', text: 'Keep it short.' },
      ],
    });
    expect(problemsOf(input)).toEqual([
      { path: 'rules.1.id', message: 'must be unique: the id 8f99cc27-78ab-5895-8637-5c13d7429593 is already used at rules.0.id' },
    ]);
  });

  it('lists the cross-check problems grouped by check, in the fixed check order', () => {
    const pipeline = cloneDefault();
    pipeline.ruleTags = ['71b2ecbc-b1ec-5b8f-b792-a30a35989a2e'];
    flowDoc(pipeline, 0).next = 'a5767084-cb93-5669-9a85-49c86b4893f6';
    const input = rootWith(pipeline, {
      rules: [
        { id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Style', text: 'Keep it short.' },
        { id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Again', text: 'Keep it short.' },
      ],
    });
    expect(problemsOf(input)).toEqual([
      { path: 'rules.1.id', message: 'must be unique: the id 8f99cc27-78ab-5895-8637-5c13d7429593 is already used at rules.0.id' },
      { path: 'pipeline.ruleTags.0', message: 'must name a rule of this project, got 71b2ecbc-b1ec-5b8f-b792-a30a35989a2e' },
      { path: 'pipeline.flows.0.next', message: 'must name a flow of this pipeline, got a5767084-cb93-5669-9a85-49c86b4893f6' },
    ]);
  });

  it('skips the cross-checks when the pipeline did not parse', () => {
    const pipeline = cloneDefault();
    pipeline.ruleTags = ['71b2ecbc-b1ec-5b8f-b792-a30a35989a2e'];
    pipeline.name = 3;
    expect(problemsOf(rootWith(pipeline))).toEqual([
      { path: 'pipeline.name', message: expect.stringContaining('must be text') },
    ]);
  });
});

describe('F-02 AC-005 a refused item does not cause a spurious problem on its neighbours', () => {
  it('reports only the refused flow when a flow that another flow names is refused', () => {
    const pipeline = cloneDefault();
    flowDoc(pipeline, 1).name = 3; // the flow `ux`, named by `specify`
    expect(problemsOf(rootWith(pipeline))).toEqual([
      { path: 'pipeline.flows.1.name', message: expect.stringContaining('must be text') },
    ]);
  });

  it('reports only the refused flow when the last flow, named by `verify`, is refused', () => {
    const pipeline = cloneDefault();
    flowDoc(pipeline, 5).name = 3;
    expect(problemsOf(rootWith(pipeline))).toEqual([
      { path: 'pipeline.flows.5.name', message: expect.stringContaining('must be text') },
    ]);
  });

  it('reports only the refused agent when a block that names it is still in the flow', () => {
    const pipeline = cloneDefault();
    blockDoc(flowDoc(pipeline, 0), 1).name = 3; // `specify-agent`, named by `specify-start`
    expect(problemsOf(rootWith(pipeline))).toEqual([
      { path: 'pipeline.flows.0.blocks.1.name', message: expect.stringContaining('must be a file-safe name') },
    ]);
  });

  it('reports only the refused artifact when an End names it', () => {
    const pipeline = cloneDefault();
    ((flowDoc(pipeline, 0).artifacts as Doc[])[0] as Doc).template = 3; // `stories.md`, named by `specify-end`
    expect(problemsOf(rootWith(pipeline))).toEqual([
      { path: 'pipeline.flows.0.artifacts.0.template', message: expect.stringContaining('must be text') },
    ]);
  });

  it('reports only the refused rule when a tag names it', () => {
    const pipeline = cloneDefault();
    pipeline.ruleTags = ['8f99cc27-78ab-5895-8637-5c13d7429593'];
    expect(problemsOf(rootWith(pipeline, { rules: [{ id: '8f99cc27-78ab-5895-8637-5c13d7429593' }] }))).toEqual([
      { path: 'rules.0', message: 'is missing the key title' },
      { path: 'rules.0', message: 'is missing the key text' },
    ]);
  });

  it('skips the link checks while a flow is refused, and reports the dangling link once it is fixed', () => {
    const pipeline = cloneDefault();
    flowDoc(pipeline, 1).name = 3;
    flowDoc(pipeline, 2).next = 'a5767084-cb93-5669-9a85-49c86b4893f6';
    expect(problemsOf(rootWith(pipeline))).toEqual([
      { path: 'pipeline.flows.1.name', message: expect.stringContaining('must be text') },
    ]);

    flowDoc(pipeline, 1).name = 'UX';
    expect(problemsOf(rootWith(pipeline))).toEqual([
      { path: 'pipeline.flows.2.next', message: 'must name a flow of this pipeline, got a5767084-cb93-5669-9a85-49c86b4893f6' },
    ]);
  });

  it('reports a cross-check at the document index of its flow, not its position in the parsed list', () => {
    const pipeline = cloneDefault();
    flowDoc(pipeline, 0).name = 3;
    flowDoc(pipeline, 2).ruleTags = ['4eb0807b-84e6-54ea-b7f4-e73845fddbfa'];
    expect(problemsOf(rootWith(pipeline))).toEqual([
      { path: 'pipeline.flows.0.name', message: expect.stringContaining('must be text') },
      { path: 'pipeline.flows.2.ruleTags.0', message: 'must name a rule of this project, got 4eb0807b-84e6-54ea-b7f4-e73845fddbfa' },
    ]);
  });
});

describe('F-02 AC-006 a result is either the typed config or a non-empty problem list, never both', () => {
  it.each([
    [
      'a config with an unknown root key',
      rootWith(cloneDefault(), { zeta: 1 }),
      [{ path: 'zeta', message: 'is not a known key' }],
    ],
    [
      'a config with a rule that is refused',
      rootWith(cloneDefault(), { rules: [{ id: '8f99cc27-78ab-5895-8637-5c13d7429593' }] }),
      [
        { path: 'rules.0', message: 'is missing the key title' },
        { path: 'rules.0', message: 'is missing the key text' },
      ],
    ],
    [
      'a config with a wrong schemaVersion',
      { ...rootWith(cloneDefault()), schemaVersion: 1 },
      [{ path: 'schemaVersion', message: 'must be the number 2, got a number' }],
    ],
  ])('returns only problems for %s', (_label, input, expected) => {
    const result = parseProjectConfig(input);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('config');
    expect(problemsOf(input)).toEqual(expected);
  });

  it('returns only the config for a valid document, with no problem list', () => {
    const result = parseProjectConfig(rootWith(cloneDefault()));
    expect(result.ok).toBe(true);
    expect(result).not.toHaveProperty('problems');
  });

  it.each([
    ['null', null],
    ['text', 'pipeline'],
    ['a list', []],
    ['an empty object', {}],
    ['only the version', { schemaVersion: 2 }],
    ['wrong types at the root', { schemaVersion: 2, rules: 'none', pipeline: 3 }],
    ['a pipeline with no flows', rootWith({ ...cloneDefault(), flows: [] })],
  ])('returns a non-empty problem list and does not throw for %s', (_label, input) => {
    const result = parseProjectConfig(input);
    expect(result.ok).toBe(false);
    expect(problemsOf(input).length).toBeGreaterThan(0);
  });
});

describe('F-02 AC-007 an unknown key is refused at every level, with the path of that key', () => {
  const levels: ReadonlyArray<readonly [string, () => { input: unknown; path: string }]> = [
    ['the root', () => ({ input: rootWith(cloneDefault(), { zeta: 1 }), path: 'zeta' })],
    [
      'a rule',
      () => ({
        input: rootWith(cloneDefault(), { rules: [{ id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Style', text: 'Text.', zeta: 1 }] }),
        path: 'rules.0',
      }),
    ],
    [
      'the pipeline',
      () => {
        const pipeline = cloneDefault();
        pipeline.zeta = 1;
        return { input: rootWith(pipeline), path: 'pipeline.zeta' };
      },
    ],
    [
      'an argument',
      () => {
        const pipeline = cloneDefault();
        ((pipeline.arguments as Doc[])[0] as Doc).zeta = 1;
        return { input: rootWith(pipeline), path: 'pipeline.arguments.0' };
      },
    ],
    [
      'a flow',
      () => {
        const pipeline = cloneDefault();
        flowDoc(pipeline, 0).zeta = 1;
        return { input: rootWith(pipeline), path: 'pipeline.flows.0.zeta' };
      },
    ],
    [
      'an artifact',
      () => {
        const pipeline = cloneDefault();
        ((flowDoc(pipeline, 0).artifacts as Doc[])[0] as Doc).zeta = 1;
        return { input: rootWith(pipeline), path: 'pipeline.flows.0.artifacts.0.zeta' };
      },
    ],
    [
      'a block',
      () => {
        const pipeline = cloneDefault();
        blockDoc(flowDoc(pipeline, 0), 0).zeta = 1;
        return { input: rootWith(pipeline), path: 'pipeline.flows.0.blocks.0.zeta' };
      },
    ],
    [
      'a route',
      () => {
        const pipeline = cloneDefault();
        const { flow, block } = conditionPosition(pipeline);
        (blockDoc(flowDoc(pipeline, flow), block).true as Doc).zeta = 1;
        return { input: rootWith(pipeline), path: `pipeline.flows.${flow}.blocks.${block}.true.zeta` };
      },
    ],
    [
      'the stack',
      () => ({ input: rootWith(cloneDefault(), { stack: { language: 'TypeScript', zeta: 1 } }), path: 'stack.zeta' }),
    ],
  ];

  it.each(levels)('refuses an unknown key on %s with a problem at its path', (_label, build) => {
    const { input, path } = build();
    expect(problemsOf(input)).toEqual([expect.objectContaining({ path })]);
  });
});

describe('F-02 AC-008 a key from a retired model is refused as unknown, at its path', () => {
  const retired: ReadonlyArray<readonly [string, () => { input: unknown; path: string }]> = [
    [
      'connectedTo on a flow',
      () => {
        const pipeline = cloneDefault();
        flowDoc(pipeline, 0).connectedTo = ['ux'];
        return { input: rootWith(pipeline), path: 'pipeline.flows.0.connectedTo' };
      },
    ],
    [
      'checks on a flow',
      () => {
        const pipeline = cloneDefault();
        flowDoc(pipeline, 0).checks = [];
        return { input: rootWith(pipeline), path: 'pipeline.flows.0.checks' };
      },
    ],
    [
      'enabled on a block',
      () => {
        const pipeline = cloneDefault();
        blockDoc(flowDoc(pipeline, 0), 0).enabled = true;
        return { input: rootWith(pipeline), path: 'pipeline.flows.0.blocks.0.enabled' };
      },
    ],
    [
      'disabled on a block',
      () => {
        const pipeline = cloneDefault();
        blockDoc(flowDoc(pipeline, 0), 0).disabled = false;
        return { input: rootWith(pipeline), path: 'pipeline.flows.0.blocks.0.disabled' };
      },
    ],
    [
      'gate on a route',
      () => {
        const pipeline = cloneDefault();
        const { flow, block } = conditionPosition(pipeline);
        (blockDoc(flowDoc(pipeline, flow), block).true as Doc).gate = 'check';
        return { input: rootWith(pipeline), path: `pipeline.flows.${flow}.blocks.${block}.true.gate` };
      },
    ],
    [
      'label on a route of a block',
      () => {
        const pipeline = cloneDefault();
        const { flow, block } = conditionPosition(pipeline);
        (blockDoc(flowDoc(pipeline, flow), block).false as Doc).label = 'Retry';
        return { input: rootWith(pipeline), path: `pipeline.flows.${flow}.blocks.${block}.false.label` };
      },
    ],
  ];

  it.each(retired)('refuses %s with a problem at its path', (_label, build) => {
    const { input, path } = build();
    expect(problemsOf(input)).toEqual([expect.objectContaining({ path })]);
  });
});

describe('F-02 AC-009 a value of the wrong JSON type is refused at its path', () => {
  const wrongTypes: ReadonlyArray<readonly [string, () => { input: unknown; path: string }]> = [
    [
      'a string where a boolean is required (approval)',
      () => {
        const pipeline = cloneDefault();
        flowDoc(pipeline, 0).approval = 'yes';
        return { input: rootWith(pipeline), path: 'pipeline.flows.0.approval' };
      },
    ],
    [
      'an object where a list is required (arguments)',
      () => {
        const pipeline = cloneDefault();
        flowDoc(pipeline, 0).arguments = {};
        return { input: rootWith(pipeline), path: 'pipeline.flows.0.arguments' };
      },
    ],
    [
      'a number where text is required (name)',
      () => {
        const pipeline = cloneDefault();
        flowDoc(pipeline, 0).name = 3;
        return { input: rootWith(pipeline), path: 'pipeline.flows.0.name' };
      },
    ],
    [
      'null for an optional key (next)',
      () => {
        const pipeline = cloneDefault();
        flowDoc(pipeline, 0).next = null;
        return { input: rootWith(pipeline), path: 'pipeline.flows.0.next' };
      },
    ],
  ];

  it.each(wrongTypes)('refuses %s with a problem at its path', (_label, build) => {
    const { input, path } = build();
    expect(problemsOf(input)).toEqual([expect.objectContaining({ path })]);
  });
});

describe('F-02 AC-085 the same value gives the same result and the input is not changed', () => {
  it('gives the same result twice for a valid document and leaves the document as it was', () => {
    const input = rootWith(cloneDefault());
    const before = structuredClone(input);
    expect(parseProjectConfig(input)).toEqual(parseProjectConfig(input));
    expect(input).toEqual(before);
  });

  it('gives the same problems twice for an invalid document and leaves the document as it was', () => {
    const input = rootWith(cloneDefault(), { zeta: 1, rules: [{ id: '8f99cc27-78ab-5895-8637-5c13d7429593' }] });
    const before = structuredClone(input);
    expect(parseProjectConfig(input)).toEqual(parseProjectConfig(input));
    expect(input).toEqual(before);
  });
});
