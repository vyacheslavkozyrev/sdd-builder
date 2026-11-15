import { describe, expect, it } from 'vitest';
import { GenerationError } from '../src/errors.js';
import { enabledIds, pipelineValues, renderTemplate, renderTemplates, type RenderInputs } from '../src/pipeline/generate/render.js';
import type { ProjectConfig, ProjectStack } from '../src/pipeline/model.js';
import { templateSourceFromRecord } from '../src/template-source.js';
import { agent, configWith, flow, pipelineEnd, pipelineStart, validFlow } from './pipeline-routes-fixtures.js';

/** A pipeline with an enabled flow `a` (a1 enabled, a2 disabled) and a disabled flow `b`. */
function sectionConfig(stack: ProjectStack = { language: 'TypeScript' }): ProjectConfig {
  const config = configWith([
    pipelineStart(),
    validFlow('a', [agent('a1'), agent('a2', false)]),
    flow('b', [agent('b1')], false),
    pipelineEnd(),
  ]);
  return { ...config, stack };
}

/** The inputs for a set of fixture templates and a configuration. */
function inputsFor(files: Record<string, string>, config: ProjectConfig): RenderInputs {
  return {
    templates: templateSourceFromRecord(files),
    values: pipelineValues(config),
    enabled: enabledIds(config),
  };
}

/** The problems a render call is refused with, or an empty list when it is not refused. */
function problemsOf(render: () => unknown): string[] {
  try {
    render();
  } catch (error) {
    if (error instanceof GenerationError) return [...error.problems];
    throw error;
  }
  return [];
}

interface ValueRow {
  name: string;
  stack: ProjectStack;
  template: string;
  expected: string;
}

const valueRows: ValueRow[] = [
  {
    name: 'F-02 AC-019 {{projectName}}, {{idea}} and {{stack.language}} are replaced from the config',
    stack: { language: 'TypeScript' },
    template: '# {{projectName}}\n{{idea}}\nLanguage: {{stack.language}}\n',
    expected: '# My project\nA tool that tracks reading lists.\nLanguage: TypeScript\n',
  },
  {
    name: 'F-02 AC-019 an optional stack value present in the config renders its text',
    stack: { language: 'TypeScript', framework: 'React', platform: 'Web', buildTool: 'Vite', testFramework: 'Vitest' },
    template: '{{stack.framework}} {{stack.platform}} {{stack.buildTool}} {{stack.testFramework}}',
    expected: 'React Web Vite Vitest',
  },
  {
    name: 'F-02 AC-019 an optional stack value present as an empty string renders as an empty string',
    stack: { language: 'TypeScript', framework: '' },
    template: 'framework=[{{stack.framework}}]',
    expected: 'framework=[]',
  },
  {
    name: 'F-02 AC-019 a placeholder is replaced in one pass, so the inserted text is not read again',
    stack: { language: 'TypeScript' },
    template: '{{idea}} / {{projectName}}',
    expected: 'A tool that tracks reading lists. / My project',
  },
];

describe('F-02 AC-019 placeholders take their value from the config', () => {
  for (const row of valueRows) {
    it(row.name, () => {
      const config = sectionConfig(row.stack);
      const inputs = inputsFor({ 'base/file.md': row.template }, config);
      expect(renderTemplate('base/file.md', inputs)).toBe(row.expected);
    });
  }
});

interface ProblemRow {
  name: string;
  stack: ProjectStack;
  template: string;
  problems: string[];
}

