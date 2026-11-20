import { GenerationError } from './error.js';

// Renders a layout (F-04, AC-012 to AC-014). Every `{{name}}` is replaced in one pass: the value is
// copied as written, so a value that holds `{{...}}` text is not rendered again. A placeholder whose
// name has no value is a template error and throws, naming the name and the path of the file.
// Every `{{` opens a placeholder that must close with `}}`: a span with a brace or a line break inside
// is read as a name and reported, and an opening `{{` with no closing `}}` is reported too. A malformed
// placeholder is never left in the text.

const PLACEHOLDER = /\{\{([\s\S]*?)\}\}|\{\{/g;

export function renderLayout(
  layout: string,
  values: Readonly<Record<string, string>>,
  path: string,
): string {
  return layout.replace(PLACEHOLDER, (_match, name: string | undefined) => {
    if (name === undefined) {
      throw new GenerationError(`the layout of ${path} has an opening {{ with no closing }}`);
    }
    const value = Object.hasOwn(values, name) ? values[name] : undefined;
    if (value === undefined) {
      throw new GenerationError(`the layout of ${path} uses the placeholder {{${name}}}, which has no value`);
    }
    return value;
  });
}
