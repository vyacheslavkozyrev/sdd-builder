import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadTemplates } from './support/load-templates.js';

// The fixtures are small template directories with the same shape as source/templates/ (T005 does not add
// the real files). Each test reads them from disk, with no state carried between tests.
function fixture(name: string): string {
  return fileURLToPath(new URL(`./support/fixtures/${name}`, import.meta.url));
}

describe('F-05 loadTemplates (test loader)', () => {
  it('F-05 loads the base files in manifest order with their output paths', () => {
    const templates = loadTemplates(fixture('templates'));

    expect(templates.base.map((file) => file.path)).toEqual(['CLAUDE.md', 'docs/settings.md']);
    expect(templates.base[0]?.text).toContain('# Fixture base file');
  });

  it('F-05 reads the headings of each base file with headingsOf, a ### line not counted', () => {
    const templates = loadTemplates(fixture('templates'));

    expect(templates.base[0]?.headings).toEqual(['Working rules', 'Next steps']);
    expect(templates.base[1]?.headings).toEqual(['Only one']);
  });

  it('F-05 reads the four Claude Code layouts with their headings', () => {
    const templates = loadTemplates(fixture('templates'));

    expect(templates.pipelineCommand.headings).toEqual(['Steps', 'Finish']);
    expect(templates.command.headings).toEqual(['Blocks']);
    expect(templates.agent.headings).toEqual(['Instructions', 'Output']);
    expect(templates.rule.headings).toEqual(['Scope']);
    expect(templates.agent.text).toContain('# Agent');
  });

  it('F-05 refuses a manifest entry that names a missing file, naming the file', () => {
    expect(() => loadTemplates(fixture('missing-file'))).toThrow(/does-not-exist\.md/);
  });

  it('F-05 refuses a manifest entry without a path, with a message that names the manifest', () => {
    expect(() => loadTemplates(fixture('bad-manifest'))).toThrow(/manifest.*entry 0.*path/);
  });

  it('F-05 refuses a manifest that is not valid JSON, naming the manifest', () => {
    expect(() => loadTemplates(fixture('not-json'))).toThrow(/manifest base\/manifest\.json is not valid JSON/);
  });

  it('F-05 refuses a manifest that is not an array of entries, naming the manifest', () => {
    expect(() => loadTemplates(fixture('not-array'))).toThrow(/manifest base\/manifest\.json must be a JSON array/);
  });

  it('F-05 refuses a missing Claude Code layout, naming the file', () => {
    expect(() => loadTemplates(fixture('missing-layout'))).toThrow(/pipeline-command\.md/);
  });
});