const problemRows: ProblemRow[] = [
  {
    name: 'F-02 AC-019 an unknown placeholder fails, naming the file and the placeholder',
    stack: { language: 'TypeScript' },
    template: 'Hello {{nope}}',
    problems: ['base/file.md: no value for placeholder "{{nope}}"'],
  },
  {
    name: 'F-02 AC-019 an optional stack value absent from the config fails, naming the placeholder',
    stack: { language: 'TypeScript' },
    template: 'Framework: {{stack.framework}}',
    problems: ['base/file.md: no value for placeholder "{{stack.framework}}"'],
  },
  {
    name: 'F-02 AC-019 every placeholder without a value is reported, not only the first',
    stack: { language: 'TypeScript' },
    template: '{{stack.platform}} {{unknown}} {{stack.buildTool}}',
    problems: [
      'base/file.md: no value for placeholder "{{stack.platform}}"',
      'base/file.md: no value for placeholder "{{unknown}}"',
      'base/file.md: no value for placeholder "{{stack.buildTool}}"',
    ],
  },
  {
    name: 'F-02 AC-019 a placeholder name with an underscore or a digit is checked, not left in the output',
    stack: { language: 'TypeScript' },
    template: '{{project_name}} {{v2}}',
    problems: [
      'base/file.md: no value for placeholder "{{project_name}}"',
      'base/file.md: no value for placeholder "{{v2}}"',
    ],
  },
  {
    name: 'F-02 AC-020 a section marker without the # is a placeholder with no value, so it fails',
    stack: { language: 'TypeScript' },
    template: 'x{{enabled:a}}y',
    problems: ['base/file.md: no value for placeholder "{{enabled:a}}"'],
  },
  {
    name: 'F-02 AC-020 an opening marker with no closing braces is refused, naming the file',
    stack: { language: 'TypeScript' },
    template: 'x{{#enabled:a',
    problems: ['base/file.md: malformed section marker: a "{{#" or "{{/" has no closing "}}"'],
  },
  {
    name: 'F-02 AC-020 a nested section is refused, naming the file',
    stack: { language: 'TypeScript' },
    template: '{{#enabled:a}}x{{#enabled:a1}}y{{/enabled:a1}}{{/enabled:a}}',
    problems: ['base/file.md: section "a1" is nested inside section "a"'],
  },
  {
    name: 'F-02 AC-020 a section closed by a marker for another id is refused, naming the file',
    stack: { language: 'TypeScript' },
    template: '{{#enabled:a}}x{{/enabled:a1}}',
    problems: ['base/file.md: section "a" is closed by a marker for "a1"'],
  },
  {
    name: 'F-02 AC-020 a closing marker with no opening marker is refused, naming the file',
    stack: { language: 'TypeScript' },
    template: 'x{{/enabled:a}}',
    problems: ['base/file.md: closing marker for "a" has no opening marker'],
  },
  {
    name: 'F-02 AC-020 an unclosed section is refused, naming the file',
    stack: { language: 'TypeScript' },
    template: '{{#enabled:a}}x',
    problems: ['base/file.md: section "a" is not closed'],
  },
  {
    name: 'F-02 AC-020 a malformed section marker is refused, naming the file',
    stack: { language: 'TypeScript' },
    template: 'x{{#enabled}}y{{/enabled}}',
    problems: ['base/file.md: malformed section marker "{{#enabled}}"'],
  },
];

describe('F-02 AC-019 and AC-020 a template with a missing value or a broken section fails with its file named', () => {
  for (const row of problemRows) {
    it(row.name, () => {
      const config = sectionConfig(row.stack);
      const inputs = inputsFor({ 'base/file.md': row.template }, config);
      expect(problemsOf(() => renderTemplates(['base/file.md'], inputs))).toEqual(row.problems);
    });
  }
});

interface SectionRow {
  name: string;
  template: string;
  expected: string;
}

