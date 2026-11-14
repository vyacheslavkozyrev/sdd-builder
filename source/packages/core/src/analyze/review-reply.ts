import type { AnalysisFinding } from '../model.js';

export type ReviewReplyCheck =
  | { status: 'ok'; findings: AnalysisFinding[]; dropped: number }
  | { status: 'failed' };

/**
 * Checks the parsed reply of the LLM review. A reply that is not an array fails as a whole.
 * Otherwise each entry, in reply order, is kept only if it is an object with a known `severity`
 * and non-empty `subject` and `message` (after trimming); any other entry is dropped and counted.
 * A kept `blocker` is returned as `warning`: the model may advise, it cannot block.
 * Kept subjects and messages are returned exactly as the model wrote them.
 */
export function checkReview(reply: unknown): ReviewReplyCheck {
  if (!Array.isArray(reply)) {
    return { status: 'failed' };
  }
  const findings: AnalysisFinding[] = [];
  let dropped = 0;
  for (const entry of reply) {
    const finding = toFinding(entry);
    if (finding === undefined) {
      dropped += 1;
    } else {
      findings.push(finding);
    }
  }
  return { status: 'ok', findings, dropped };
}

function toFinding(entry: unknown): AnalysisFinding | undefined {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return undefined;
  }
  const severity = 'severity' in entry ? entry.severity : undefined;
  const subject = 'subject' in entry ? entry.subject : undefined;
  const message = 'message' in entry ? entry.message : undefined;
  if (!isSeverity(severity) || !isText(subject) || !isText(message)) {
    return undefined;
  }
  return {
    severity: severity === 'blocker' ? 'warning' : severity,
    subject,
    message,
  };
}

function isSeverity(value: unknown): value is AnalysisFinding['severity'] {
  return value === 'info' || value === 'warning' || value === 'blocker';
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
