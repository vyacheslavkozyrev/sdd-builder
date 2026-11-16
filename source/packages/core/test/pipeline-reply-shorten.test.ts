// F-07 AC-026: checkReply shortens a reply key longer than 120 characters in its finding message to its first 120
// characters followed by "...", and shows a key of 120 characters or fewer in full. The sort uses the real path. Fixed
// inputs only: an empty plan, so every key that is not unsafe is reported as not in the plan.
import { describe, expect, it } from 'vitest';
import { checkReply, type PipelinePlanEntry } from '../src/pipeline/index.js';

const NOT_IN_PLAN = (path: string): string => `file "${path}" in the reply is not in the plan`;

describe('F-07 AC-026 reply keys in finding messages', () => {
  it.each([
    { length: 1 },
    { length: 119 },
    { length: 120 },
  ])('F-07 AC-026 shows a key of $length characters in full', ({ length }) => {
    const key = 'a'.repeat(length);
    expect(checkReply([], { [key]: 'text' })).toEqual([NOT_IN_PLAN(key)]);
  });

  it.each([
    { length: 121, head: 'a'.repeat(120), last: 'Z' },
    { length: 200, head: 'b'.repeat(120), last: 'Z' },
  ])('F-07 AC-026 shortens a key of $length characters to its first 120 characters and "..."', ({ head, last, length }) => {
    const key = `${head}${'c'.repeat(length - 121)}${last}`;
    const messages = checkReply([], { [key]: 'text' });
    expect(messages).toEqual([NOT_IN_PLAN(`${head}...`)]);
    expect(messages[0]).not.toContain(last);
  });

  it.each([
    { label: 'the not-in-plan message', key: `${'d'.repeat(120)}x.md` },
    { label: 'the unsafe message', key: `/${'d'.repeat(120)}x.md` },
  ])('F-07 AC-026 bounds $label of a 5000-character key', ({ key }) => {
    const long = key.padEnd(5000, 'e');
    const [message] = checkReply([], { [long]: 'text' });
    expect(message).toBeDefined();
    expect(message!.length).toBeLessThanOrEqual(200);
    expect(message).toContain(`${long.slice(0, 120)}...`);
    expect(message).not.toContain('e'.repeat(10));
  });

  it('F-07 AC-026 shortens the key in the unsafe message as well', () => {
    const key = `/${'f'.repeat(130)}`;
    expect(checkReply([], { [key]: 'text' })).toEqual([
      `file path "/${'f'.repeat(119)}..." is unsafe: it must be relative`,
    ]);
  });

  it('F-07 AC-026 shortens a long planned path quoted in the missing-file message', () => {
    const path = `${'g'.repeat(130)}.md`;
    const plan: PipelinePlanEntry[] = [{ path, layout: '', description: '', ruleTags: [] }];
    expect(checkReply(plan, {})).toEqual([`planned file "${'g'.repeat(120)}..." is missing from the reply`]);
  });

  it('F-07 AC-026 keeps the sort order by the real path, not the shortened one', () => {
    const shared = 'p'.repeat(120);
    const unsafeSmallerPath = `${shared}a\\x`;
    const notInPlanLargerPath = `${shared}z`;
    expect(
      checkReply([], { [notInPlanLargerPath]: 'text', [unsafeSmallerPath]: 'text' }),
    ).toEqual([
      `file path "${shared}..." is unsafe: it must use forward slashes`,
      `file "${shared}..." in the reply is not in the plan`,
    ]);
  });
});
