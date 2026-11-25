import type { Flow } from '../model.js';

// The file name of a flow's command, without the `.md` (F-16, AC-013): the flow name in lower case, in Unicode
// composed form, with each run of characters that is not a letter or a decimal digit replaced by one `-`, and the ends
// trimmed. `Specify` gives `specify`, `Review code` gives `review-code` and `Café` gives `café`. A combining mark is not
// a letter, so it separates; composing first keeps an accented letter whole. The name may be empty when the flow name has
// no letter or digit; the structural analysis refuses that (AC-014), so generation never writes a file with an empty name.
export function flowFileName(flow: Flow): string {
  return flow.name
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{Nd}]+/gu, '-')
    .replace(/^-|-$/g, '');
}
