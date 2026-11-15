import { Hono, type Context } from 'hono';
import { pipeline, type ListableTemplateSource } from '@sddbuilder/core';
import { analyzePipeline, type ReviewModel } from './analyze.js';
import { generatePipelineProject } from './generate/pipeline-service.js';
import type { GenerationModel } from './generate/generation-model.js';
import { errorBody, type ErrorBody } from './http/errors.js';
import { readPipelineConfig } from './http/read-pipeline-config.js';
import { errorNameOf, formatLogLine, routeOf, type LogPort, type LogRoute } from './log.js';
import type { ClientLimiter, Reservation } from './limits/client-limiter.js';
import type { DailyCeiling } from './limits/daily-ceiling.js';
import { packageZip } from './zip.js';

/** The 422 message for a configuration that the structural check refuses, on `/generate` and in `generatePipelineProject`. */
const REFUSED_MESSAGE = 'project config cannot be generated';

/** What `/generate` needs to write the project. `null` in `AppDeps` means the generation model is not configured. */
export interface GenerationPorts {
  templates: ListableTemplateSource;
  model: GenerationModel;
}

/**
 * The limits: the per-client limiter and the address it counts for a request (the connection's, in production),
 * and the two daily ceilings. Each ceiling is counted right before its model call, after the request has passed
 * the rate limit and the input caps.
 */
export interface LimitPorts {
  limiter: ClientLimiter;
  clientAddress: (c: Context) => string;
  reviewCeiling: DailyCeiling;
  generateCeiling: DailyCeiling;
}

export interface AppDeps {
  review: ReviewModel;
  generation: GenerationPorts | null;
  log: LogPort;
  limits: LimitPorts;
}

/** Builds the HTTP app. Routes are stateless: nothing from a request is kept after the response, apart from the limiter's counts. */
export function createApp({ review, generation, log, limits }: AppDeps): Hono {
  const app = new Hono();

  /**
   * The per-client limit, checked before the body is read. A refused request gets 429 and is not counted;
   * an accepted one is counted, and gets its reservation back if an input cap refuses it.
   */
  const admitRequest = (
    c: Context,
    route: LogRoute,
  ): { ok: true; reservation: Reservation } | { ok: false; response: Response } => {
    const decision = limits.limiter.admit(limits.clientAddress(c));
    if (decision.allowed) {
      return { ok: true, reservation: decision };
    }
    log.write(formatLogLine({ event: 'rate_limited', route, status: 429 }));
    const response = c.json(errorBody('rate limit exceeded'), 429, { 'Retry-After': String(decision.retryAfterSeconds) });
    return { ok: false, response };
  };

  /**
   * Reads the body with the route's reader, then applies the route's input caps. Both run before any model call.
   * A request refused by a cap (422) is refunded its count; a request refused as invalid JSON (400) keeps it.
   */
  const readWithinCaps = async <C>(
    c: Context,
    reservation: Reservation,
    route: LogRoute,
    read: (request: Request) => Promise<{ ok: true; config: C } | { ok: false; status: 400; body: ErrorBody }>,
    caps: (config: C) => string[],
  ): Promise<{ ok: true; config: C } | { ok: false; response: Response }> => {
    const outcome = await read(c.req.raw);
    if (!outcome.ok) {
      return { ok: false, response: c.json(outcome.body, outcome.status) };
    }
    const problems = caps(outcome.config);
    if (problems.length > 0) {
      limits.limiter.refund(reservation);
      log.write(formatLogLine({ event: 'input_refused', route, status: 422 }));
      return { ok: false, response: c.json(errorBody('project config is over the input caps', problems), 422) };
    }
    return { ok: true, config: outcome.config };
  };

  app.post('/analyze', async (c) => {
    const admitted = admitRequest(c, '/analyze');
    if (!admitted.ok) {
      return admitted.response;
    }
    const read = await readWithinCaps(c, admitted.reservation, '/analyze', readPipelineConfig, pipeline.pipelineCapProblems);
    if (!read.ok) {
      return read.response;
    }
    if (!limits.reviewCeiling.admit()) {
      log.write(formatLogLine({ event: 'daily_ceiling_reached', route: '/analyze', status: 200 }));
      return c.json(pipeline.skippedAnalysis(read.config), 200);
    }
    const result = await analyzePipeline(read.config, review, log);
    return c.json(result, 200);
  });

  app.all('/analyze', (c) => c.json(errorBody('method not allowed'), 405, { Allow: 'POST' }));

  app.post('/generate', async (c) => {
    const admitted = admitRequest(c, '/generate');
    if (!admitted.ok) {
      return admitted.response;
    }
    const read = await readWithinCaps(c, admitted.reservation, '/generate', readPipelineConfig, pipeline.pipelineCapProblems);
    if (!read.ok) {
      return read.response;
    }
    if (generation === null) {
      return c.json(errorBody('generation is not configured on this server'), 503);
    }
    // A refused configuration is answered before the ceiling is counted, so a 422 does not use up a daily generation.
    const refusals = pipeline.configProblems(read.config).map((problem) => `${problem.path}: ${problem.message}`);
    if (refusals.length > 0) {
      return c.json(errorBody(REFUSED_MESSAGE, refusals), 422);
    }
    if (!limits.generateCeiling.admit()) {
      log.write(formatLogLine({ event: 'daily_ceiling_reached', route: '/generate', status: 429 }));
      return c.json(errorBody('daily generation limit reached'), 429);
    }
    const result = await generatePipelineProject(read.config, { templates: generation.templates, model: generation.model, log });
    if (result.ok) {
      const zip = await packageZip(result.files);
      return c.body(new Uint8Array(zip), 200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="sddbuilder-project.zip"',
      });
    }
    if (result.reason === 'refused') {
      return c.json(errorBody(REFUSED_MESSAGE, result.problems), 422);
    }
    if (result.reason === 'model') {
      return c.json(errorBody('the model did not return the project', ['the model call failed']), 502);
    }
    return c.json(errorBody('the model reply failed the checks', result.problems), 502);
  });

  app.all('/generate', (c) => c.json(errorBody('method not allowed'), 405, { Allow: 'POST' }));

  app.notFound((c) => c.json(errorBody('not found'), 404));

  app.onError((err, c) => {
    log.write(formatLogLine({ event: 'unexpected_error', route: routeOf(c.req.path), status: 500, error: errorNameOf(err) }));
    return c.json(errorBody('internal error'), 500);
  });

  return app;
}
