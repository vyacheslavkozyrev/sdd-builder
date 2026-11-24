// The reply of /generate and the state of the Generate and download action (F-13 AC-026 to AC-029). Pure: no React and
// no I/O. A 2xx reply with no content is refused the same way Analyze refuses a 200 that is not a result: it is a
// failure with status 200 and no body, shown through the same message.

import type { FileOutcome, RequestFailure } from './request.js';

export type GenerateState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'error'; readonly failure: RequestFailure };

export type GenerateReply =
  | { readonly kind: 'save'; readonly blob: Blob }
  | { readonly kind: 'failed'; readonly failure: RequestFailure };

export function generateReply(outcome: FileOutcome): GenerateReply {
  if (outcome.kind === 'file') {
    if (outcome.blob.size > 0) return { kind: 'save', blob: outcome.blob };
    return { kind: 'failed', failure: { kind: 'http-error', status: 200, body: null } };
  }
  return { kind: 'failed', failure: outcome };
}
