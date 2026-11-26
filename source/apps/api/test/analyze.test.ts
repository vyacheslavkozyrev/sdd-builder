import { pipeline } from '@sddbuilder/core';
import { describe, expect, it } from 'vitest';
import { analyzePipeline, type ReviewModel } from '../src/analyze.js';
import type { ReviewRequest } from '../src/review/prompt.js';
import { withSubjects } from './subject.js';

const pipelineFixture: pipeline.Pipeline = {
  name: 'SDD',
  description: 'The process',
  arguments: [],
  flows: [],
};

// A config with a blank name and idea, so the brief checks give blockers and the empty flows give structural findings.
function configFixture(): pipeline.ProjectConfig {
  return {
    schemaVersion: 2,
    name: ' ',
    idea: '',
    architecture: 'A small web app',
    stack: { language: 'TypeScript', framework: 'React' },
    rules: [],
    pipeline: pipelineFixture,
  };
}

// A fake model: it records each call and answers with a fixed reply, or throws when asked to.
function fakeModel(answer: { text?: string; stopReason?: string | null; throws?: string }) {
  const calls: ReviewRequest[] = [];
  const model: ReviewModel = {
    review: async (request) => {
      calls.push(request);
      if (answer.throws !== undefined) throw new Error(answer.throws);
      const stopReason = answer.stopReason === undefined ? 'end_turn' : answer.stopReason;
      return { text: answer.text ?? '[]', stopReason };
    },
  };
  return { model, calls };
}

const validEntry = { severity: 'warning', subject: 'idea', message: 'The idea is vague.' };

// The findings the analysis returns for a config: the structural ones, then the brief ones, each with its subject.
function analysisFindings(config: pipeline.ProjectConfig) {
  return withSubjects([...pipeline.analyzeStructure(config), ...pipeline.analyzeBrief(config)]);
}

describe('F-06 analysis result', () => {
  it('F-06 AC-019 the result has the findings and a review with status, findings and dropped', async () => {
    const { model } = fakeModel({ text: JSON.stringify([validEntry]) });
    const result = await analyzePipeline(configFixture(), model, () => {});

    expect(Object.keys(result).sort()).toEqual(['findings', 'review']);
    expect(Object.keys(result.review).sort()).toEqual(['dropped', 'findings', 'status']);
    expect(result.review).toEqual({ status: 'ok', findings: [validEntry], dropped: 0 });
  });

  it('F-06 AC-023 the structural findings are the analyzeStructure output, then the brief findings', async () => {
    const config = configFixture();
    const { model } = fakeModel({});
    const result = await analyzePipeline(config, model, () => {});

    const structural = withSubjects(pipeline.analyzeStructure(config));
    const brief = withSubjects(pipeline.analyzeBrief(config));
    expect(result.findings).toEqual([...structural, ...brief]);
    expect(result.findings.slice(0, structural.length)).toEqual(structural);
    expect(result.findings.length).toBeGreaterThan(structural.length);
  });
});

describe('F-06 review failure keeps the findings', () => {
  it('F-06 AC-010 with no model the review is failed and the findings are still returned', async () => {
    const result = await analyzePipeline(configFixture(), null, () => {});

    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
    expect(result.findings).toEqual(analysisFindings(configFixture()));
  });

  it('F-06 AC-020 a model call that throws gives a failed review and the findings in full', async () => {
    const config = configFixture();
    const { model } = fakeModel({ throws: 'network down' });
    const result = await analyzePipeline(config, model, () => {});

    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
    expect(result.findings).toEqual(analysisFindings(config));
  });

  it('F-06 AC-020 the error text of a thrown model call reaches neither the result nor the log', async () => {
    const { model } = fakeModel({ throws: 'secret brief text in error' });
    const lines: string[] = [];
    const result = await analyzePipeline(configFixture(), model, (line) => lines.push(line));

    expect(JSON.stringify(result)).not.toContain('secret brief text in error');
    expect(lines.join('\n')).not.toContain('secret brief text in error');
    expect(lines.join('\n')).toContain('route=/analyze event=review-threw status=failed');
  });

  it('F-06 AC-013 a reply stopped at max_tokens gives a failed review, and the reply is not parsed', async () => {
    const { model } = fakeModel({ text: JSON.stringify([validEntry]), stopReason: 'max_tokens' });
    const result = await analyzePipeline(configFixture(), model, () => {});

    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
  });

  it('F-06 AC-020 a reply that is not JSON gives a failed review and the findings in full', async () => {
    const config = configFixture();
    const { model } = fakeModel({ text: 'Here is my review: none' });
    const result = await analyzePipeline(config, model, () => {});

    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
    expect(result.findings).toEqual(analysisFindings(config));
  });

  it('F-06 AC-020 a reply that is JSON but not an array gives a failed review', async () => {
    const { model } = fakeModel({ text: JSON.stringify({ severity: 'warning' }) });
    const result = await analyzePipeline(configFixture(), model, () => {});

    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
  });

  it('F-06 AC-018 a failed review has dropped 0', async () => {
    const { model } = fakeModel({ text: '[{"severity":"warning"}]', stopReason: 'max_tokens' });
    const result = await analyzePipeline(configFixture(), model, () => {});

    expect(result.review.status).toBe('failed');
    expect(result.review.dropped).toBe(0);
  });
});

