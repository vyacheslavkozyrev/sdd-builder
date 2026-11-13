/** The result of reading one model reply: the parsed object, or the findings that make it a failed reply. */
export type ParseReplyResult =
  | { ok: true; reply: unknown }
  | { ok: false; findings: string[] };

export interface ParseReplyOptions {
  /** True when the provider stopped the reply at its length limit. */
  truncated: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads the text of a model reply. A truncated reply is refused before it is parsed, so a partial
 * object is never read. Text that is not JSON, or JSON that is not an object, is refused too.
 * The values inside the object are not checked here; `checkReply` in core does that.
 */
export function parseReply(text: string, options: ParseReplyOptions): ParseReplyResult {
  if (options.truncated) {
    return { ok: false, findings: ['reply was cut off by the length limit'] };
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, findings: ['reply is not JSON'] };
  }
  if (!isPlainObject(value)) {
    return { ok: false, findings: ['reply must be a JSON object mapping file paths to text'] };
  }
  return { ok: true, reply: value };
}
