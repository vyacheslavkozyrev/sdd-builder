import { describe, expect, it } from 'vitest';
import type { Finding } from '../../src/pipeline/analyze/index.js';
import { checkReply, type PlannedFiles, type Reply } from '../../src/pipeline/generate/reply-check.js';

// A planned file with the given headings. Only the path and the headings matter to the text checks.
function entry(path: string, headings: readonly string[]) {
  return { path, text: 'text\n', headings, description: '', ruleTags: [] };
}

const PIPELINE = '.claude/commands/pipeline.md';
const CLAUDE = 'CLAUDE.md';

// Two Markdown outputs with required headings, and one output with none.
const plan: PlannedFiles = {
  ok: true,
  files: [entry(PIPELINE, ['## Pipeline']), entry(CLAUDE, ['## Project', '## Commands']), entry('.gitkeep', [])],
};

// A reply that satisfies every heading and names nothing it must not name.
function completeReply(): Reply {
  return { [PIPELINE]: '## Pipeline\n', [CLAUDE]: '## Project\n## Commands\n', '.gitkeep': 'kept\n' };
}

// The path and message of each finding, in the order they come out.
function pairs(findings: readonly Finding[]): readonly (readonly [string, string])[] {
  return findings.map((finding) => [finding.path, finding.message]);
}

// The `CLAUDE.md` reply with the given text, the pipeline command kept complete.
function claudeReply(text: unknown): Reply {
  return { ...completeReply(), [CLAUDE]: text };
}

describe('F-04 checkReply, required headings', () => {
  it.each([
    ['an exact heading line', '# Project\n\n## Project\n## Commands\n'],
    ['a heading with trailing spaces', '## Project   \n## Commands\n'],
    ['a heading with CRLF line ends', '## Project\r\n## Commands\r\n'],
    ['a heading on the last line with no line end', '## Project\n## Commands'],
  ])('F-04 AC-027 accepts a text that holds the required headings as lines: %s', (_name, text) => {
    expect(checkReply(plan, claudeReply(text))).toEqual([]);
  });

  it.each([
    ['a heading with leading spaces', ' ## Project\n## Commands\n', ['## Project']],
    ['a heading at another level', '### Project\n## Commands\n', ['## Project']],
    ['a heading that is only a prefix of a line', '## Project notes\n## Commands\n', ['## Project']],
    // The findings come out sorted by message, so the missing headings are listed in that order.
    ['a heading written as plain text', 'Project\nCommands\n', ['## Commands', '## Project']],
    ['no heading at all', 'Some prose.\n', ['## Commands', '## Project']],
  ])('F-04 AC-027 names each required heading the text lacks: %s', (_name, text, missing) => {
    const findings = checkReply(plan, claudeReply(text));
    expect(pairs(findings)).toEqual(
      missing.map((heading) => [CLAUDE, `The reply text for "${CLAUDE}" has no line "${heading}".`]),
    );
    expect(findings.every((finding) => finding.severity === 'blocker')).toBe(true);
  });

  it('F-04 AC-027 names the path and the heading of a Markdown output that lacks its heading', () => {
    const reply = { ...completeReply(), [PIPELINE]: '# Pipeline\n' };
    expect(pairs(checkReply(plan, reply))).toEqual([
      [PIPELINE, `The reply text for "${PIPELINE}" has no line "## Pipeline".`],
    ]);
  });

  it('F-04 AC-027 asks for no heading of a planned file that requires none', () => {
    const reply = { ...completeReply(), '.gitkeep': 'anything without headings' };
    expect(checkReply(plan, reply)).toEqual([]);
  });
});

describe('F-04 checkReply, self-reference', () => {
  it.each([
    ['SDDBuilder', 'Built with SDDBuilder.'],
    ['source/apps/web', 'See source/apps/web/src.'],
    ['source/apps/api', 'Calls source/apps/api.'],
    ['source/packages/core', 'Uses source/packages/core.'],
  ])('F-04 AC-028 names the path of a text that names %s', (name, sentence) => {
    const findings = checkReply(plan, claudeReply(`## Project\n## Commands\n${sentence}\n`));
    expect(pairs(findings)).toEqual([
      [CLAUDE, `The reply text for "${CLAUDE}" names "${name}", which a generated project must not refer to.`],
    ]);
  });

  it.each([
    ['a lower-case product name', 'Built with sddbuilder.'],
    ['a path in upper case', 'See Source/Apps/Web.'],
    ['a path with a different folder', 'See source/apps/shared.'],
    ['a name with a space instead of a dash', 'Built with SDD Builder.'],
  ])('F-04 AC-028 does not take %s for a self-reference', (_name, sentence) => {
    expect(checkReply(plan, claudeReply(`## Project\n## Commands\n${sentence}\n`))).toEqual([]);
  });

  it('F-04 AC-028 names the path of a self-reference in the pipeline command too', () => {
    const reply = { ...completeReply(), [PIPELINE]: '## Pipeline\nRuns in source/apps/api.\n' };
    expect(pairs(checkReply(plan, reply))).toEqual([
      [PIPELINE, `The reply text for "${PIPELINE}" names "source/apps/api", which a generated project must not refer to.`],
    ]);
  });
});

