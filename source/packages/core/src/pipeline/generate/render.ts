// Template renderer for the pipeline model (F-02 AC-019, AC-020, AC-021). Pure: the template text comes from a
// TemplateSource, and the result is returned, never written. Two forms are rendered: `{{name}}` for a value from
// the config, and `{{#enabled:<id>}}…{{/enabled:<id>}}` kept only when that block or flow is enabled. Every problem
// in every template is collected; when there is any, no text is returned and the error carries them all.
import { GenerationError } from '../../errors.js';
import type { TemplateSource } from '../../template-source.js';
import type { ProjectConfig } from '../model.js';
import { selectBlocks } from './select.js';

/** Values for `{{name}}`, by name. A name with no entry, or with an undefined entry, has no value. */
export type PipelineValues = Readonly<Record<string, string | undefined>>;

/** The inputs the renderer needs besides the template path: the source, the values and the enabled ids. */
export interface RenderInputs {
  readonly templates: TemplateSource;
  readonly values: PipelineValues;
  readonly enabled: ReadonlySet<string>;
}

/** A template after rendering: the path it came from and the text it became. */
export interface RenderedTemplate {
  readonly path: string;
  readonly text: string;
}

const OPTIONAL_STACK_KEYS = ['framework', 'platform', 'buildTool', 'testFramework'] as const;

/**
 * The value map for `{{name}}`, in one place. An optional stack key is in the map only when the key is present in
 * the config, so an absent optional value is a missing value (AC-019), and a present one renders as its text.
 */
export function pipelineValues(config: ProjectConfig): PipelineValues {
  const values: Record<string, string | undefined> = {
    projectName: config.name,
    idea: config.idea,
    'stack.language': config.stack.language,
  };
  for (const key of OPTIONAL_STACK_KEYS) {
    if (key in config.stack) values[`stack.${key}`] = config.stack[key];
  }
  return values;
}

/**
 * The ids a `{{#enabled:<id>}}` section is kept for: each block and flow that the generator selects. A child block
 * of a disabled flow is not selected, so it is not enabled for this purpose either.
 */
export function enabledIds(config: ProjectConfig): ReadonlySet<string> {
  const selection = selectBlocks(config);
  const ids = [
    ...selection.pipeline.map((block) => block.id),
    ...selection.flows.flatMap((entry) => entry.blocks.map((block) => block.id)),
  ];
  return new Set(ids);
}

/** A section marker: `{{#...}}` opens and `{{/...}}` closes. Its body is checked against the enabled form. */
const MARKER = /\{\{\s*([#/])([^{}]*)\}\}/g;
/** An opening or closing brace pair that starts a section marker, whether or not the marker is closed. */
const MARKER_START = /\{\{\s*[#/]/g;
/** The body of a section marker: `enabled:<id>`, with the id a run of non-space characters. */
const ENABLED_BODY = /^enabled:(\S+)$/;
/** A placeholder: any `{{name}}` left once the sections are handled, so a name the renderer does not know fails (AC-019). */
const PLACEHOLDER = /\{\{\s*([^{}\n]+?)\s*\}\}/g;

/** The result of rendering one template: its text, or the problems found in it. */
type Outcome = { readonly text: string } | { readonly problems: readonly string[] };

/** Keeps or removes the sections of one template. Nested, mismatched, unclosed or malformed sections are problems. */
function renderSections(text: string, enabled: ReadonlySet<string>): Outcome {
  let kept = '';
  let last = 0;
  let open: { id: string; keep: boolean } | undefined;
  const markers = [...text.matchAll(MARKER)];
  for (const match of markers) {
    const index = match.index ?? 0;
    if (open === undefined || open.keep) kept += text.slice(last, index);
    last = index + match[0].length;
    const body = ENABLED_BODY.exec(match[2] ?? '');
    if (body === null) return { problems: [`malformed section marker "${match[0]}"`] };
    const id = body[1] ?? '';
    if (match[1] === '#') {
      if (open !== undefined) return { problems: [`section "${id}" is nested inside section "${open.id}"`] };
      open = { id, keep: enabled.has(id) };
    } else {
      if (open === undefined) return { problems: [`closing marker for "${id}" has no opening marker`] };
      if (open.id !== id) return { problems: [`section "${open.id}" is closed by a marker for "${id}"`] };
      open = undefined;
    }
  }
  if (open !== undefined) return { problems: [`section "${open.id}" is not closed`] };
  // Every opening brace pair must be part of a whole marker; a stray one would otherwise reach the output unchanged.
  if ([...text.matchAll(MARKER_START)].length > markers.length) {
    return { problems: ['malformed section marker: a "{{#" or "{{/" has no closing "}}"'] };
  }
  return { text: kept + text.slice(last) };
}

/** Replaces `{{name}}` with its value. A name with no value is a problem, named once per occurrence. */
function renderPlaceholders(text: string, values: PipelineValues): Outcome {
  const problems: string[] = [];
  const rendered = text.replace(PLACEHOLDER, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) {
      problems.push(`no value for placeholder "{{${name}}}"`);
      return '';
    }
    return value;
  });
  return problems.length > 0 ? { problems } : { text: rendered };
}

/** Renders one template's text. Sections first, then placeholders in one pass, so values are never re-read. */
function renderText(text: string, inputs: RenderInputs): Outcome {
  const sections = renderSections(text, inputs.enabled);
  if ('problems' in sections) return sections;
  return renderPlaceholders(sections.text, inputs.values);
}

/** Renders one template path, prefixing every problem with that path. */
function renderOne(path: string, inputs: RenderInputs): Outcome {
  const text = inputs.templates.get(path);
  if (text === undefined) return { problems: [`template not found at "${path}"`] };
  const outcome = renderText(text, inputs);
  if ('problems' in outcome) return { problems: outcome.problems.map((problem) => `${path}: ${problem}`) };
  return outcome;
}

/**
 * Renders the templates at the given paths, in the given order. If any template is missing or fails, throws a
 * GenerationError with every problem found across them, and returns nothing (F-02 AC-019, AC-020, AC-021).
 */
export function renderTemplates(paths: readonly string[], inputs: RenderInputs): RenderedTemplate[] {
  const problems: string[] = [];
  const rendered: RenderedTemplate[] = [];
  for (const path of paths) {
    const outcome = renderOne(path, inputs);
    if ('problems' in outcome) problems.push(...outcome.problems);
    else rendered.push({ path, text: outcome.text });
  }
  if (problems.length > 0) throw new GenerationError(problems);
  return rendered;
}

/** Renders one template path. Throws a GenerationError when it is missing or fails. */
export function renderTemplate(path: string, inputs: RenderInputs): string {
  const outcome = renderOne(path, inputs);
  if ('problems' in outcome) throw new GenerationError(outcome.problems);
  return outcome.text;
}
