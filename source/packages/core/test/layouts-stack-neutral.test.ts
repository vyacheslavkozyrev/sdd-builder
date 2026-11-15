import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const TEMPLATES = join(import.meta.dirname, '..', '..', '..', 'templates');
const README = join(TEMPLATES, 'README.md');
const LAYOUT_DIRS = ['base', 'claude-code'];

/** Fence languages that would make a layout carry a script. */
const SCRIPT_FENCES = ['sh', 'bash', 'shell', 'zsh'];

/** Stack tool names a layout must not name. Matched as whole words, case-sensitive. */
const STACK_TOOLS = ['npm', 'npx', 'pnpm', 'yarn', 'vitest', 'jest', 'pytest', 'cargo', 'go test'];

/** Every file under the base and claude-code folders, recursively, as paths relative to TEMPLATES. Folders are not files. */
function layoutFiles(): string[] {
  return LAYOUT_DIRS.flatMap((dir) =>
    readdirSync(join(TEMPLATES, dir), { recursive: true, encoding: 'utf8' })
      .filter((name) => statSync(join(TEMPLATES, dir, name)).isFile())
      .map((name) => join(dir, name)),
  ).sort();
}

/** The placeholder names the README placeholder table lists, without their braces. */
function listedPlaceholders(): Set<string> {
  const readme = readFileSync(README, 'utf8');
  const start = readme.indexOf('\n## Placeholders\n');
  if (start === -1) throw new Error('README has no "## Placeholders" section');
  const rest = readme.slice(start + 1);
  const next = rest.indexOf('\n## ', 1);
  const section = next === -1 ? rest : rest.slice(0, next);
  const listed = new Set<string>();
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    for (const match of line.matchAll(/\{\{([^{}\n]+)\}\}/g)) {
      listed.add(match[1] ?? '');
    }
  }
  return listed;
}

/** Violations of the stack-neutral rule in one layout text, each naming what was found. */
function stackViolations(text: string): string[] {
  const found: string[] = [];
  for (const lang of SCRIPT_FENCES) {
    if (new RegExp('^\\s*(```|~~~)' + lang + '\\b', 'm').test(text)) {
      found.push(`fenced block opened with ${lang}`);
    }
  }
  for (const tool of STACK_TOOLS) {
    const pattern = new RegExp('\\b' + tool.replace(' ', '\\s+') + '\\b');
    if (pattern.test(text)) found.push(`stack tool ${tool}`);
  }
  return found;
}

/** Placeholders in one layout text that the README does not list. Section markers are not placeholders. */
function unlistedPlaceholders(text: string, listed: Set<string>): string[] {
  const unlisted: string[] = [];
  for (const match of text.matchAll(/\{\{([^{}\n]+)\}\}/g)) {
    const name = match[1] ?? '';
    if (name.startsWith('#') || name.startsWith('/')) continue;
    if (!listed.has(name)) unlisted.push(name);
  }
  return unlisted;
}

const FILES = layoutFiles();

describe('F-03 T011 stack-neutral layouts', () => {
  it('F-03 AC-024 the stack-neutral check finds the base and claude-code layout files', () => {
    expect(FILES.length).toBeGreaterThan(0);
    expect(FILES.some((file) => file.startsWith('base'))).toBe(true);
    expect(FILES.some((file) => file.startsWith('claude-code'))).toBe(true);
  });

  it.each(FILES)('F-03 AC-024 %s has no script fence and no stack tool name', (file) => {
    const text = readFileSync(join(TEMPLATES, file), 'utf8');
    expect(stackViolations(text), file).toEqual([]);
  });

  it('F-03 AC-024 the stack-neutral check catches a script fence and a tool name, and not a look-alike word', () => {
    expect(stackViolations('```sh\nls\n```')).toEqual(['fenced block opened with sh']);
    expect(stackViolations('```zsh\nls\n```')).toEqual(['fenced block opened with zsh']);
    expect(stackViolations('~~~bash\nls\n~~~')).toEqual(['fenced block opened with bash']);
    expect(stackViolations('```shell\nls\n```')).toEqual(['fenced block opened with shell']);
    expect(stackViolations('```text\nnpm is a tool\n```')).toEqual(['stack tool npm']);
    expect(stackViolations('```\nplain fence\n```')).toEqual([]);
    expect(stackViolations('Run go test first.')).toEqual(['stack tool go test']);
    expect(stackViolations('Use npx to run it.')).toEqual(['stack tool npx']);
    expect(stackViolations('Use the npmrc file and the Jest-free design.')).toEqual([]);
    expect(stackViolations('The NPM name is not a tool name.')).toEqual([]);
  });

  it('F-03 AC-025 the placeholder check finds the README placeholder table', () => {
    const listed = listedPlaceholders();
    expect(listed.has('projectName')).toBe(true);
    expect(listed.has('stack.language')).toBe(true);
    expect(listed.has('routeRules')).toBe(true);
  });

  it.each(FILES)('F-03 AC-025 %s uses only placeholders the README lists', (file) => {
    const text = readFileSync(join(TEMPLATES, file), 'utf8');
    expect(unlistedPlaceholders(text, listedPlaceholders()), file).toEqual([]);
  });

  it('F-03 AC-025 names a placeholder the README does not list, and skips section markers', () => {
    const listed = listedPlaceholders();
    expect(unlistedPlaceholders('{{projectName}} {{madeUp}}', listed)).toEqual(['madeUp']);
    expect(unlistedPlaceholders('{{#enabled:x}}keep{{/enabled:x}}', listed)).toEqual([]);
  });
});
