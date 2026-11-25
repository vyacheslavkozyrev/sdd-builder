// Reads the model's reply as one JSON object (F-15 AC-016). The whole text must be the object: a code fence, a leading
// sentence, an array, a number, a string or `null` is a failed reply. The values are kept as written; core's
// `checkReply` checks them against the plan.

export function parseReply(text: string): ReadonlyMap<string, unknown> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  return new Map(Object.entries(parsed));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
