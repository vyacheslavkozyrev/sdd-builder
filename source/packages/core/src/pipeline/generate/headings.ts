// The level-2 headings of a Markdown layout (F-04, AC-030): the lines that start with `## `, in order. A `###` line
// is not one. The lines are returned as written, so the reply check can require each of them as a whole line.
export function headingsOf(layout: string): string[] {
  return layout.split(/\r?\n/).filter((line) => line.startsWith('## '));
}
