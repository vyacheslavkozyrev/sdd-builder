import { describe, expect, it } from 'vitest';
import { finishFileList, InvalidConfigError } from '../src/index.js';

describe('F-02 T016 file list rules', () => {
  it('F-02 AC-032 files are sorted by path', () => {
    const out = finishFileList([{ path: 'b.md', content: 'b' }, { path: '.claude/a.md', content: 'a' }, { path: 'a.md', content: 'a' }]);
    expect(out.map((f) => f.path)).toEqual(['.claude/a.md', 'a.md', 'b.md']);
  });

  it('F-02 AC-032 a path that starts with a slash is refused', () => {
    expect(() => finishFileList([{ path: '/etc/x', content: '' }])).toThrow(InvalidConfigError);
    expect(() => finishFileList([{ path: '/etc/x', content: '' }])).toThrow('file path "/etc/x" must not start with "/"');
  });

  it('F-02 AC-032 a path with a ".." segment is refused', () => {
    expect(() => finishFileList([{ path: 'a/../../b', content: '' }])).toThrow('file path "a/../../b" must not contain ".."');
  });

  it('F-02 AC-032 a backslash path is refused', () => {
    expect(() => finishFileList([{ path: 'a\\b.md', content: '' }])).toThrow('must use forward slashes');
  });

  it('F-02 AC-032 two outputs with the same path are refused', () => {
    expect(() => finishFileList([{ path: 'a.md', content: '1' }, { path: 'a.md', content: '2' }])).toThrow('duplicate output path "a.md"');
  });

  it('F-02 AC-032 every path problem is reported together', () => {
    let caught: unknown;
    try {
      finishFileList([{ path: '/x', content: '' }, { path: 'a/../b', content: '' }]);
    } catch (error) {
      caught = error;
    }
    expect((caught as InvalidConfigError).problems).toHaveLength(2);
  });

  it('F-02 AC-033 content uses LF and ends with exactly one newline', () => {
    const [crlf] = finishFileList([{ path: 'a.md', content: 'one\r\ntwo\r\n\r\n\r\n' }]);
    expect(crlf?.content).toBe('one\ntwo\n');
    const [empty] = finishFileList([{ path: 'b.md', content: '' }]);
    expect(empty?.content).toBe('\n');
  });
});
