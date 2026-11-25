// Reads the body of `POST /analyze` (F-14 AC-005 to AC-009). The text is parsed as JSON, and the value is checked by
// core's parser. A refusal carries the parser's problems as `<path>: <reason>`, in the parser's order. The reply never
// repeats brief text (the idea, the architecture, the rule content): the JSON parser's own message is not used, since it
// can quote part of the input. Ids, names, tags and list items that core's messages name may appear (Amendment 1).

import { pipeline } from '@sddbuilder/core';

export type BodyResult =
  | { readonly ok: true; readonly config: pipeline.ProjectConfig }
  | { readonly ok: false; readonly error: string; readonly problems: readonly string[] | null };

export function readProjectConfig(text: string): BodyResult {
  if (text.length === 0) return { ok: false, error: 'The request body is empty', problems: null };

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The request body is not JSON', problems: null };
  }

  const parsed = pipeline.parseProjectConfig(value);
  if (!parsed.ok) {
    return {
      ok: false,
      error: 'The project config is not valid',
      problems: parsed.problems.map((problem) => `${problem.path}: ${problem.message}`),
    };
  }
  return { ok: true, config: parsed.config };
}
