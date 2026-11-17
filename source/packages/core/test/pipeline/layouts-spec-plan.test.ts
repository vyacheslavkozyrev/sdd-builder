import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadTemplates } from './support/load-templates.js';

// The spec template's plan and progress files are read from the real templates (source/templates/) through the
// base manifest, so a manifest entry that points at a missing file fails here.
const templatesRoot = fileURLToPath(new URL('../../../../templates/', import.meta.url));

const base = loadTemplates(templatesRoot).base;
const plan = base.find((entry) => entry.path.endsWith('plan.md'));
const progress = base.find((entry) => entry.path.endsWith('progress.md'));

describe('F-05 AC-021 the plan and progress entries of the base manifest map to the F-00 template paths', () => {
  it('F-05 AC-021 maps the plan file to spec/specifications/F-00-template/plan.md', () => {
    expect(plan?.path).toBe('spec/specifications/F-00-template/plan.md');
  });

  it('F-05 AC-021 maps the progress file to spec/specifications/F-00-template/progress.md', () => {
    expect(progress?.path).toBe('spec/specifications/F-00-template/progress.md');
  });

});

describe('F-05 AC-024 the plan template keeps its headings', () => {
  it('F-05 AC-024 has exactly the level-2 headings Tasks, Rationale and Layer Tags, in order', () => {
    expect(plan?.headings).toEqual(['Tasks', 'Rationale', 'Layer Tags']);
  });

  it('F-05 AC-024 states the task rules and uses the generic layer tags Build, Docs and the Core example', () => {
    expect(plan?.text).toContain('**Traceable:**');
    expect(plan?.text).toContain('`[Build]`');
    expect(plan?.text).toContain('`[Docs]`');
    expect(plan?.text).toContain('`[Core]`');
  });

  it('F-05 AC-024 names no path of this repository, no SDDBuilder name and no F-XX id of this repository', () => {
    const text = plan?.text ?? '';
    expect(text).not.toMatch(/source\//);
    expect(text).not.toMatch(/SDDBuilder/);
    expect(text).not.toMatch(/spec\/documents/);
    expect(text).not.toMatch(/spec\/specifications\/F-0/);
    expect(text).not.toMatch(/F-\d{2}/);
  });
});

describe('F-05 AC-024 the progress template keeps its headings', () => {
  it('F-05 AC-024 has exactly the level-2 headings Phase Status, Current Task, Task Log, Deferred Findings, Test Results and Amendments, in order', () => {
    expect(progress?.headings).toEqual([
      'Phase Status',
      'Current Task',
      'Task Log',
      'Deferred Findings',
      'Test Results',
      'Amendments',
    ]);
  });

  it('F-05 AC-024 has the status values line and the amendment block', () => {
    expect(progress?.text).toContain('Status values:');
    expect(progress?.text).toContain('### Amendment — YYYY-MM-DD');
  });

  it('F-05 AC-024 names no path of this repository, no SDDBuilder name and no F-XX id of this repository', () => {
    const text = progress?.text ?? '';
    expect(text).not.toMatch(/source\//);
    expect(text).not.toMatch(/SDDBuilder/);
    expect(text).not.toMatch(/spec\/documents/);
    expect(text).not.toMatch(/spec\/specifications\/F-0/);
    expect(text).not.toMatch(/F-\d{2}/);
  });
});
