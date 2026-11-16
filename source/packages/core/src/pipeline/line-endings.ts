// The line-ending rule for every generated file (F-07 AC-027): the text uses LF line endings only, and ends with
// exactly one newline. CRLF and a lone CR become LF; trailing newlines beyond the first are removed; an empty text
// becomes one newline. Pure: a string in, a string out. The template-made files and the model-written files both pass
// through it.

/** The text of a generated file with LF line endings and exactly one trailing newline (F-07 AC-027). */
export function normaliseFileText(text: string): string {
  const lf = text.replace(/\r\n?/g, '\n');
  // A linear scan back over the trailing newlines (a regular expression here is quadratic on a long run of them).
  let end = lf.length;
  while (end > 0 && lf[end - 1] === '\n') end--;
  return `${lf.slice(0, end)}\n`;
}
