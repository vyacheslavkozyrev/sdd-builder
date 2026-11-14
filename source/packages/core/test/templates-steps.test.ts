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

const agentSteps = DEFAULT_STEP_CATALOG.filter((step) => step.kind === 'agent');
const AGENT_FIELDS = ['name', 'description', 'tools'];

describe('F-03 T008 agent step layouts', () => {
  it('F-03 AC-008 agent steps have an agent layout', () => {
    expect(agentSteps.length).toBeGreaterThan(0);
    for (const step of agentSteps) {
      expect(existsSync(layoutPath(step.id, 'agent.md')), `missing templates/steps/${step.id}/agent.md`).toBe(true);
      expect(layoutFiles(step.id), `${step.id}: exactly one layout expected`).toEqual(['agent.md']);
    }
  });

  it('F-03 AC-010 agent layouts have frontmatter name, description and tools', () => {
    for (const step of agentSteps) {
      const fields = frontmatter(readFileSync(layoutPath(step.id, 'agent.md'), 'utf8'));
      expect(fields, `${step.id}: no frontmatter block`).toBeDefined();
      for (const field of AGENT_FIELDS) {
        expect(fields?.[field] ?? '', `${step.id}: empty ${field}`).not.toBe('');
      }
      expect(fields?.['name'], `${step.id}: name is the step id`).toBe(step.id);
    }
  });

  it('F-03 AC-009 agent layouts have the sections Purpose, Inputs, Outputs, Rules and Checks in order', () => {
    for (const step of agentSteps) {
      const text = readFileSync(layoutPath(step.id, 'agent.md'), 'utf8');
      expect(sectionHeadings(text), step.id).toEqual(COMMAND_SECTIONS);
    }
  });
});

const scriptSteps = DEFAULT_STEP_CATALOG.filter((step) => step.kind === 'script');

/** The body of the Checks section of a Markdown text, up to the next level-2 heading or the end. */
function checksSection(text: string): string {
  const match = /^## Checks\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text);
  return match?.[1] ?? '';
}

describe('F-03 T009 script step layouts', () => {
  it('F-03 AC-008 script steps have a script layout', () => {
    expect(scriptSteps.length).toBeGreaterThan(0);
    for (const step of scriptSteps) {
      expect(existsSync(layoutPath(step.id, 'script.md')), `missing templates/steps/${step.id}/script.md`).toBe(true);
      expect(layoutFiles(step.id), `${step.id}: exactly one layout expected`).toEqual(['script.md']);
    }
  });

  it('F-03 AC-009 script layouts have the sections Purpose, Inputs, Outputs, Rules and Checks in order', () => {
    for (const step of scriptSteps) {
      const text = readFileSync(layoutPath(step.id, 'script.md'), 'utf8');
      expect(sectionHeadings(text), step.id).toEqual(COMMAND_SECTIONS);
    }
  });

  it('F-03 AC-009 the Checks section of a script layout names what the script verifies and contains no command', () => {
    for (const step of scriptSteps) {
      const checks = checksSection(readFileSync(layoutPath(step.id, 'script.md'), 'utf8'));
      expect(checks.trim(), `${step.id}: empty Checks section`).not.toBe('');
      expect(checks, `${step.id}: Checks has no list item`).toMatch(/^- \S/m);
      expect(checks, `${step.id}: code fence in Checks`).not.toMatch(/```|~~~/);
      expect(checks, `${step.id}: inline code in Checks`).not.toContain('`');
      expect(checks, `${step.id}: shell prompt or shebang in Checks`).not.toMatch(/^\s*(\$ |#!)/m);
    }
  });
});
