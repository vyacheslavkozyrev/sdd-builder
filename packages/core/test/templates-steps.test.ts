import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_STEP_CATALOG } from '../src/index.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const STEPS_DIR = join(REPO_ROOT, 'templates', 'steps');
const COMMAND_SECTIONS = ['Purpose', 'Inputs', 'Outputs', 'Rules', 'Checks'];
const LAYOUT_FILES = ['command.md', 'agent.md', 'skill.md', 'script.md'];

/** The path of a step's layout file, relative to the repository root. */
function layoutPath(stepId: string, file: string): string {
  return join(STEPS_DIR, stepId, file);
}

/** The layout files present in a step's folder, sorted. */
function layoutFiles(stepId: string): string[] {
  return readdirSync(join(STEPS_DIR, stepId)).filter((file) => LAYOUT_FILES.includes(file)).sort();
}

/** The level-2 headings of a Markdown text, in order. */
function sectionHeadings(text: string): string[] {
  return [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1] ?? '');
}

/** The `key: value` lines of a frontmatter block, or undefined when the text has none. */
function frontmatter(text: string): Record<string, string> | undefined {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return undefined;
  const fields: Record<string, string> = {};
  for (const line of (match[1] ?? '').split('\n')) {
    const field = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (field) fields[field[1] ?? ''] = (field[2] ?? '').trim();
  }
  return fields;
}

const commandSteps = DEFAULT_STEP_CATALOG.filter((step) => step.kind === 'command');

describe('F-03 T007 command step layouts', () => {
  it('F-03 AC-008 every command step in the catalog has a command layout', () => {
    expect(commandSteps.length).toBeGreaterThan(0);
    for (const step of commandSteps) {
      expect(existsSync(layoutPath(step.id, 'command.md')), `missing templates/steps/${step.id}/command.md`).toBe(true);
      expect(layoutFiles(step.id), `${step.id}: exactly one layout expected`).toEqual(['command.md']);
    }
  });

  it('F-03 AC-010 command layouts have a frontmatter description', () => {
    for (const step of commandSteps) {
      const fields = frontmatter(readFileSync(layoutPath(step.id, 'command.md'), 'utf8'));
      expect(fields, `${step.id}: no frontmatter block`).toBeDefined();
      const description = fields?.['description'] ?? '';
      expect(description, `${step.id}: empty description`).not.toBe('');
    }
  });

  it('F-03 AC-009 command layouts have the sections Purpose, Inputs, Outputs, Rules and Checks in order', () => {
    for (const step of commandSteps) {
      const text = readFileSync(layoutPath(step.id, 'command.md'), 'utf8');
      expect(sectionHeadings(text), step.id).toEqual(COMMAND_SECTIONS);
    }
  });
});
