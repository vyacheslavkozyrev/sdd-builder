import { describe, expect, it } from 'vitest';
import type { Finding } from '../../src/pipeline/analyze/index.js';
import { checkReply, type PlannedFiles, type Reply } from '../../src/pipeline/generate/reply-check.js';

// A plan of the given paths, each with a small text. Only the paths matter to the reply check.
function planOf(...paths: readonly string[]): PlannedFiles {
  return {
    ok: true,
    files: paths.map((path) => ({ path, text: 'text\n', headings: [], description: '', ruleTags: [] })),
  };
}

const PLAN_PATHS = ['.claude/commands/pipeline.md', 'CLAUDE.md'] as const;
const plan = planOf(...PLAN_PATHS);

// A reply that holds every planned path, each with a usable text.
function completeReply(): Reply {
  return { 'CLAUDE.md': '# Project\n', '.claude/commands/pipeline.md': '# Pipeline\n' };
}

// The findings of a reply, reduced to the path and the message kind, for table comparisons.
function summary(findings: readonly Finding[]): readonly string[] {
  return findings.map((finding) => `${finding.severity} ${finding.path}`);
}

describe('F-04 checkReply', () => {
  it('F-04 AC-022 returns no findings for a reply that holds every planned path with a usable text', () => {
    expect(checkReply(plan, completeReply())).toEqual([]);
  });

  it.each([
    ['one planned path is absent', { 'CLAUDE.md': '# Project\n' }, ['blocker .claude/commands/pipeline.md']],
    ['every planned path is absent', {}, ['blocker .claude/commands/pipeline.md', 'blocker CLAUDE.md']],
  ])('F-04 AC-023 names each planned path missing from the reply when %s', (_name, reply, expected) => {
    expect(summary(checkReply(plan, reply))).toEqual(expected);
    for (const finding of checkReply(plan, reply)) {
      expect(finding.message).toContain(finding.path);
    }
  });

  it.each([
    ['a path outside the plan', 'docs/extra.md'],
    ['a path that differs from a planned one only by case', 'claude.md'],
    ['a path with a planned prefix', 'CLAUDE.md.bak'],
  ])('F-04 AC-024 names a reply path that is not in the plan: %s', (_name, extra) => {
    const reply = { ...completeReply(), [extra]: '# Extra\n' };
    expect(summary(checkReply(plan, reply))).toEqual([`blocker ${extra}`]);
  });

  it('F-04 AC-024 does not look at the text of a reply path that is not in the plan', () => {
    const reply = { ...completeReply(), 'docs/extra.md': '{{unfilled}}' };
    expect(summary(checkReply(plan, reply))).toEqual(['blocker docs/extra.md']);
  });

  it.each([
    ['an absolute path', '/etc/passwd'],
    ['a path with a parent segment', '../escape.md'],
    ['a path with a parent segment in the middle', 'a/../CLAUDE.md'],
    ['a path with a backslash', '.claude\\commands\\x.md'],
    ['a path with an empty segment', '.claude//commands.md'],
    ['a path with a trailing slash', '.claude/commands/'],
    ['an empty path', ''],
  ])('F-04 AC-025 rejects %s and names it, without a second finding', (_name, unsafe) => {
    const reply = { ...completeReply(), [unsafe]: '# Unsafe\n' };
    const findings = checkReply(plan, reply);
    expect(summary(findings)).toEqual([`blocker ${unsafe}`]);
    expect(findings[0]?.message).toContain('file-safe');
  });

  it.each([
    ['an empty text', ''],
    ['a text of spaces and newlines', '  \n\t \n'],
    ['a text with a placeholder', '# {{projectName}}\n'],
    ['a text with an empty placeholder', 'before {{}} after'],
  ])('F-04 AC-026 names a planned path whose text is %s', (_name, text) => {
    const reply = { ...completeReply(), 'CLAUDE.md': text };
    expect(summary(checkReply(plan, reply))).toEqual(['blocker CLAUDE.md']);
  });

  it.each([
    ['a single brace pair', 'a { b } c'],
    ['a JSON object', '{"a": 1}'],
    ['a braced word with no double brace', '{word}'],
  ])('F-04 AC-026 does not take %s for a placeholder', (_name, text) => {
    const reply = { ...completeReply(), 'CLAUDE.md': text };
    expect(checkReply(plan, reply)).toEqual([]);
  });

  it.each([
    ['null', null],
    ['a number', 42],
    ['a boolean', true],
    ['an object', { text: '# Project\n' }],
    ['an array', ['# Project\n']],
    ['undefined', undefined],
  ])('F-04 AC-029 reports a reply value that is %s as a finding, not an exception', (_name, value) => {
    const reply = { ...completeReply(), 'CLAUDE.md': value };
    let findings: readonly Finding[] = [];
    expect(() => {
      findings = checkReply(plan, reply);
    }).not.toThrow();
    expect(summary(findings)).toEqual(['blocker CLAUDE.md']);
    expect(findings[0]?.message).toContain('CLAUDE.md');
  });

  it.each([
    ['null', null],
    ['a string', '# Project\n'],
    ['a number', 7],
    ['an array', [['CLAUDE.md', '# Project\n']]],
  ])('F-04 AC-029 reads a reply that is %s as a map with no entries, and names each planned path', (_name, value) => {
    let findings: readonly Finding[] = [];
    expect(() => {
      findings = checkReply(plan, value);
    }).not.toThrow();
    expect(summary(findings)).toEqual(['blocker .claude/commands/pipeline.md', 'blocker CLAUDE.md']);
  });
});
