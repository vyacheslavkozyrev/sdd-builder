import { pipeline } from '@sddbuilder/core';
import { errorBody, type ErrorBody } from './errors.js';

/** The result of reading a pipeline request body: the validated config, or a 400 with the error body. */
export type ReadPipelineConfigResult =
  | { ok: true; config: pipeline.ProjectConfig }
  | { ok: false; status: 400; body: ErrorBody };

function badRequest(error: string, problems?: readonly string[]): ReadPipelineConfigResult {
  return { ok: false, status: 400, body: errorBody(error, problems) };
}

/**
 * Reads the request body as a pipeline `ProjectConfig` (schemaVersion 2). The body is text, then JSON, then the
 * core pipeline parser. Problems are `<path>: <reason>` strings; a submitted value is never put in them.
 */
export async function readPipelineConfig(request: Request): Promise<ReadPipelineConfigResult> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return badRequest('request body could not be read');
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return badRequest('request body is not valid JSON');
  }

  const parsed = pipeline.parsePipelineConfig(value);
  if (!parsed.ok) {
    const problems = parsed.problems.map((problem) => `${problem.path || '(root)'}: ${problem.message}`);
    return badRequest('project config is invalid', problems);
  }
  return { ok: true, config: parsed.config };
}
