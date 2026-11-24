import type { KeyboardEvent } from 'react';

// The empty check of the required text fields of the builder (device fix 2026-11-24). A text is empty when it is
// empty after trimming, so whitespace alone counts as empty. A required field shows the parser's reason for an
// empty value, and shows it only while the field is empty: the error appears on the key press that leaves the field
// empty and is hidden as soon as text is typed. A refused value that has text reverts to the saved value instead.

// The result of a parser check: accepted, or refused with the parser's reason.
type CheckResult = { readonly ok: true } | { readonly ok: false; readonly reason: string };

export function isEmptyText(text: string): boolean {
  return text.trim() === '';
}

// The reason of a parser check, or nothing when the check accepted the value.
export function refusalOf(result: CheckResult): string | undefined {
  return result.ok ? undefined : result.reason;
}

// The error of a required field for its current text: the parser's reason for an empty value (`blankRefusal` runs
// the parser on the empty value), and nothing once the text has content.
export function emptyReasonOf(text: string, blankRefusal: () => string | undefined): string | undefined {
  return isEmptyText(text) ? blankRefusal() : undefined;
}

// The key up handler of a required text field (a one-line or a multi-line input): after each key press it passes the
// text of the field to `check`.
export function keyUpText(check: (text: string) => void) {
  return (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    check(event.currentTarget.value);
  };
}
