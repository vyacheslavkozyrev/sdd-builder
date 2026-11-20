import { describe, expect, it } from 'vitest';
import type { GeneratedPlan, PlannedFile } from '../../src/pipeline/generate/plan.js';
import { checkReply } from '../../src/pipeline/generate/reply-check.js';

function file(path: string): PlannedFile {
  return { path, layout: `layout of ${path}`, description: '', ruleTags: [] };
}

const PLAN: GeneratedPlan = { files: [file('CLAUDE.md'), file('.claude/commands/pipeline.md')] };

function replyOf(entries: readonly (readonly [string, unknown])[]): Map<string, unknown> {
  return new Map(entries);
}

const VALID_REPLY = replyOf([
  ['CLAUDE.md', 'Project instructions.'],
  ['.claude/commands/pipeline.md', 'The pipeline command.'],
]);

describe('F-04 reply check', () => {
  it('F-04 AC-025 returns no findings for a reply that holds every planned path with a text', () => {
    expect(checkReply(PLAN, VALID_REPLY)).toEqual([]);
  });

  it('F-04 AC-026 names a planned path that is missing from the reply', () => {
    const reply = replyOf([['CLAUDE.md', 'Project instructions.']]);
    expect(checkReply(PLAN, reply)).toEqual([
      { path: '.claude/commands/pipeline.md', message: 'is missing from the reply' },
    ]);
  });

  it('F-04 AC-027 names a reply path that is not in the plan', () => {
    const reply = replyOf([...VALID_REPLY, ['extra.md', 'Extra text.']]);
    expect(checkReply(PLAN, reply)).toEqual([{ path: 'extra.md', message: 'is not in the plan' }]);
  });

  it('F-04 AC-027 does not use the text of a reply path that is not in the plan', () => {
    const reply = replyOf([...VALID_REPLY, ['extra.md', '']]);
    const findings = checkReply(PLAN, reply);
    expect(findings).toEqual([{ path: 'extra.md', message: 'is not in the plan' }]);
  });

  it.each([
    ['an absolute path', '/etc/passwd'],
    ['a dot-dot segment', '../escape.md'],
    ['a backslash', 'dir\\file.md'],
    ['an empty segment', 'dir//file.md'],
    ['a trailing slash', 'dir/'],
    ['an empty path', ''],
  ])('F-04 AC-028 names a reply path with %s as unsafe', (_label, path) => {
    const reply = replyOf([...VALID_REPLY, [path, 'Some text.']]);
    expect(checkReply(PLAN, reply)).toEqual([{ path, message: 'is not a safe path' }]);
  });

  it('F-04 AC-029 names a planned path whose text is empty', () => {
    const reply = replyOf([
      ['CLAUDE.md', ''],
      ['.claude/commands/pipeline.md', 'The pipeline command.'],
    ]);
    expect(checkReply(PLAN, reply)).toEqual([{ path: 'CLAUDE.md', message: 'has an empty text' }]);
  });

  it('F-04 AC-029 treats a whitespace-only text as empty', () => {
    const reply = replyOf([
      ['CLAUDE.md', '  \n\t '],
      ['.claude/commands/pipeline.md', 'The pipeline command.'],
    ]);
    expect(checkReply(PLAN, reply)).toEqual([{ path: 'CLAUDE.md', message: 'has an empty text' }]);
  });

  it('F-04 AC-029 names a planned path whose text holds a placeholder', () => {
    const reply = replyOf([
      ['CLAUDE.md', 'Project instructions.'],
      ['.claude/commands/pipeline.md', 'Run {{flowSteps}} next.'],
    ]);
    expect(checkReply(PLAN, reply)).toEqual([
      { path: '.claude/commands/pipeline.md', message: 'holds a {{...}} placeholder' },
    ]);
  });

  it('F-04 AC-032 names a planned path whose value is not a string, and does not throw', () => {
    const reply = replyOf([
      ['CLAUDE.md', 42],
      ['.claude/commands/pipeline.md', null],
    ]);
    expect(checkReply(PLAN, reply)).toEqual([
      { path: 'CLAUDE.md', message: 'is not a string' },
      { path: '.claude/commands/pipeline.md', message: 'is not a string' },
    ]);
  });

  it('F-04 AC-032 names a reply path that is not in the plan, even when its value is not a string', () => {
    const reply = replyOf([...VALID_REPLY, ['extra.md', { text: 'not a string' }]]);
    expect(checkReply(PLAN, reply)).toEqual([{ path: 'extra.md', message: 'is not in the plan' }]);
  });

  it('F-04 AC-029 does not flag a single brace or an unclosed {{ as a placeholder', () => {
    const reply = replyOf([
      ['CLAUDE.md', 'Use {single} braces and an open {{ marker.'],
      ['.claude/commands/pipeline.md', 'The pipeline command.'],
    ]);
    expect(checkReply(PLAN, reply)).toEqual([]);
  });

  it('F-04 AC-026 names every missing path of a reply with no entries', () => {
    expect(checkReply(PLAN, new Map<string, unknown>())).toEqual([
      { path: 'CLAUDE.md', message: 'is missing from the reply' },
      { path: '.claude/commands/pipeline.md', message: 'is missing from the reply' },
    ]);
  });

  it('F-04 AC-025 accepts a plan with no files and an empty reply', () => {
    expect(checkReply({ files: [] }, new Map<string, unknown>())).toEqual([]);
  });
});
