import { Hono } from 'hono';
import type { TemplateSource } from '@sddbuilder/core';
import { analyze, type ReviewModel } from './analyze.js';
import { generateProject } from './generate/service.js';
import type { GenerationModel } from './generate/generation-model.js';
import { errorBody } from './http/errors.js';
import { readConfig } from './http/read-config.js';
import { errorNameOf, formatLogLine, routeOf, type LogPort } from './log.js';
import { packageZip } from './zip.js';

/** What `/generate` needs to write the project. `null` in `AppDeps` means the generation model is not configured. */
export interface GenerationPorts {
  templates: TemplateSource;
  model: GenerationModel;
}

export interface AppDeps {
  review: ReviewModel;
  generation: GenerationPorts | null;
  log: LogPort;
}

/** Builds the HTTP app. Routes are stateless: nothing from a request is kept after the response. */
export function createApp({ review, generation, log }: AppDeps): Hono {
  const app = new Hono();

  app.post('/analyze', async (c) => {
    const read = await readConfig(c.req.raw);
    if (!read.ok) {
      return c.json(read.body, read.status);
    }
    const result = await analyze(read.config, review);
    return c.json(result, 200);
  });

  app.all('/analyze', (c) => c.json(errorBody('method not allowed'), 405, { Allow: 'POST' }));

  app.post('/generate', async (c) => {
    const read = await readConfig(c.req.raw);
    if (!read.ok) {
      return c.json(read.body, read.status);
    }
    if (generation === null) {
      return c.json(errorBody('generation is not configured on this server'), 503);
    }
    const result = await generateProject(read.config, { templates: generation.templates, model: generation.model, log });
    if (result.ok) {
      const zip = await packageZip(result.files);
      return c.body(new Uint8Array(zip), 200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="sddbuilder-project.zip"',
      });
    }
    if (result.reason === 'refused') {
      return c.json(errorBody('project config cannot be generated', result.problems), 422);
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
