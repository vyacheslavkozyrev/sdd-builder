import { describe, expect, it } from 'vitest';
import { checkReply, type GenerationPlan } from '../src/index.js';

// A small hand-built plan: two step files and one workflow file.
const plan: GenerationPlan = [
  { path: '.claude/commands/scan.md', layout: '# Scan\n', description: 'Scan', ruleTags: ['qa.md'] },
  { path: '.claude/agents/review.md', layout: '# Review\n', description: 'Review', ruleTags: [] },
  { path: 'CLAUDE.md', layout: '# Project\n', description: '', ruleTags: [] },
];

const exactReply = {
  '.claude/commands/scan.md': '# Scan\n',
  '.claude/agents/review.md': '# Review\n',
  'CLAUDE.md': '# Project\n',
};

describe('checkReply', () => {
  it('F-03 AC-021 returns no findings for a reply with exactly the planned files and no marker', () => {
    expect(checkReply(plan, exactReply)).toEqual([]);
  });

  it('F-03 AC-022 reports a missing planned file and an extra reply file in one pass', () => {
    const reply = {
      '.claude/commands/scan.md': '# Scan\n',
      'CLAUDE.md': '# Project\n',
      'notes/extra.md': 'extra\n',
    };

    const findings = checkReply(plan, reply);

    expect(findings).toHaveLength(2);
    expect(findings.some((f) => f.includes('.claude/agents/review.md') && f.includes('missing'))).toBe(true);
    expect(findings.some((f) => f.includes('notes/extra.md') && f.includes('not in the plan'))).toBe(true);
  });

  it('F-03 AC-023 names the file and the leftover marker when a placeholder remains', () => {
    const reply = {
      ...exactReply,
      'CLAUDE.md': '# Project\n{{project.name}}\n',
    };

    const findings = checkReply(plan, reply);

    expect(findings).toEqual(['file "CLAUDE.md" still contains "{{", "}}"']);
  });

  it('F-03 AC-023 names the file for a leftover step marker and a closing brace marker', () => {
    const reply = {
      ...exactReply,
      '.claude/commands/scan.md': '{{#step:scan}}x{{/step:scan}}\n',
      '.claude/agents/review.md': 'value }} here\n',
    };

    const findings = checkReply(plan, reply);

    expect(findings).toHaveLength(2);
    expect(findings).toContain('file ".claude/commands/scan.md" still contains "{{#step:", "{{", "}}"');
    expect(findings).toContain('file ".claude/agents/review.md" still contains "}}"');
  });

  it('F-03 AC-026 reports each unsafe path and ignores that file', () => {
    const reply = {
      ...exactReply,
      '/etc/passwd': 'root\n',
      '../escape.md': 'x\n',
      'a\\b.md': 'x\n',
      '': 'x\n',
    };

    const findings = checkReply(plan, reply);

    // Sorted by file path (AC-028): the empty path, then "../", "/", "a".
    expect(findings).toEqual([
      'file path is empty',
      'file path "../escape.md" must not contain ".."',
      'file path "/etc/passwd" must not start with "/"',
      'file path "a\\b.md" must use forward slashes',
    ]);
  });

  it('F-03 AC-026 does not report an ignored unsafe file as missing or extra', () => {
    const reply = { ...exactReply, '../escape.md': 'x\n' };

    const findings = checkReply(plan, reply);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('".."');
  });

  it('F-03 AC-027 returns findings for an empty reply without throwing', () => {
    const findings = checkReply(plan, {});

    expect(findings).toHaveLength(plan.length);
    expect(findings.every((f) => f.includes('missing'))).toBe(true);
  });

  it('F-03 AC-027 returns a finding for a non-object reply without throwing', () => {
    for (const reply of ['text', 42, true, undefined]) {
      expect(checkReply(plan, reply)).toEqual(['reply must be an object mapping file paths to text']);
    }
  });

  it('F-03 AC-027 returns a finding for an array reply without throwing', () => {
    expect(checkReply(plan, ['# Scan'])).toEqual(['reply must be an object mapping file paths to text']);
  });

  it('F-03 AC-027 returns a finding for a null reply without throwing', () => {
    expect(checkReply(plan, null)).toEqual(['reply must be an object mapping file paths to text']);
  });

  it('F-03 AC-027 returns a finding for a non-string value without throwing', () => {
    const reply = { ...exactReply, 'CLAUDE.md': 42 };

    const findings = checkReply(plan, reply);

    expect(findings).toEqual(['file "CLAUDE.md" must be text']);
  });

  it('F-03 AC-024 a Markdown file missing a required layout heading is a finding naming the heading', () => {
    const headingPlan: GenerationPlan = [
      { path: '.claude/commands/plan.md', layout: '# Plan\n\n## Steps\n\n## Rules\n', description: '', ruleTags: [] },
    ];

    const missing = checkReply(headingPlan, { '.claude/commands/plan.md': '# Plan\n\n## Steps\n' });
    expect(missing).toEqual(['file ".claude/commands/plan.md" is missing the required heading "## Rules"']);

    // Headings are compared after trimming: indented or padded headings count as present.
    const trimmed = checkReply(headingPlan, { '.claude/commands/plan.md': '# Plan\n   ## Steps  \n\t## Rules\n' });
    expect(trimmed).toEqual([]);

    // A heading must equal the required text: a deeper heading or a longer line does not count.
    const notExact = checkReply(headingPlan, { '.claude/commands/plan.md': '## Steps\n### Rules and more\n' });
    expect(notExact).toEqual(['file ".claude/commands/plan.md" is missing the required heading "## Rules"']);
  });

  it('F-03 AC-024 only ## headings are required; the title and ### subsections are not', () => {
    const sectionPlan: GenerationPlan = [
      { path: 'CLAUDE.md', layout: '# Project\n\n### Detail\n\n  ## Steps\n', description: '', ruleTags: [] },
    ];

    expect(checkReply(sectionPlan, { 'CLAUDE.md': '## Steps\n' })).toEqual([]);
    // The layout's indented `## Steps` is a required heading, compared trimmed.
    expect(checkReply(sectionPlan, { 'CLAUDE.md': '# Project\n' })).toEqual([
      'file "CLAUDE.md" is missing the required heading "## Steps"',
    ]);
  });

  it('F-03 AC-024 a shell output is not checked for headings', () => {
    const shellPlan: GenerationPlan = [
      { path: 'scripts/check.sh', layout: '#!/bin/sh\n## Steps\necho ok\n', description: '', ruleTags: [] },
    ];

    expect(checkReply(shellPlan, { 'scripts/check.sh': '#!/bin/sh\necho ok\n' })).toEqual([]);
  });

  it('F-03 AC-025 a reply that mentions an SDDBuilder path is a finding', () => {
    const reply = {
      ...exactReply,
      'CLAUDE.md': '# Project\nSee apps/web and the SDDBuilder docs.\n',
    };

    // Sorted by message: "SDDBuilder" (capital S) sorts before "apps/web".
    expect(checkReply(plan, reply)).toEqual([
      'file "CLAUDE.md" mentions "SDDBuilder"',
      'file "CLAUDE.md" mentions "apps/web"',
    ]);
    expect(checkReply(plan, { ...exactReply, '.claude/agents/review.md': '# Review\npackages/core/x\n' })).toEqual([
      'file ".claude/agents/review.md" mentions "packages/core"',
    ]);
  });

  it('F-03 AC-028 findings are sorted by path then message, and the same reply gives the same findings', () => {
    const reply = {
      '.claude/commands/scan.md': '# Scan\nsee apps/api\n',
      'CLAUDE.md': '# Project\n{{x}}\n',
      'notes/extra.md': 'x\n',
      '/abs.md': 'x\n',
    };

    const expected = [
      'planned file ".claude/agents/review.md" is missing from the reply',
      'file ".claude/commands/scan.md" mentions "apps/api"',
      'file path "/abs.md" must not start with "/"',
      'file "CLAUDE.md" still contains "{{", "}}"',
      'file "notes/extra.md" is not in the plan',
    ];

    const first = checkReply(plan, reply);
    const second = checkReply(plan, reply);
    // Same reply with its keys in reverse insertion order must give the same findings.
    const reversed = checkReply(plan, Object.fromEntries(Object.entries(reply).reverse()));

    expect(first).toEqual(expected);
    expect(second).toEqual(first);
    expect(reversed).toEqual(first);
  });
});
