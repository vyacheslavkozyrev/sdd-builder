/**
 * The number of code points in `text`: a surrogate pair (an emoji, for example) counts as one character.
 * The idea caps count this way, the same as the form, so both agree (F-13 AC-013, F-04 AC-021). Pure: no I/O.
 */
export function codePointCount(text: string): number {
  let count = 0;
  for (const _char of text) {
    count += 1;
  }
  return count;
}
