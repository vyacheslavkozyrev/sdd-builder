import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseReply } from '../src/generate/parse-reply.js';

const VALID_OBJECT = '{"CLAUDE.md":"# Project\\n","spec/plan.md":"Plan text"}';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('F-07 AC-015 parseReply refuses a reply that is not a JSON object', () => {
  it.each([
    ['text that is not JSON', 'Here are the files: CLAUDE.md', 'not JSON'],
    ['an empty string', '', 'not JSON'],
    ['whitespace only', '   \n', 'not JSON'],
    ['a bare word', 'undefined', 'not JSON'],
    ['an object cut in the middle of a value', '{"CLAUDE.md":', 'not JSON'],
    ['two objects in a row', '{} {}', 'not JSON'],
    ['an object with a trailing comma', '{"CLAUDE.md":"x",}', 'not JSON'],
    ['JSON null', 'null', 'JSON object'],
    ['a JSON array', '["CLAUDE.md"]', 'JSON object'],
    ['a JSON number', '42', 'JSON object'],
    ['a JSON string', '"CLAUDE.md"', 'JSON object'],
    ['a JSON boolean', 'true', 'JSON object'],
  ])('F-07 AC-015 refuses %s', (_label, text, finding) => {
    const result = parseReply(text, { truncated: false });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toContain(finding);
  });

  it.each([
    ['undefined', undefined],
    ['a number', 42],
    ['an object', { CLAUDE: 'x' }],
  ])('F-07 AC-015 does not throw for an input of the wrong type: %s', (_label, input) => {
    const text = input as unknown as string;
    expect(() => parseReply(text, { truncated: false })).not.toThrow();
    expect(parseReply(text, { truncated: false }).ok).toBe(false);
  });
});

describe('F-07 AC-016 parseReply never parses a truncated reply', () => {
  it.each([
    ['a truncated reply that looks like a valid object', VALID_OBJECT],
    ['a truncated reply with broken JSON', '{"CLAUDE.md": "# Proj'],
    ['a truncated reply that is plain text', 'Here are the files'],
    ['an empty truncated reply', ''],
  ])('F-07 AC-016 refuses %s without parsing it', (_label, text) => {
    const parse = vi.spyOn(JSON, 'parse');
    const result = parseReply(text, { truncated: true });
    expect(parse).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      findings: ['reply was cut off by the length limit'],
    });
  });
});

describe('F-07 AC-015 parseReply removes invisible characters from every key', () => {
  it.each([
    ['a zero-width space', '​'],
    ['a zero-width non-joiner', '‌'],
    ['a zero-width joiner', '‍'],
    ['a byte order mark', '﻿'],
  ])('F-07 AC-015 cleans a key that starts with %s', (_label, invisible) => {
    const text = JSON.stringify({ [`${invisible}.claude/rules/general.md`]: 'Rule text' });
    expect(parseReply(text, { truncated: false })).toEqual({
      ok: true,
      reply: { '.claude/rules/general.md': 'Rule text' },
    });
  });

  it('F-07 AC-015 cleans invisible characters inside a key and leaves the values unchanged', () => {
    const text = JSON.stringify({ 'spec​/﻿plan.md': 'Text with a​zero-width space' });
    expect(parseReply(text, { truncated: false })).toEqual({
      ok: true,
      reply: { 'spec/plan.md': 'Text with a​zero-width space' },
    });
  });

  it.each([
    ['one clean and one with a zero-width space', 'CLAUDE.md', '\u200BCLAUDE.md', 'CLAUDE.md'],
    ['two keys with different invisible characters', '\uFEFF.claude/a.md', '\u200B.claude/a.md', '.claude/a.md'],
  ])('F-07 AC-015 refuses %s that clean to the same path, with one finding naming the path', (_label, first, second, expectedPath) => {
    const text = `{"${first}":"one","${second}":"two"}`;
    expect(parseReply(text, { truncated: false })).toEqual({
      ok: false,
      findings: [`reply has more than one key for the path "${expectedPath}"`],
    });
  });

  it('F-07 AC-015 leaves a key with no invisible character unchanged', () => {
    expect(parseReply(VALID_OBJECT, { truncated: false })).toEqual({
      ok: true,
      reply: { 'CLAUDE.md': '# Project\n', 'spec/plan.md': 'Plan text' },
    });
  });
});

describe('F-07 AC-015 parseReply passes a JSON object through unchecked', () => {
  it.each([
    ['a valid object of text values', VALID_OBJECT],
    ['an empty object', '{}'],
    ['an object with a non-text value, left for checkReply', '{"CLAUDE.md":5}'],
  ])('F-07 AC-015 returns the object for %s', (_label, text) => {
    const result = parseReply(text, { truncated: false });
    expect(result).toEqual({ ok: true, reply: JSON.parse(text) });
  });
});
