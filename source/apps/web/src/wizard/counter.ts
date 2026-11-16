import { INPUT_CAPS } from '@sddbuilder/core';

/** Groups the digits of a whole number in threes, so 12345 reads "12,345". */
export function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * The number of code points in `text`, so a surrogate pair (an emoji, for example) counts as one
 * (F-05 AC-008). Counts the whole text, with no trimming.
 */
export function codePointLength(text: string): number {
  let count = 0;
  for (const _char of text) {
    count += 1;
  }
  return count;
}

/**
 * The idea counter, as `N / 8,000` (F-05 AC-003). N is the length of the raw text in code points
 * (F-05 AC-008), with no trimming, the same unit the cap uses (`INPUT_CAPS.ideaCharacters`).
 */
export function ideaCounter(text: string): string {
  return `${groupThousands(codePointLength(text))} / ${groupThousands(INPUT_CAPS.ideaCharacters)}`;
}
