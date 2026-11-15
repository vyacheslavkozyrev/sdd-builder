import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import type { ReviewModel } from '../src/analyze.js';
import { createApp, type GenerationPorts } from '../src/app.js';
import type { GenerationModel, GenerationReply } from '../src/generate/generation-model.js';
import type { LogPort } from '../src/log.js';
import { fixedLimits } from './fixed-limits.js';
import { pipelineConfig, pipelineTemplates, refusedPipelineConfig } from './pipeline-config.js';

// Sentinels stand in for the idea, the rule text and the model reply. None of them may reach a log line.
const IDEA = 'SECRET-IDEA-F07-PRIVACY';
const RULE = 'SECRET-RULE-F07-PRIVACY';
const REPLY = 'SECRET-REPLY-F07-PRIVACY';
const SENTINELS = [IDEA, RULE, REPLY];

const GENERATE_URL = 'http://localhost/generate';

/** The only shape a log line may take: an event, then route, status and error when given, each as a key=value token. */
const LOG_LINE = /^event=[a-z_]+( route=(\/analyze|\/generate|other))?( status=\d{3})?( error=[A-Za-z_$][A-Za-z0-9_$]*)?$/;

const UNUSED_REVIEW: ReviewModel = {
  complete: () => Promise.reject(new Error('the review model is not used by /generate')),
};

/** A log port that keeps every line it receives. */
function recordingLog(): LogPort & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    write: (line: string) => {
      lines.push(line);
    },
  };
}

/** The configuration of every case: a pipeline config that carries the idea and the rule sentinels. */
function sentinelConfig(): pipeline.ProjectConfig {
  return pipelineConfig({
    idea: `A tool for ${IDEA} that turns a product idea into a framework.`,
    rules: [{ id: 'privacy-rule', title: 'Privacy rule', text: RULE }],
  });
}

const templates = pipelineTemplates();

/** A reply with text for every planned file of the config; each text carries the reply sentinel. */
function replyFor(config: pipeline.ProjectConfig): string {
  const reply: Record<string, string> = {};
  for (const entry of pipeline.planGeneration(config, templates)) {
    reply[entry.path] = `Text of ${entry.path}. ${REPLY}\n\n${entry.layout}`;
  }
  return JSON.stringify(reply);
}

/** A model that answers each call with the next fixed reply, in order; the last reply repeats. */
function modelReplying(...replies: GenerationReply[]): GenerationModel {
  let next = 0;
  return {
    complete(): Promise<GenerationReply> {
      const reply = replies[Math.min(next, replies.length - 1)];
      next += 1;
      return reply === undefined ? Promise.reject(new Error('no fixed reply')) : Promise.resolve(reply);
    },
  };
}

function failingModel(error: Error): GenerationModel {
  return { complete: () => Promise.reject(error) };
}

/** An app whose /generate uses the given model and writes its log lines to the given port. */
function appWith(log: LogPort, model: GenerationModel): ReturnType<typeof createApp> {
  const generation: GenerationPorts = { templates, model };
  return createApp({ limits: fixedLimits(), review: UNUSED_REVIEW, log, generation });
}

function post(app: ReturnType<typeof createApp>, body: string): Response | Promise<Response> {
  return app.request(GENERATE_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
}

/** One request to /generate with the status it must give and the log lines it must write, in order. */
interface Case {
  label: string;
  status: number;
  lines: string[];
  run: (log: LogPort) => Response | Promise<Response>;
}

const validConfig = sentinelConfig();
const validBody = JSON.stringify(validConfig);
const notJson: GenerationReply = { text: `not json ${REPLY}`, truncated: false };

const cases: Case[] = [
  {
    label: 'a 200 with a valid reply',
    status: 200,
    lines: [],
    run: (log) => post(appWith(log, modelReplying({ text: replyFor(validConfig), truncated: false })), validBody),
  },
  {
    label: 'a 200 after one retry of a reply that was not JSON',
    status: 200,
    lines: [],
    run: (log) => post(appWith(log, modelReplying(notJson, { text: replyFor(validConfig), truncated: false })), validBody),
  },
  {
    label: 'a 422 for a config the structural rules refuse',
    status: 422,
    lines: [],
    run: (log) => {
      const refused = refusedPipelineConfig();
      refused.idea = `A tool for ${IDEA}.`;
      refused.rules = [{ id: 'privacy-rule', title: 'Privacy rule', text: RULE }];
      return post(appWith(log, failingModel(new Error(REPLY))), JSON.stringify(refused));
    },
  },
  {
    label: 'a 422 for an idea over the input cap',
    status: 422,
    lines: ['event=input_refused route=/generate status=422'],
    run: (log) => {
      const overCap = pipelineConfig({ idea: `${IDEA} ${'x'.repeat(8000)}` });
      return post(appWith(log, failingModel(new Error(REPLY))), JSON.stringify(overCap));
    },
  },
  {
    label: 'a 502 when the model call fails with the sentinels in its message',
    status: 502,
    lines: ['event=generation_model_failed route=/generate error=TypeError'],
    run: (log) => post(appWith(log, failingModel(new TypeError(`${IDEA} ${RULE} ${REPLY}`))), validBody),
  },
  {
    label: 'a 502 when both replies are not JSON',
    status: 502,
    lines: [],
    run: (log) => post(appWith(log, modelReplying(notJson, notJson)), validBody),
  },
  {
    label: 'a 502 when both replies fail the plan check with the reply sentinel in their values',
    status: 502,
    lines: [],
    run: (log) => {
      const wrong = JSON.stringify({ 'not-planned.md': `${REPLY} ${RULE}` });
      return post(appWith(log, modelReplying({ text: wrong, truncated: false })), validBody);
    },
  },
];

describe('F-07 AC-017 every log line written by /generate carries only the event, route and status', () => {
  for (const testCase of cases) {
    it(`F-07 AC-017 ${testCase.label} writes only allowed log lines and no sentinel`, async () => {
      const log = recordingLog();

      const response = await testCase.run(log);
      await response.text();

      expect(response.status).toBe(testCase.status);
      expect(log.lines).toEqual(testCase.lines);
      for (const line of log.lines) {
        expect(line).toMatch(LOG_LINE);
      }
      const logged = log.lines.join('\n');
      for (const sentinel of SENTINELS) {
        expect(logged).not.toContain(sentinel);
      }
    });
  }

  it('F-07 AC-017 the log line format rejects a line that carries a sentinel or extra text', () => {
    expect(`event=generation_model_failed route=/generate error=${IDEA}`).not.toMatch(LOG_LINE);
    expect(`event=generation_model_failed route=/generate ${RULE}`).not.toMatch(LOG_LINE);
    expect(`event=unexpected_error route=/generate status=500 error=RangeError`).toMatch(LOG_LINE);
  });
});
