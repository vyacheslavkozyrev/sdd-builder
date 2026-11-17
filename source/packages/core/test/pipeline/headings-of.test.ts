import { describe, expect, it } from 'vitest';
import { headingsOf } from '../../src/pipeline/generate/templates.js';

interface Case {
  name: string;
  text: string;
  expected: string[];
}

const cases: Case[] = [
  {
    name: 'F-05 headingsOf: no headings gives an empty list',
    text: 'Just a paragraph.\n\nAnother one.\n',
    expected: [],
  },
  {
    name: 'F-05 headingsOf: empty text gives an empty list',
    text: '',
    expected: [],
  },
  {
    name: 'F-05 headingsOf: a ### line is not counted',
    text: '## Kept\n### Not a level-2 heading\n#### Nor this one\n',
    expected: ['Kept'],
  },
  {
    name: 'F-05 headingsOf: headings come back in order',
    text: '# Title\n## First\nbody\n## Second\n## Third\n',
    expected: ['First', 'Second', 'Third'],
  },
  {
    name: 'F-05 headingsOf: a heading with trailing spaces keeps them',
    text: '## Trailing   \n',
    expected: ['Trailing   '],
  },
  {
    name: 'F-05 headingsOf: a line with ## not at the start is not counted',
    text: 'text ## inline\n ## indented\n##no space\n',
    expected: [],
  },
  {
    name: 'F-05 headingsOf: CRLF line endings give the heading text without the carriage return',
    text: '## One\r\nbody\r\n## Two\r\n',
    expected: ['One', 'Two'],
  },
];

describe('headingsOf', () => {
  for (const testCase of cases) {
    it(testCase.name, () => {
      expect(headingsOf(testCase.text)).toEqual(testCase.expected);
    });
  }
});
