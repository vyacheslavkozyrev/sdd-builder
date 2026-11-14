import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_STEP_CATALOG } from '../src/index.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const LAYOUT = join(REPO_ROOT, 'templates', 'workflows', 'workflow.md');
const WORKFLOW_PLACEHOLDERS = ['workflow.name', 'workflow.id', 'workflow.scope', 'workflow.steps', 'workflow.rules'];

/** The level-2 headings of a Markdown text, in order. */
function sectionHeadings(text: string): string[] {
  return [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1] ?? '');
}

/** The text under one level-2 heading, up to the next one. */
function sectionBody(text: string, heading: string): string {
  const start = text.indexOf(`\n## ${heading}\n`);
  if (start === -1) return '';
  const rest = text.slice(start + heading.length + 5);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

/** Every `{{…}}` name in a text, in order. */
function placeholderNames(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)].map((match) => match[1] ?? '');
}

/** The placeholder names in a text that are not workflow placeholders. */
function unexpectedPlaceholders(text: string): string[] {
  return placeholderNames(text).filter((name) => !WORKFLOW_PLACEHOLDERS.includes(name));
}

/** The catalog step ids that appear in a text outside its `{{…}}` placeholders. */
function catalogIdsInFixedText(text: string): string[] {
  const fixed = text.replace(/\{\{[^}]*\}\}/g, '');
  return DEFAULT_STEP_CATALOG.map((step) => step.id).filter((id) =>
    new RegExp(`(?<![\\w-])${id}(?![\\w-])`, 'i').test(fixed),
  );
}

describe('F-03 T006 workflow layout', () => {
  const text = readFileSync(LAYOUT, 'utf8');

  it('F-03 AC-005 the workflow layout has the sections Purpose, Steps, Rules and Scope', () => {
    expect(sectionHeadings(text)).toEqual(['Purpose', 'Steps', 'Rules', 'Scope']);
  });

  it('F-03 AC-006 the workflow layout uses only the five workflow placeholders', () => {
    expect(placeholderNames(text).length).toBeGreaterThan(0);
    expect(unexpectedPlaceholders(text)).toEqual([]);
    const names = placeholderNames(text);
    for (const name of WORKFLOW_PLACEHOLDERS) {
      expect(names, `missing placeholder {{${name}}}`).toContain(name);
    }
  });

  it('F-03 AC-006 the placeholder check fails on a name outside the workflow placeholders', () => {
    expect(unexpectedPlaceholders('{{workflow.name}} {{workflow.bogus}} {{projectName}}')).toEqual([
      'workflow.bogus',
      'projectName',
    ]);
  });

  it('F-03 AC-006 each workflow placeholder sits in its own section', () => {
    expect(placeholderNames(sectionBody(text, 'Steps'))).toEqual(['workflow.steps']);
    expect(placeholderNames(sectionBody(text, 'Rules'))).toEqual(['workflow.rules']);
    expect(placeholderNames(sectionBody(text, 'Scope'))).toEqual(['workflow.scope']);
  });

  it('F-03 AC-007 the workflow layout names no catalog step id as fixed text', () => {
    expect(catalogIdsInFixedText(text)).toEqual([]);
  });

  it('F-03 AC-007 the step-id check fails on a catalog id written as fixed text', () => {
    expect(catalogIdsInFixedText('Run the verify step, then {{workflow.steps}}.')).toEqual(['verify']);
  });

});
