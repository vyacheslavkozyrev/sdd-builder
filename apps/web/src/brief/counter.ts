import { INPUT_CAPS } from '@sddbuilder/core';

/** Groups the digits of a whole number in threes, so 12345 reads "12,345". */
export function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * The idea counter, as `N / 8,000` (F-05 AC-003). N is the length of the raw text in JavaScript
 * string length, with no trimming, the same count the core limit uses (`INPUT_CAPS.ideaCharacters`).
 */
export function ideaCounter(text: string): string {
  return `${groupThousands(text.length)} / ${groupThousands(INPUT_CAPS.ideaCharacters)}`;
}
