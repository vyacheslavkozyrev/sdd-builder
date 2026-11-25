import { describe, expect, it } from 'vitest';
import { parseReply } from '../src/generate/parse-reply.js';

describe('F-15 AC-016 parseReply', () => {
  it.each([
    ['a valid object', '{"CLAUDE.md":"# Project","rules/a.md":"text"}', { 'CLAUDE.md': '# Project', 'rules/a.md': 'text' }],
    ['an empty object', '{}', {}],
    ['an object with surrounding whitespace', ' \n{"a":"b"}\n ', { a: 'b' }],
  ])('F-15 AC-016 accepts %s', (_name, text, expected) => {
    const reply = parseReply(text);
    expect(reply).not.toBeNull();
    expect(Object.fromEntries(reply ?? new Map())).toEqual(expected);
  });

  it.each([
    ['an array', '["a","b"]'],
    ['an array of objects', '[{"a":"b"}]'],
    ['null', 'null'],
    ['a number', '42'],
    ['a string', '"just text"'],
    ['a boolean', 'true'],
    ['a code fence around the object', '```json\n{"a":"b"}\n```'],
    ['a leading sentence', 'Here is the project: {"a":"b"}'],
    ['a trailing sentence', '{"a":"b"} Done.'],
    ['text cut short', '{"a":"b"'],
    ['an empty text', ''],
    ['only whitespace', '   \n  '],
  ])('F-15 AC-016 refuses %s', (_name, text) => {
    expect(parseReply(text)).toBeNull();
  });

  it('F-15 AC-016 keeps each value as written, with no type check', () => {
    const reply = parseReply('{"a":1,"b":null,"c":["x"],"d":{"e":true},"f":"text"}');
    expect(reply).not.toBeNull();
    expect(reply?.get('a')).toBe(1);
    expect(reply?.get('b')).toBeNull();
    expect(reply?.get('c')).toEqual(['x']);
    expect(reply?.get('d')).toEqual({ e: true });
    expect(reply?.get('f')).toBe('text');
    expect([...(reply?.keys() ?? [])]).toEqual(['a', 'b', 'c', 'd', 'f']);
  });
});