describe('F-04 checkReply, every applicable check runs on a text', () => {
  const missingProject = `The reply text for "${CLAUDE}" has no line "## Project".`;
  const missingCommands = `The reply text for "${CLAUDE}" has no line "## Commands".`;

  it('F-04 AC-026 AC-027 reports a placeholder and a missing heading of the same text', () => {
    expect(pairs(checkReply(plan, claudeReply('# {{projectName}}\n## Commands\n')))).toEqual([
      [CLAUDE, missingProject],
      [CLAUDE, `The reply text for "${CLAUDE}" still holds a {{...}} placeholder.`],
    ]);
  });

  it('F-04 AC-026 AC-027 reports an empty text and each heading it lacks', () => {
    expect(pairs(checkReply(plan, claudeReply('   \n')))).toEqual([
      [CLAUDE, missingCommands],
      [CLAUDE, missingProject],
      [CLAUDE, `The reply text for "${CLAUDE}" is empty.`],
    ]);
  });

  it('F-04 AC-026 AC-027 AC-028 reports a placeholder, a missing heading and a self-reference of one text', () => {
    expect(pairs(checkReply(plan, claudeReply('{{projectName}} built with SDDBuilder\n')))).toEqual([
      [CLAUDE, missingCommands],
      [CLAUDE, missingProject],
      [CLAUDE, `The reply text for "${CLAUDE}" names "SDDBuilder", which a generated project must not refer to.`],
      [CLAUDE, `The reply text for "${CLAUDE}" still holds a {{...}} placeholder.`],
    ]);
  });

  it('F-04 AC-029 gives one finding for a text that is not a string, without the other checks', () => {
    expect(pairs(checkReply(plan, claudeReply(42)))).toEqual([
      [CLAUDE, `The reply text for "${CLAUDE}" is not a string.`],
    ]);
  });
});

describe('F-04 checkReply, order and determinism', () => {
  // A reply with findings on three paths, inserted out of order, and two names and a missing heading on CLAUDE.md.
  function unorderedReply(): Reply {
    return {
      'docs/extra.md': '# Extra\n',
      [CLAUDE]: 'Built with SDDBuilder in source/packages/core.\n## Commands\n',
      [PIPELINE]: '# Pipeline\n',
      '.gitkeep': 'kept\n',
    };
  }

  it('F-04 AC-030 sorts findings by path, then by message, by code point', () => {
    expect(pairs(checkReply(plan, unorderedReply()))).toEqual([
      [PIPELINE, `The reply text for "${PIPELINE}" has no line "## Pipeline".`],
      [CLAUDE, `The reply text for "${CLAUDE}" has no line "## Project".`],
      [CLAUDE, `The reply text for "${CLAUDE}" names "SDDBuilder", which a generated project must not refer to.`],
      [CLAUDE, `The reply text for "${CLAUDE}" names "source/packages/core", which a generated project must not refer to.`],
      ['docs/extra.md', 'The reply path "docs/extra.md" is not in the plan.'],
    ]);
  });

  it('F-04 AC-030 gives the same findings when the same reply is checked twice', () => {
    const reply = unorderedReply();
    expect(checkReply(plan, reply)).toEqual(checkReply(plan, reply));
  });

  it('F-04 AC-030 gives the same findings whatever the key order of the reply', () => {
    const reversed = Object.fromEntries(Object.entries(unorderedReply()).reverse());
    expect(checkReply(plan, reversed)).toEqual(checkReply(plan, unorderedReply()));
  });

  it('F-04 AC-030 does not change the plan or the reply', () => {
    const planBefore = structuredClone(plan);
    const replyBefore = structuredClone(unorderedReply());
    const reply = unorderedReply();

    checkReply(plan, reply);
    checkReply(plan, reply);

    expect(plan).toEqual(planBefore);
    expect(reply).toEqual(replyBefore);
  });
});
