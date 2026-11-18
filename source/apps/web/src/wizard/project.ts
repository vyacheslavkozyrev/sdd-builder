// The project step's text rules (F-09 AC-003, AC-006, AC-007, AC-008, AC-011).
// Pure functions: no React and no I/O. Lengths are counted in code points, so
// an emoji counts as one. The stored text is never changed here; only the
// configuration takes the trimmed idea.

export const NAME_LIMIT = 100;
export const IDEA_LIMIT = 5000;

// The number of code points in the text.
export function codePointCount(text: string): number {
  return Array.from(text).length;
}

// Keeps the first `limit` code points. Splitting by code point never breaks a
// surrogate pair, so an emoji that would cross the limit is dropped whole.
export function limitToCodePoints(text: string, limit: number): string {
  const points = Array.from(text);
  return points.length <= limit ? text : points.slice(0, limit).join('');
}

// Digits with a comma every three places, independent of the locale.
export function withThousands(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// The idea counter, `N / 5,000`, with thousands separators (AC-006).
export function ideaCounterText(idea: string): string {
  return `${withThousands(codePointCount(idea))} / ${withThousands(IDEA_LIMIT)}`;
}

// The idea as it goes into the configuration: leading and trailing whitespace
// removed, empty for spaces-only text. Internal line breaks are kept (AC-011).
export function ideaForConfiguration(idea: string): string {
  return idea.trim();
}
