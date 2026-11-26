import { describe, expect, it } from 'vitest';
import type { Argument, Flow, Pipeline } from '../../src/pipeline/model.js';
import { renderLayout } from '../../src/pipeline/generate/render.js';
import { pipelineValues } from '../../src/pipeline/generate/values-pipeline.js';
import { validConfig } from './analyze-fixture.js';
import { readLayout } from './layouts-loader.js';

const LAYOUT_PATH = 'claude-code/pipeline.md';
const DESCRIPTION_LINE = 'description: "One flow that builds the project."';
const STOP = "Stop and wait for the person's approval before the next flow.";
const STOP_LAST = "Stop and wait for the person's approval at the end of the process.";

// The real layout of `source/templates/claude-code/pipeline.md`, rendered with the real values of the pipeline.
function render(pipeline: Pipeline): string {
  return renderLayout(readLayout(LAYOUT_PATH), pipelineValues(pipeline), LAYOUT_PATH);
}

function argument(index: number, id: string, required: boolean, hint = ''): Argument {
  return { index, id, required, hint };
}

function flow(overrides: Partial<Flow> & Pick<Flow, 'id' | 'index'>): Flow {
  return {
    name: overrides.id,
    arguments: [],
    body: '',
    artifacts: [],
    approval: false,
    blocks: [],
    ...overrides,
  };
}

// The valid one-flow fixture with its pipeline changed by `change`; every other part is kept.
function pipelineWith(change: Partial<Pipeline>): Pipeline {
  return { ...validConfig().pipeline, ...change };
}

// The numbered steps of a rendered command, in the order they are written.
function numberedSteps(text: string): string[] {
  return text.split('\n').filter((line) => /^\d+\. /.test(line));
}

