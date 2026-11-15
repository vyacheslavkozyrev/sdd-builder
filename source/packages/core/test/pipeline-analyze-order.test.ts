// F-04 AC-002 and AC-003: the analysis is stable. The same configuration gives the same findings in the same order, and the
// analysis leaves the configuration equal before and after. Findings are sorted by severity (blocker, then warning, then
// info), then by subject, then by message. Subjects that are block or flow paths compare by numeric path order (Amendment
// 5); other text compares in code-unit order. Ties on severity and subject are ordered by message.
// Each case starts from a settled configuration (no findings), so a case asserts only what it changes. No check emits an
// `info` finding yet, so the `info` rank is not reachable through `analyzeStructure`.
import { describe, expect, it } from 'vitest';
import type { AnalysisFinding } from '../src/model.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { analyzeStructure } from '../src/pipeline/index.js';
import type { ProjectConfig, Route } from '../src/pipeline/model.js';

/** A deep copy of the default pipeline with a complete brief and a round limit on every retry, so it has no findings. */
function settled(): ProjectConfig {
  const config = structuredClone(defaultProjectConfig);
  config.name = 'Example project';
  config.idea = 'A tool that does one thing';
  config.stack = { language: 'TypeScript' };
  config.rules = [{ id: 'style', title: 'Style', text: 'Keep it simple.' }];
  for (const block of config.pipeline.blocks) {
    if (block.kind === 'condition') limitRetry(block);
    if (block.kind !== 'flow') continue;
    for (const child of block.blocks) if (child.kind === 'condition') limitRetry(child);
  }
  return config;
}

/** Gives a retrying Condition a round limit. A Condition that goes forward or stops is left alone. */
function limitRetry(condition: { passRoute: Route; failRoute: Route; roundLimit?: number }): void {
  if (condition.passRoute.kind === 'back' || condition.failRoute.kind === 'back') condition.roundLimit = 3;
}

/** The Condition with this id, at the pipeline level or in a child flow. */
function conditionNamed(config: ProjectConfig, id: string): { passRoute: Route; failRoute: Route; roundLimit?: number } {
  for (const block of config.pipeline.blocks) {
    if (block.kind === 'condition' && block.id === id) return block;
    if (block.kind !== 'flow') continue;
    for (const child of block.blocks) if (child.kind === 'condition' && child.id === id) return child;
  }
  throw new Error(`no condition ${id} in the default pipeline`);
}

/** One line per finding, in the order the analysis gives: severity, subject and message. */
function lines(findings: readonly AnalysisFinding[]): string[] {
  return findings.map((finding) => `${finding.severity} ${finding.subject} ${finding.message}`);
}

interface OrderCase {
  name: string;
  change: (config: ProjectConfig) => void;
  /** Keeps only the findings at this subject, for a case whose other findings are not the point. */
  subject?: string;
  expected: string[];
}

const ORDER_CASES: OrderCase[] = [
  {
    name: 'a blocker comes before a warning, even when the warning sorts first by subject',
    change: (config) => {
      config.stack.language = '';
      config.rules = [];
    },
    expected: ['blocker stack.language stack.language is required', 'warning rules rules is empty'],
  },
  {
    name: 'blockers are in subject order',
    change: (config) => {
      config.name = '';
      config.idea = '  ';
      config.stack.language = '';
    },
    expected: [
      'blocker idea idea is required',
      'blocker name name is required',
      'blocker stack.language stack.language is required',
    ],
  },
  {
    name: 'warnings are in subject order, and a blank optional field sorts by its own name',
    change: (config) => {
      config.rules = [];
      config.stack.platform = ' ';
      config.stack.framework = '';
    },
    expected: [
      'warning rules rules is empty',
      'warning stack.framework stack.framework is blank',
      'warning stack.platform stack.platform is blank',
    ],
  },
  {
    name: 'a blocker and a warning on the same subject: the blocker first, then the messages in code-unit order',
    // Both routes name no flow, so the gate gives two blockers; the flows behind it are then unreachable, which is
    // left out by the subject filter.
    change: (config) => {
      const gate = conditionNamed(config, 'approve-stories');
      gate.passRoute = { kind: 'back', blockId: 'alpha' };
      gate.failRoute = { kind: 'back', blockId: 'Zeta' };
      delete gate.roundLimit;
    },
    subject: 'pipeline.blocks[3]',
    expected: [
      'blocker pipeline.blocks[3] back route to "Zeta" is not a flow of the pipeline',
      'blocker pipeline.blocks[3] back route to "alpha" is not a flow of the pipeline',
      'warning pipeline.blocks[3] condition "approve-stories" retries to "alpha" and "Zeta" with no round limit',
    ],
  },
];

describe('F-04 AC-003 findings are ordered by severity, then subject, then message', () => {
  it('F-04 AC-003 has no findings on the settled configuration the table starts from', () => {
    expect(analyzeStructure(settled())).toEqual([]);
  });

  it('F-04 AC-003 orders block path subjects by number, so blocks[3] comes before blocks[10].blocks[3]', () => {
    // Code-unit order would put "pipeline.blocks[10]" first, since "1" sorts before "3". Both are warnings.
    const config = settled();
    delete conditionNamed(config, 'approve-stories').roundLimit;
    delete conditionNamed(config, 'build-review-gate').roundLimit;
    expect(lines(analyzeStructure(config))).toEqual([
      'warning pipeline.blocks[3] condition "approve-stories" retries to "specify" with no round limit',
      'warning pipeline.blocks[10].blocks[3] condition "build-review-gate" retries to "build-implement" with no round limit',
    ]);
  });

  it.each(ORDER_CASES)('F-04 AC-003 orders findings: $name', ({ change, subject, expected }) => {
    const config = settled();
    change(config);
    const findings = analyzeStructure(config).filter((finding) => subject === undefined || finding.subject === subject);
    expect(lines(findings)).toEqual(expected);
  });
});

describe('F-04 AC-002 the same configuration gives the same findings in the same order', () => {
  /** A configuration with several findings of both severities, so the order is tested. */
  function mixed(): ProjectConfig {
    const config = settled();
    config.name = '';
    config.rules = [];
    const gate = conditionNamed(config, 'approve-stories');
    gate.passRoute = { kind: 'back', blockId: 'alpha' };
    gate.failRoute = { kind: 'back', blockId: 'Zeta' };
    delete gate.roundLimit;
    return config;
  }

  it('F-04 AC-002 gives the same list, in the same order, on every call', () => {
    const config = mixed();
    const first = analyzeStructure(config);
    expect(first.length).toBeGreaterThan(1);
    expect(analyzeStructure(config)).toEqual(first);
  });

  it('F-04 AC-002 gives the same list for an equal copy of the configuration', () => {
    const config = mixed();
    expect(analyzeStructure(structuredClone(config))).toEqual(analyzeStructure(config));
  });

  it('F-04 AC-002 leaves the configuration equal before and after the analysis', () => {
    const config = mixed();
    const before = structuredClone(config);
    analyzeStructure(config);
    expect(config).toEqual(before);
  });

  it('F-04 AC-002 leaves the shared default pipeline equal before and after the analysis', () => {
    const before = structuredClone(defaultProjectConfig);
    analyzeStructure(defaultProjectConfig);
    expect(defaultProjectConfig).toEqual(before);
  });
});
