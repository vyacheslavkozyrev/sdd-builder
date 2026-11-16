import { describe, expect, it } from 'vitest';
import { commit, routeFromValue, routeOptions, routeValue, splitLines, wholeNumberText } from '../src/builder/FormFields.js';
import { pipeline } from '@sddbuilder/core';

type Route = pipeline.Route;

describe('F-06 AC-013 a threshold field reads its text as a whole number or NaN', () => {
  it.each([
    ['digits', '12', 12],
    ['surrounding spaces ignored', ' 12 ', 12],
    ['a decimal is not whole', '1.5', Number.NaN],
    ['an exponent is refused', '1e3', Number.NaN],
    ['a hex literal is refused', '0x10', Number.NaN],
    ['a sign is refused', '-3', Number.NaN],
    ['empty text is refused', '', Number.NaN],
  ])('F-06 AC-013 %s', (_name, text, expected) => {
    expect(wholeNumberText(text)).toStrictEqual(expected);
  });
});

describe('F-06 form fields', () => {
  it.each([
    ['one per line, trimmed', 'Read\n  Write ', ['Read', 'Write']],
    ['blank lines dropped', '\n\nRead\n\n', ['Read']],
    ['empty text is an empty list', '', []],
  ])('F-06 AC-025 splits a list field: %s', (_name, text, expected) => {
    expect(splitLines(text)).toEqual(expected);
  });

  it.each<[Route]>([[{ kind: 'next' }], [{ kind: 'stop' }], [{ kind: 'back', blockId: 'plan' }]])(
    'F-06 AC-021 a route value round-trips through its select value: %j',
    (route) => {
      expect(routeFromValue(routeValue(route))).toEqual(route);
    },
  );

  it('F-06 AC-021 offers next, stop and the back routes given, in that order', () => {
    const options = routeOptions([{ kind: 'back', blockId: 'plan' }], { kind: 'next' }, true);
    expect(options.map((option) => option.value)).toEqual(['next', 'stop', 'back:plan']);
  });

  it('F-06 AC-021 a saved route whose target is no longer offered stays in the list, marked missing', () => {
    const options = routeOptions([], { kind: 'back', blockId: 'gone' }, true);
    expect(options).toContainEqual({ value: 'back:gone', label: 'back to gone (missing)' });
  });

  it('F-06 AC-014 a gate offers no next route when next is not allowed', () => {
    const options = routeOptions([], { kind: 'stop' }, false);
    expect(options.map((option) => option.value)).toEqual(['stop']);
  });

  it('F-06 AC-026 an applied edit hands the new configuration to the host; a refused entry does not', () => {
    const received: unknown[] = [];
    const config = pipeline.defaultProjectConfig;
    expect(commit({ ok: false, message: 'refused' }, (next) => received.push(next))).toBe('refused');
    expect(received).toEqual([]);
    expect(commit({ ok: true, config }, (next) => received.push(next))).toBeNull();
    expect(received).toEqual([config]);
  });
});
