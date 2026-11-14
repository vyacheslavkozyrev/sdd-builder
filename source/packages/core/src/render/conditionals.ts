import { TemplateError } from '../errors.js';

/** Which steps are generated, and which step ids exist at all. */
export interface StepScope {
  /** Steps that take part in the generated output. */
  enabled: ReadonlySet<string>;
  /** Every known step id (catalog and custom). */
  known: ReadonlySet<string>;
}

const MARKER = /\{\{(#step:|\/step:)([^}]*)\}\}/g;

/**
 * Keeps `{{#step:id}}…{{/step:id}}` content when the step is enabled and
 * removes it, markers included, when it is disabled or absent. Nesting,
 * unclosed or mismatched markers, and unknown step ids fail with a TemplateError.
 */
export function renderConditionals(text: string, scope: StepScope, templatePath: string): string {
  let result = '';
  let cursor = 0;
  let open: { id: string; bodyStart: number } | undefined;

  for (const match of text.matchAll(MARKER)) {
    const index = match.index ?? 0;
    const kind = match[1];
    const id = (match[2] ?? '').trim();
    if (!scope.known.has(id)) {
      throw new TemplateError(templatePath, `conditional names unknown step "${id}"`);
    }

    if (kind === '#step:') {
      if (open) {
        throw new TemplateError(templatePath, `nested conditional: "${id}" opens inside "${open.id}"`);
      }
      result += text.slice(cursor, index);
      open = { id, bodyStart: index + match[0].length };
    } else {
      if (!open) {
        throw new TemplateError(templatePath, `closing marker for "${id}" has no opening marker`);
      }
      if (open.id !== id) {
        throw new TemplateError(templatePath, `mismatched conditional: "${open.id}" is closed by "${id}"`);
      }
      if (scope.enabled.has(id)) {
        result += text.slice(open.bodyStart, index);
      }
      cursor = index + match[0].length;
      open = undefined;
    }
  }

  if (open) {
    throw new TemplateError(templatePath, `unclosed conditional "${open.id}"`);
  }
  return result + text.slice(cursor);
}

const PLACEHOLDER_OR_MARKER = /\{\{[^}]*\}\}/g;

/**
 * Fails on any `{{` that is not a well-formed placeholder or marker, so no
 * raw marker can reach the output. Run it on template text before values are inserted.
 */
export function checkNoStrayMarkers(text: string, templatePath: string): void {
  for (const match of text.matchAll(PLACEHOLDER_OR_MARKER)) {
    if (!/^\{\{\s*([A-Za-z][A-Za-z.]*|#step:[^}]+|\/step:[^}]+)\s*\}\}$/.test(match[0])) {
      throw new TemplateError(templatePath, `malformed marker ${match[0]}`);
    }
  }
  const bare = text.replace(PLACEHOLDER_OR_MARKER, '');
  if (bare.includes('{{')) {
    throw new TemplateError(templatePath, 'unterminated marker "{{"');
  }
}
