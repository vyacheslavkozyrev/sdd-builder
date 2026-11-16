import { INPUT_CAPS } from '@sddbuilder/core';

/** The step 1 fields: the project name and the product idea (F-05 AC-007 to AC-009). */
export interface NameIdeaValues {
  readonly name: string;
  readonly idea: string;
}

/** Stores the name exactly as typed. No trimming: the analyzer decides when it is blank (F-05 AC-007). */
export function setName<V extends NameIdeaValues>(values: V, typed: string): V {
  return { ...values, name: typed };
}

/**
 * Stores the idea as typed or pasted, cut to the first 8,000 code points (F-05 AC-008). A surrogate pair
 * counts as one character and is never split. There is no trimming, so the field accepts one more character
 * at 7,999 and none at 8,000 (F-05 AC-009).
 */
export function setIdea<V extends NameIdeaValues>(values: V, typed: string): V {
  return { ...values, idea: firstCodePoints(typed, INPUT_CAPS.ideaCharacters) };
}

/**
 * The first `limit` code points of `text`, as a string. Reading stops at the limit, so a long paste is not
 * copied whole. The cut is at a code point boundary, so no surrogate pair is split.
 */
function firstCodePoints(text: string, limit: number): string {
  let kept = 0;
  let count = 0;
  for (const char of text) {
    if (count === limit) {
      break;
    }
    kept += char.length;
    count += 1;
  }
  return text.slice(0, kept);
}
