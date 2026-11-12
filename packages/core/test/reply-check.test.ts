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

    expect(findings).toEqual([
      'file path "/etc/passwd" must not start with "/"',
      'file path "../escape.md" must not contain ".."',
      'file path "a\\b.md" must use forward slashes',
      'file path is empty',
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
});