describe('F-05 layouts: the pipeline command layout', () => {
  it('F-05 AC-001 writes the pipeline title, and its arguments each with the id, the required flag and the hint', () => {
    const text = render(
      pipelineWith({
        name: 'SDD process',
        arguments: [argument(0, 'a56aab15-5743-5847-9b77-b39b2124c91b', true, 'F-XX'), argument(1, '80398aba-a45b-51b8-971a-54782c4bdfde', false)],
      }),
    );
    expect(text.startsWith(`---\n${DESCRIPTION_LINE}\n---\n\n# SDD process\n`)).toBe(true);
    expect(text).toContain('## Arguments\n- `a56aab15-5743-5847-9b77-b39b2124c91b` (required, F-XX)\n- `80398aba-a45b-51b8-971a-54782c4bdfde` (optional)\n\n## Flows');
  });

  it('F-05 AC-001 writes No arguments as a line under the Arguments heading when the pipeline has none', () => {
    expect(render(validConfig().pipeline)).toBe(
      [
        '---',
        DESCRIPTION_LINE,
        '---',
        '',
        '# Build pipeline',
        '',
        '## Purpose',
        '',
        'One flow that builds the project.',
        '',
        '## Arguments',
        'No arguments',
        '',
        '## Flows',
        '1. Flow `ea365500-e6ec-5064-90ea-fb6cc4bb49d6`.',
        '',
      ].join('\n'),
    );
  });

  it('F-05 AC-002 lists every flow as a numbered step, in pipeline order, each named by its id', () => {
    const specify = flow({
      index: 0,
      id: '52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a',
      description: 'Drafts the stories.',
      approval: true,
      next: '27dba559-bf5f-5712-9ba3-76efb3122ede',
    });
    const ux = flow({ index: 1, id: '27dba559-bf5f-5712-9ba3-76efb3122ede', description: 'Draws the screens.', next: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' });
    const plan = flow({ index: 2, id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' });
    const text = render(pipelineWith({ flows: [specify, ux, plan] }));
    expect(numberedSteps(text)).toEqual([
      '1. Flow `52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a`: Drafts the stories.',
      `2. ${STOP}`,
      '3. Flow `27dba559-bf5f-5712-9ba3-76efb3122ede`: Draws the screens.',
      '4. Flow `fc358416-c66a-5fef-9c5e-a282b75cbd92`.',
    ]);
  });

  it('F-05 AC-003 adds a numbered stop step after a flow with approval on, worded for the end of the process when it is the last flow', () => {
    const approved = flow({ index: 0, id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6', approval: true });
    const text = render(pipelineWith({ flows: [approved] }));
    expect(numberedSteps(text)).toEqual(['1. Flow `ea365500-e6ec-5064-90ea-fb6cc4bb49d6`.', `2. ${STOP_LAST}`]);
  });

  it('F-05 AC-002 lists the flows in the order of the next links when the array lists them out of that order', () => {
    const build = flow({ index: 0, id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' });
    const specify = flow({ index: 1, id: '52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', description: 'Drafts the stories.', next: '27dba559-bf5f-5712-9ba3-76efb3122ede' });
    const ux = flow({ index: 2, id: '27dba559-bf5f-5712-9ba3-76efb3122ede', description: 'Draws the screens.', next: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' });
    const text = render(pipelineWith({ flows: [build, specify, ux] }));
    expect(numberedSteps(text)).toEqual([
      '1. Flow `52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a`: Drafts the stories.',
      '2. Flow `27dba559-bf5f-5712-9ba3-76efb3122ede`: Draws the screens.',
      '3. Flow `ea365500-e6ec-5064-90ea-fb6cc4bb49d6`.',
    ]);
  });

  it('F-05 AC-003 gives the end-of-process stop to the last flow of the next links, not the last flow of the array', () => {
    const build = flow({ index: 0, id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6', approval: true });
    const plan = flow({ index: 1, id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92', approval: true, next: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' });
    const text = render(pipelineWith({ flows: [build, plan] }));
    expect(numberedSteps(text)).toEqual(['1. Flow `fc358416-c66a-5fef-9c5e-a282b75cbd92`.', `2. ${STOP}`, '3. Flow `ea365500-e6ec-5064-90ea-fb6cc4bb49d6`.', `4. ${STOP_LAST}`]);
  });

  it('F-05 AC-003 numbers the stop step of each approved flow after that flow, and writes no stop step for the others', () => {
    const first = flow({ index: 0, id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92', approval: true, next: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' });
    const second = flow({ index: 1, id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6', approval: false, next: 'b856df1d-a407-5fdf-9694-e743d3a9770a' });
    const third = flow({ index: 2, id: 'b856df1d-a407-5fdf-9694-e743d3a9770a', approval: true });
    const text = render(pipelineWith({ flows: [first, second, third] }));
    expect(numberedSteps(text)).toEqual([
      '1. Flow `fc358416-c66a-5fef-9c5e-a282b75cbd92`.',
      `2. ${STOP}`,
      '3. Flow `ea365500-e6ec-5064-90ea-fb6cc4bb49d6`.',
      '4. Flow `b856df1d-a407-5fdf-9694-e743d3a9770a`.',
      `5. ${STOP_LAST}`,
    ]);
  });

  it('F-05 AC-003 adds no stop step to a flow with approval off', () => {
    const text = render(validConfig().pipeline);
    expect(numberedSteps(text)).toEqual(['1. Flow `ea365500-e6ec-5064-90ea-fb6cc4bb49d6`.']);
    expect(text).not.toContain(STOP);
  });

  it('F-05 AC-004 renders a one-flow pipeline with one flow step and no approval step, without failing', () => {
    const single = flow({ index: 0, id: '9cc81eb2-f7c6-591c-b23b-1a7dbec9ee0e', description: 'The only flow.' });
    const text = render(pipelineWith({ flows: [single] }));
    expect(numberedSteps(text)).toEqual(['1. Flow `9cc81eb2-f7c6-591c-b23b-1a7dbec9ee0e`: The only flow.']);
    expect(text).not.toContain(STOP);
  });

  it('F-05 AC-004 renders a one-flow pipeline with approval on as one flow step and one stop step', () => {
    const single = flow({ index: 0, id: '9cc81eb2-f7c6-591c-b23b-1a7dbec9ee0e', approval: true });
    const steps = numberedSteps(render(pipelineWith({ flows: [single] })));
    expect(steps.filter((step) => step.includes('Flow `'))).toHaveLength(1);
    expect(steps).toEqual(['1. Flow `9cc81eb2-f7c6-591c-b23b-1a7dbec9ee0e`.', `2. ${STOP_LAST}`]);
  });

  it('F-05 AC-005 writes no model or tools line when the pipeline sets neither', () => {
    const text = render(validConfig().pipeline);
    expect(text.split('\n').slice(0, 3)).toEqual(['---', DESCRIPTION_LINE, '---']);
    expect(text).not.toContain('model:');
    expect(text).not.toContain('tools:');
  });

  it('F-05 AC-005 writes the model line in the frontmatter when the pipeline sets a model', () => {
    const text = render(pipelineWith({ model: 'opus' }));
    expect(text.split('\n').slice(0, 4)).toEqual(['---', DESCRIPTION_LINE, 'model: opus', '---']);
    expect(text).not.toContain('tools:');
  });

  it('F-05 AC-005 writes the tools line in the frontmatter when the pipeline sets tools, and none for an empty list', () => {
    const text = render(pipelineWith({ tools: ['Read', 'Write'] }));
    expect(text.split('\n').slice(0, 4)).toEqual(['---', DESCRIPTION_LINE, 'tools: Read, Write', '---']);
    expect(text).not.toContain('model:');
    expect(render(pipelineWith({ tools: [] }))).not.toContain('tools:');
  });

  it('F-05 AC-005 writes the tools as one quoted YAML string when a tool name would break the frontmatter', () => {
    const text = render(pipelineWith({ tools: ['Read', 'Bash(git: *)'] }));
    expect(text.split('\n').slice(0, 4)).toEqual(['---', DESCRIPTION_LINE, 'tools: "Read, Bash(git: *)"', '---']);
  });

  it('F-05 AC-005 writes the model and the tools together when both are set', () => {
    const text = render(pipelineWith({ model: 'sonnet', tools: ['Bash'] }));
    expect(text.split('\n').slice(0, 5)).toEqual(['---', DESCRIPTION_LINE, 'model: sonnet', 'tools: Bash', '---']);
  });

  it('F-05 AC-005 writes the body under Purpose only when the pipeline has a body', () => {
    const withBody = render(pipelineWith({ body: 'Runs the whole process for one feature.' }));
    expect(withBody).toContain(
      '## Purpose\n\nOne flow that builds the project.\n\nRuns the whole process for one feature.\n\n## Arguments',
    );
    const withoutBody = render(validConfig().pipeline);
    expect(withoutBody).toContain('## Purpose\n\nOne flow that builds the project.\n\n## Arguments');
  });

  it('F-05 AC-005 writes no body paragraph when the body is only blank lines', () => {
    const blank = render(pipelineWith({ body: '  \n\t\n' }));
    expect(blank).toContain('## Purpose\n\nOne flow that builds the project.\n\n## Arguments');
  });

  it('F-05 AC-005 writes the description in the frontmatter as a quoted YAML string, and plain under Purpose', () => {
    const text = render(pipelineWith({ description: 'Builds "the" C:\\path: one\nflow.' }));
    expect(text.split('\n').slice(0, 3)).toEqual(['---', 'description: "Builds \\"the\\" C:\\\\path: one flow."', '---']);
    expect(text).toContain('## Purpose\n\nBuilds "the" C:\\path: one flow.\n\n## Arguments');
  });
});
