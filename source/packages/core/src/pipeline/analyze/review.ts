// The check of the model's review reply (architecture.md §4, decisions 10 and 37; US-004). The API makes the call and
// passes the reply text here. The check is pure: it parses the text, keeps the entries that are usable and counts the
// rest. A review entry is advice, so a model `blocker` is kept as `warning`, and the reply is never applied to the config.

// The severities a review entry can have once kept.
export type ReviewSeverity = 'warning' | 'info';

// A kept review entry, in the words the model wrote (not trimmed).
export interface ReviewEntry {
  readonly severity: ReviewSeverity;
  readonly subject: string;
  readonly message: string;
}

// `failed` when the reply is not a JSON array; otherwise the kept entries and the count of the valid or invalid
// entries that were not kept.
export type ReviewResult =
  | { readonly status: 'failed' }
  | { readonly status: 'ok'; readonly findings: readonly ReviewEntry[]; readonly dropped: number };

// At most this many entries are kept; further valid entries are counted as dropped (decision 37, d).
const MAX_ENTRIES = 10;

// Parses the reply and keeps its usable entries in reply order. A reply that is not JSON, or that is JSON but not an
// array, fails. Any other reply is `ok`, even when it has no entries or every entry was dropped.
export function checkReview(text: string): ReviewResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { status: 'failed' };
  }
  if (!Array.isArray(value)) {
    return { status: 'failed' };
  }

  const findings: ReviewEntry[] = [];
  let dropped = 0;
  for (const item of value) {
    const entry = usableEntry(item);
    if (entry === undefined || findings.length >= MAX_ENTRIES) {
      dropped += 1;
    } else {
      findings.push(entry);
    }
  }
  return { status: 'ok', findings, dropped };
}

// The entry as kept, or undefined when it is not an object, has a severity other than `warning`, `info` or
// `blocker`, or has a subject or message that is not a non-blank string.
function usableEntry(item: unknown): ReviewEntry | undefined {
  if (!isRecord(item)) {
    return undefined;
  }
  const severity = keptSeverity(item['severity']);
  const subject = nonBlank(item['subject']);
  const message = nonBlank(item['message']);
  if (severity === undefined || subject === undefined || message === undefined) {
    return undefined;
  }
  return { severity, subject, message };
}

// `blocker` is kept as `warning`; any other severity that is not `warning` or `info` is not kept.
function keptSeverity(value: unknown): ReviewSeverity | undefined {
  if (value === 'blocker' || value === 'warning') {
    return 'warning';
  }
  if (value === 'info') {
    return 'info';
  }
  return undefined;
}

// The text when it is a string with something other than white space, otherwise undefined.
function nonBlank(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

// True for a plain object: a non-null object that is not an array.
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
