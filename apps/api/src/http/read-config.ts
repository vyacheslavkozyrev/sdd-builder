import { parseProjectConfig } from '@sddbuilder/core';
import type { ProjectConfig } from '@sddbuilder/core';
import { errorBody, type ErrorBody } from './errors.js';

/** The result of reading a request body: the validated config, or a 400 with the error body. */
export type ReadConfigResult =
  | { ok: true; config: ProjectConfig }
  | { ok: false; status: 400; body: ErrorBody };

function badRequest(error: string, problems?: readonly string[]): ReadConfigResult {
  return { ok: false, status: 400, body: errorBody(error, problems) };
}

/**
 * Reads the request body as a `ProjectConfig`. The body is text, then JSON, then the core parser.
 * Problems are `<path>: <reason>` strings; a submitted value is never put in them.
 */
export async function readConfig(request: Request): Promise<ReadConfigResult> {
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

  const parsed = parseProjectConfig(value);
  if (!parsed.ok) {
    const problems = parsed.problems.map((problem) => `${problem.path}: ${problem.reason}`);
    return badRequest('project config is invalid', problems);
  }
  return { ok: true, config: parsed.config };
}
