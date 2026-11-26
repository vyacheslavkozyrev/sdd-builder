// The file name of a name, without the `.md` (F-16, AC-013 and AC-029): the name in lower case, in Unicode composed
// form, with each run of characters that is not a letter or a decimal digit replaced by one `-`, and the ends trimmed.
// `Specify` gives `specify`, `Review code` gives `review-code` and `Café` gives `café`. A combining mark is not a letter,
// so it separates; composing first keeps an accented letter whole. The name may be empty when the name has no letter or
// digit; the structural analysis refuses that for a flow (AC-014), so a flow never writes a file with an empty name.
export function fileNameOf(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{Nd}]+/gu, '-')
    .replace(/^-|-$/g, '');
}