const sectionRows: SectionRow[] = [
  {
    name: 'F-02 AC-020 an enabled flow section is kept and its markers are removed',
    template: 'A{{#enabled:a}}X{{/enabled:a}}B',
    expected: 'AXB',
  },
  {
    name: 'F-02 AC-020 an enabled block section inside a flow is kept',
    template: '{{#enabled:a1}}kept{{/enabled:a1}}',
    expected: 'kept',
  },
  {
    name: 'F-02 AC-020 a disabled block section is removed',
    template: 'A{{#enabled:a2}}X{{/enabled:a2}}B',
    expected: 'AB',
  },
  {
    name: 'F-02 AC-020 a disabled flow section is removed',
    template: 'A{{#enabled:b}}X{{/enabled:b}}B',
    expected: 'AB',
  },
  {
    name: 'F-02 AC-020 a block inside a disabled flow is not enabled, so its section is removed',
    template: 'A{{#enabled:b1}}X{{/enabled:b1}}B',
    expected: 'AB',
  },
  {
    name: 'F-02 AC-020 an id with no block or flow in the config is not enabled, so its section is removed',
    template: 'A{{#enabled:missing}}X{{/enabled:missing}}B',
    expected: 'AB',
  },
  {
    name: 'F-02 AC-020 an enabled and a disabled section side by side keep only the enabled one',
    template: '{{#enabled:a}}one{{/enabled:a}}{{#enabled:b}}two{{/enabled:b}}three',
    expected: 'onethree',
  },
  {
    name: 'F-02 AC-020 a placeholder inside an enabled section is replaced',
    template: '{{#enabled:a}}{{projectName}}{{/enabled:a}}',
    expected: 'My project',
  },
  {
    name: 'F-02 AC-020 a placeholder inside a disabled section is not checked, so it cannot fail',
    template: '{{#enabled:b}}{{stack.framework}}{{/enabled:b}}ok',
    expected: 'ok',
  },
  {
    name: 'F-02 AC-020 a template with no sections and no placeholders is returned unchanged',
    template: 'plain text\nwith two lines\n',
    expected: 'plain text\nwith two lines\n',
  },
];

describe('F-02 AC-020 enabled and disabled sections are kept or removed', () => {
  for (const row of sectionRows) {
    it(row.name, () => {
      const config = sectionConfig();
      const inputs = inputsFor({ 'base/file.md': row.template }, config);
      expect(renderTemplate('base/file.md', inputs)).toBe(row.expected);
    });
  }
});

describe('F-02 AC-021 a template path the TemplateSource does not hold fails with the path named', () => {
  it('F-02 AC-021 a missing template fails, naming its path', () => {
    const inputs = inputsFor({}, sectionConfig());
    expect(problemsOf(() => renderTemplate('base/missing.md', inputs))).toEqual([
      'template not found at "base/missing.md"',
    ]);
  });

  it('F-02 AC-021 a missing template among present ones fails, and no rendered files are returned', () => {
    const inputs = inputsFor({ 'base/one.md': 'one {{projectName}}', 'base/two.md': 'two' }, sectionConfig());
    // problemsOf returns an empty list when the call does not throw, so this also proves the call threw.
    expect(problemsOf(() => renderTemplates(['base/one.md', 'base/gone.md', 'base/two.md'], inputs))).toEqual([
      'template not found at "base/gone.md"',
    ]);
  });

  it('F-02 AC-021 a missing template and a template with a missing value are both reported', () => {
    const inputs = inputsFor({ 'base/bad.md': '{{nope}}' }, sectionConfig());
    expect(problemsOf(() => renderTemplates(['base/gone.md', 'base/bad.md'], inputs))).toEqual([
      'template not found at "base/gone.md"',
      'base/bad.md: no value for placeholder "{{nope}}"',
    ]);
  });
});

describe('F-02 AC-019 AC-020 every failure returns no files', () => {
  it('F-02 AC-019 AC-020 a call with one failing template throws, so the other templates are not returned', () => {
    const inputs = inputsFor({ 'base/good.md': 'good', 'base/bad.md': '{{nope}}' }, sectionConfig());
    expect(problemsOf(() => renderTemplates(['base/good.md', 'base/bad.md'], inputs))).toEqual([
      'base/bad.md: no value for placeholder "{{nope}}"',
    ]);
  });

  it('F-02 AC-019 AC-020 renders the same text twice from the same inputs', () => {
    const config = sectionConfig();
    const files = { 'base/file.md': '{{projectName}} {{#enabled:a}}a{{/enabled:a}}' };
    const first = renderTemplates(['base/file.md'], inputsFor(files, config));
    const second = renderTemplates(['base/file.md'], inputsFor(files, config));
    expect(second).toEqual(first);
    expect(first).toEqual([{ path: 'base/file.md', text: 'My project a' }]);
  });
});
