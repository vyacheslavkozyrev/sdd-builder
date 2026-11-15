// F-04 AC-008: a retry (a back route on a Condition) with no round limit is one warning at the Condition's path. A back
// route with a round limit, and a forward route with no limit, give none. Covers a flow-level Condition and a pipeline-
// level gate that goes back to an earlier flow.
import { describe, expect, it } from 'vitest';
import { retryFindings } from '../src/pipeline/analyze/retries.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { analyzeStructure } from '../src/pipeline/index.js';
import type { ConditionBlock, FlowBlock, ProjectConfig } from '../src/pipeline/model.js';

/** A deep copy of the default pipeline, so the shared default is never changed. */
function copyDefault(): ProjectConfig {
  return structuredClone(defaultProjectConfig);
}

interface Located {
  path: string;
  block: ConditionBlock;
}

/** Every Condition of the pipeline with its path: the pipeline-level gates, then the Conditions of each child flow. */
function allConditions(config: ProjectConfig): Located[] {
  const found: Located[] = [];
  config.pipeline.blocks.forEach((block, index) => {
    if (block.kind === 'condition') found.push({ path: `pipeline.blocks[${index}]`, block });
    if (block.kind !== 'flow') return;
    block.blocks.forEach((child, at) => {
      if (child.kind === 'condition') found.push({ path: `pipeline.blocks[${index}].blocks[${at}]`, block: child });
    });
  });
  return found;
}

function conditionIn(config: ProjectConfig, id: string): Located {
  const found = allConditions(config).find((entry) => entry.block.id === id);
  if (found === undefined) throw new Error(`no condition ${id} in the default pipeline`);
  return found;
}

function flowIn(config: ProjectConfig, id: string): FlowBlock {
  const block = config.pipeline.blocks.find((candidate) => candidate.id === id);
  if (block?.kind !== 'flow') throw new Error(`${id} is not a flow`);
  return block;
}

/** Gives a round limit to every Condition that retries, so a case changes one thing at a time. */
function limitEveryRetry(config: ProjectConfig): void {
  for (const { block } of allConditions(config)) {
    if (block.passRoute.kind === 'back' || block.failRoute.kind === 'back') block.roundLimit = 3;
  }
}

/** The default pipeline's retries, as the subject paths of the warnings they should give. */
const DEFAULT_RETRY_PATHS = [
  'pipeline.blocks[3]',
  'pipeline.blocks[6]',
  'pipeline.blocks[9]',
  'pipeline.blocks[10].blocks[3]',
  'pipeline.blocks[10].blocks[5]',
  'pipeline.blocks[15]',
];

describe('F-04 AC-008: a retry with no round limit is one warning at the Condition path', () => {
  it('F-04 AC-008 gives one warning at a flow-level Condition that retries with no limit', () => {
    const config = copyDefault();
    limitEveryRetry(config);
    const target = conditionIn(config, 'build-review-gate');
    delete target.block.roundLimit;
    const found = retryFindings(config);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'warning', subject: target.path });
  });

  it('F-04 AC-008 gives one warning at a pipeline-level gate that goes back to an earlier flow with no limit', () => {
    const config = copyDefault();
    limitEveryRetry(config);
    const target = conditionIn(config, 'approve-plan');
    expect(target.path).toBe('pipeline.blocks[9]');
    delete target.block.roundLimit;
    const found = retryFindings(config);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ severity: 'warning', subject: 'pipeline.blocks[9]' });
  });

  it('F-04 AC-008 gives one warning when the pass route is the retry', () => {
    const config = copyDefault();
    limitEveryRetry(config);
    const target = conditionIn(config, 'approve-stories');
    target.block.passRoute = { kind: 'back', blockId: 'specify' };
    target.block.failRoute = { kind: 'next' };
    delete target.block.roundLimit;
    const found = retryFindings(config);
    expect(found).toHaveLength(1);
    expect(found[0]?.subject).toBe(target.path);
  });

  it('F-04 AC-008 names the target of the retry in the message', () => {
    const config = copyDefault();
    limitEveryRetry(config);
    const target = conditionIn(config, 'approve-plan');
    delete target.block.roundLimit;
    expect(retryFindings(config)[0]?.message).toContain('"plan"');
  });

  it('F-04 AC-008 gives the warning in the analysis with its path', () => {
    const config = copyDefault();
    limitEveryRetry(config);
    const target = conditionIn(config, 'build-checks');
    delete target.block.roundLimit;
    const warnings = analyzeStructure(config).filter((finding) => finding.severity === 'warning');
    expect(warnings.map((finding) => finding.subject)).toEqual([target.path]);
  });

  it('F-04 AC-008 the default pipeline gives one warning per retry, since its retries set no round limit', () => {
    const found = retryFindings(copyDefault());
    expect(found.map((finding) => finding.subject).sort()).toEqual([...DEFAULT_RETRY_PATHS].sort());
    expect(found.every((finding) => finding.severity === 'warning')).toBe(true);
  });
});

describe('F-04 AC-008 negative cases: no warning', () => {
  it('F-04 AC-008 a back route with a round limit gives none', () => {
    const config = copyDefault();
    limitEveryRetry(config);
    expect(retryFindings(config)).toEqual([]);
  });

  it('F-04 AC-008 a forward route with no round limit gives none', () => {
    const config = copyDefault();
    limitEveryRetry(config);
    const target = conditionIn(config, 'approve-stories');
    target.block.failRoute = { kind: 'next' };
    delete target.block.roundLimit;
    expect(retryFindings(config)).toEqual([]);
  });

  it('F-04 AC-008 a stop route with no round limit gives none', () => {
    const config = copyDefault();
    const target = conditionIn(config, 'build-diff-size');
    expect(target.block.failRoute).toEqual({ kind: 'stop' });
    expect(target.block.roundLimit).toBeUndefined();
    expect(retryFindings(config).map((finding) => finding.subject)).not.toContain(target.path);
  });

  it('F-04 AC-008 a switched-off Condition with a retry and no limit gives none', () => {
    const config = copyDefault();
    limitEveryRetry(config);
    const target = conditionIn(config, 'build-review-gate');
    target.block.enabled = false;
    delete target.block.roundLimit;
    expect(retryFindings(config)).toEqual([]);
  });

  it('F-04 AC-008 a retry inside a switched-off flow gives none', () => {
    const config = copyDefault();
    limitEveryRetry(config);
    flowIn(config, 'build').enabled = false;
    delete conditionIn(config, 'build-review-gate').block.roundLimit;
    expect(retryFindings(config)).toEqual([]);
  });

  it('F-04 AC-008 does not change the configuration it reads', () => {
    const config = copyDefault();
    const before = structuredClone(config);
    retryFindings(config);
    expect(config).toEqual(before);
  });
});
