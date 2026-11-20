// The check of the review reply (F-06 AC-011 to AC-018, decision 37 (d)). The API sends the reply text of the model's
// review call; the check parses it and keeps the valid entries. A reply that is not JSON, or not a JSON array, fails as a
// whole. Otherwise each entry is checked on its own: an entry is kept only as an object with severity `warning` or
// `info` and a `subject` and a `message` that are not blank; a model `blocker` is kept as `warning`; anything else is
// dropped. Kept entries come in reply order, at most 10; further valid entries count as dropped. The check never throws
// for a bad reply and never changes the text of a kept entry.

export interface ReviewEntry {
  readonly severity: 'warning' | 'info';
  readonly subject: string;
  readonly message: string;
}

export type ReviewResult =
  | { readonly status: 'ok'; readonly findings: readonly ReviewEntry[]; readonly dropped: number }
  | { readonly status: 'failed'; readonly findings: readonly []; readonly dropped: 0 };

const MAX_ENTRIES = 10;

// A fresh result on each call, so no caller can change the findings of another.
function failed(): ReviewResult {
  return { status: 'failed', findings: [], dropped: 0 };
}

export function checkReview(text: string): ReviewResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return failed();
  }
  if (!Array.isArray(value)) return failed();

  const findings: ReviewEntry[] = [];
  let dropped = 0;
  for (const item of value as unknown[]) {
    const entry = keptEntry(item);
    if (entry === undefined) {
      dropped += 1;
    } else if (findings.length < MAX_ENTRIES) {
      findings.push(entry);
    } else {
      dropped += 1;
    }
  }
  return { status: 'ok', findings, dropped };
}

// The entry as it is kept, or undefined when the entry is dropped.
function keptEntry(item: unknown): ReviewEntry | undefined {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return undefined;
  const { severity, subject, message } = item as Record<string, unknown>;
  if (typeof subject !== 'string' || !/\S/.test(subject)) return undefined;
  if (typeof message !== 'string' || !/\S/.test(message)) return undefined;
  if (severity === 'warning' || severity === 'blocker') return { severity: 'warning', subject, message };
  if (severity === 'info') return { severity: 'info', subject, message };
  return undefined;
}