describe('F-06 valid review replies', () => {
  it('F-06 AC-021 a valid reply with entries gives status ok and keeps the entries', async () => {
    const { model } = fakeModel({ text: JSON.stringify([validEntry]) });
    const result = await analyzePipeline(configFixture(), model, () => {});

    expect(result.review).toEqual({ status: 'ok', findings: [validEntry], dropped: 0 });
  });

  it('F-06 AC-021 a valid empty reply gives status ok with no entries', async () => {
    const { model } = fakeModel({ text: '[]' });
    const result = await analyzePipeline(configFixture(), model, () => {});

    expect(result.review).toEqual({ status: 'ok', findings: [], dropped: 0 });
  });

  it('F-06 AC-021 a valid reply whose every entry is dropped gives status ok with the count', async () => {
    const { model } = fakeModel({ text: JSON.stringify([{ severity: 'error', subject: 'x', message: 'y' }, 3]) });
    const result = await analyzePipeline(configFixture(), model, () => {});

    expect(result.review).toEqual({ status: 'ok', findings: [], dropped: 2 });
  });
});

describe('F-16 AC-017 every finding in the reply has a subject', () => {
  it('F-16 AC-017 each structural and brief finding has severity, subject, message, rule and path', async () => {
    const config = configFixture();
    const { model } = fakeModel({});
    const result = await analyzePipeline(config, model, () => {});

    expect(pipeline.analyzeStructure(config).length).toBeGreaterThan(0);
    expect(pipeline.analyzeBrief(config).length).toBeGreaterThan(0);
    const count = pipeline.analyzeStructure(config).length + pipeline.analyzeBrief(config).length;
    expect(result.findings).toHaveLength(count);
    for (const finding of result.findings) {
      expect(Object.keys(finding).sort()).toEqual(['message', 'path', 'rule', 'severity', 'subject']);
      expect(typeof finding.message).toBe('string');
      expect(['blocker', 'warning']).toContain(finding.severity);
    }
  });

  it('F-16 AC-017 the subject of each finding is its path', async () => {
    const config = configFixture();
    const { model } = fakeModel({});
    const result = await analyzePipeline(config, model, () => {});

    for (const finding of result.findings) {
      expect(finding.subject).toBe(finding.path);
    }
  });

  it('F-16 AC-017 a brief finding names the brief field it is about as its subject', async () => {
    const { model } = fakeModel({});
    const result = await analyzePipeline(configFixture(), model, () => {});
    const brief = result.findings.filter((finding) => finding.rule.startsWith('brief-'));

    expect(brief.length).toBeGreaterThan(0);
    expect(brief).toContainEqual({
      severity: 'blocker',
      rule: 'brief-name',
      path: 'name',
      subject: 'name',
      message: 'must not be blank',
    });
  });

  it('F-16 AC-017 a structural finding keeps its rule, path, severity and message, its path as subject', async () => {
    const config = configFixture();
    const { model } = fakeModel({});
    const result = await analyzePipeline(config, model, () => {});
    const [first] = pipeline.analyzeStructure(config);
    if (first === undefined) throw new Error('the fixture must give a structural finding');

    expect(result.findings[0]).toEqual({ ...first, subject: first.path });
    expect(result.findings[0]?.rule).toBe(first.rule);
    expect(result.findings[0]?.path).toBe(first.path);
  });

  it('F-16 AC-017 the review findings keep the subject the model gave them', async () => {
    const { model } = fakeModel({ text: JSON.stringify([validEntry]) });
    const result = await analyzePipeline(configFixture(), model, () => {});

    expect(result.review.findings).toEqual([validEntry]);
  });
});

describe('F-06 one call and no change to the config', () => {
  it('F-06 AC-009 one analysis makes one review call, and a thrown call is not retried', async () => {
    const ok = fakeModel({ text: '[]' });
    await analyzePipeline(configFixture(), ok.model, () => {});
    expect(ok.calls).toHaveLength(1);

    const failing = fakeModel({ throws: 'timeout' });
    await analyzePipeline(configFixture(), failing.model, () => {});
    expect(failing.calls).toHaveLength(1);
  });

  it('F-06 AC-022 the analysis leaves the config equal before and after the call', async () => {
    const config = configFixture();
    const before = structuredClone(config);
    const { model } = fakeModel({ text: JSON.stringify([validEntry]) });
    await analyzePipeline(config, model, () => {});

    expect(config).toStrictEqual(before);
  });

  it('F-06 AC-022 a review entry carries only severity, subject and message, never a process change', async () => {
    const reply = [
      {
        severity: 'warning',
        subject: 'pipeline',
        message: 'Add a review block.',
        process: { flows: [] },
        change: { op: 'remove', blockId: 'a8a20629-71a6-50b5-ab56-f416afc01833' },
        flows: [],
      },
      { severity: 'blocker', subject: 'idea', message: 'Idea is vague.', pipeline: { name: 'other' } },
    ];
    const config = configFixture();
    const before = structuredClone(config);
    const { model } = fakeModel({ text: JSON.stringify(reply) });
    const result = await analyzePipeline(config, model, () => {});

    expect(result.review.status).toBe('ok');
    expect(result.review.findings).toHaveLength(2);
    for (const entry of result.review.findings) {
      expect(Object.keys(entry).sort()).toEqual(['message', 'severity', 'subject']);
    }
    expect(result.review.findings[1]).toEqual({ severity: 'warning', subject: 'idea', message: 'Idea is vague.' });
    expect(config).toStrictEqual(before);
  });
});
