import { describe, expect, it } from 'vitest';
import { pipeline as core } from '@sddbuilder/core';
import { addFlowArgument, type ArgumentRow, type Pipeline, type Rule, type RowResult } from '../src/builder/fields.js';
import {
  addPipelineArgument,
  addPipelineRuleTag,
  editPipelineArgument,
  editPipelineField,
  removePipelineArgument,
  removePipelineRuleTag,
  type PipelineFieldEdit,
  type PipelineFieldResult,
} from '../src/builder/pipelineFields.js';

type Flow = core.Flow;
type Document = Record<string, unknown>;

// A flow with the required fields only; `next` is set only when given.
function flow(id: string, name: string = id, next?: string): Flow {
  const base: Flow = {
    index: 0,
    id,
    name,
    description: `The ${name} step.`,
    arguments: [],
    body: `Do the ${name} work.`,
    artifacts: [{ label: `${id}.md`, template: 'output.md' }],
    approval: true,
    blocks: [],
  };
  return next === undefined ? base : { ...base, next };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((item, index) => ({ ...item, index })),
  };
}

// Two connected flows: `plan` links to `build`, so no link problem is reported.
function linkedPipeline(): Pipeline {
  return pipelineOf(flow('plan', 'Plan', 'build'), flow('build', 'Build'));
}

function rule(id: string): Rule {
  return { index: 0, id, title: id, text: `The ${id} rule.` };
}

const RULES: readonly Rule[] = [rule('style'), rule('security')];

function row(id: string, overrides: Partial<ArgumentRow> = {}): ArgumentRow {
  return { id, required: false, hint: `The ${id} value.`, ...overrides };
}

function changed(result: PipelineFieldResult): Pipeline {
  if (!result.ok) throw new Error(`the edit was refused: ${result.reason}`);
  return result.pipeline;
}

function accepted(result: RowResult): Pipeline {
  if (!result.ok) throw new Error(`the edit was refused: ${result.reason}`);
  return result.pipeline;
}

function rowRefusal(result: RowResult): string {
  if (result.ok) throw new Error('the edit was accepted');
  return result.reason;
}

function fieldRefusal(result: PipelineFieldResult): { field: string; reason: string } {
  if (result.ok) throw new Error('the edit was accepted');
  return { field: result.field, reason: result.reason };
}

function edit(saved: Pipeline, fieldEdit: PipelineFieldEdit): PipelineFieldResult {
  return editPipelineField(saved, RULES, fieldEdit);
}

// The pipeline as the document holds it: the rows without their `index`, and each rule tag as its rule id.
function rowsOf(rows: readonly { readonly index: number }[]): Document[] {
  return rows.map(({ index: _index, ...item }) => item);
}

function documentOf(pipelineState: Pipeline): Document {
  const { flows, arguments: args, ruleTags, ...rest } = pipelineState;
  return {
    ...rest,
    arguments: rowsOf(args),
    ...(ruleTags === undefined ? {} : { ruleTags: ruleTags.map((tag) => tag.ruleId) }),
    flows: flows.map(({ index: _index, arguments: flowArgs, ruleTags: flowTags, ...item }) => ({
      ...item,
      arguments: rowsOf(flowArgs),
      ...(flowTags === undefined ? {} : { ruleTags: flowTags.map((tag) => tag.ruleId) }),
    })),
  };
}

const RULE_DOCUMENTS = RULES.map(({ id, title, text }) => ({ id, title, text }));

// The parser's message at `path` for a pipeline document. Used to prove that a refusal carries the parser's
// wording and not a wording of the builder's own.
function reasonAt(document: Document, path: string): string {
  const parsed = core.parseProjectConfig({ schemaVersion: 2, rules: RULE_DOCUMENTS, pipeline: document });
  if (parsed.ok) throw new Error('the parser accepted the document');
  const found = parsed.problems.find((problem) => problem.path === path);
  if (found === undefined) throw new Error(`the parser gave no problem at ${path}`);
  return found.message;
}

describe('F-11 AC-045 the pipeline name is trimmed, required and at most 100 characters', () => {
  it('stores the trimmed name and keeps every other pipeline value', () => {
    const saved = linkedPipeline();
    const next = changed(edit(saved, { field: 'name', value: '  SDD process  ' }));
    expect(next).toEqual({ ...saved, name: 'SDD process' });
  });

  it('refuses a blank name with the parser reason and keeps the saved name', () => {
    const saved = linkedPipeline();
    const result = fieldRefusal(edit(saved, { field: 'name', value: '   ' }));
    expect(result).toEqual({ field: 'name', reason: reasonAt({ ...documentOf(saved), name: '' }, 'pipeline.name') });
    expect(saved.name).toBe('Demo');
  });

  it('accepts a name of 100 characters and refuses 101 with the parser reason', () => {
    const saved = linkedPipeline();
    expect(changed(edit(saved, { field: 'name', value: 'n'.repeat(100) })).name).toHaveLength(100);
    const refused = fieldRefusal(edit(saved, { field: 'name', value: 'n'.repeat(101) }));
    expect(refused).toEqual({
      field: 'name',
      reason: reasonAt({ ...documentOf(saved), name: 'n'.repeat(101) }, 'pipeline.name'),
    });
  });
});

describe('F-11 AC-045 the pipeline description is text of at most 1000 characters', () => {
  it('accepts a description of 1000 characters and refuses 1001 with the parser reason', () => {
    const saved = linkedPipeline();
    expect(changed(edit(saved, { field: 'description', value: 'd'.repeat(1000) })).description).toHaveLength(1000);
    const refused = fieldRefusal(edit(saved, { field: 'description', value: 'd'.repeat(1001) }));
    expect(refused).toEqual({
      field: 'description',
      reason: reasonAt({ ...documentOf(saved), description: 'd'.repeat(1001) }, 'pipeline.description'),
    });
    expect(saved.description).toBe('A demo pipeline.');
  });

  it('accepts an empty description, which the parser allows, and stores it', () => {
    expect(changed(edit(linkedPipeline(), { field: 'description', value: '' })).description).toBe('');
  });
});

describe('F-11 AC-045 the pipeline model is haiku, sonnet, opus, inherit or unset', () => {
  it.each(['haiku', 'sonnet', 'opus', 'inherit'] as const)('stores the model %s', (model) => {
    expect(changed(edit(linkedPipeline(), { field: 'model', value: model })).model).toBe(model);
  });

  it('unsets the model when the value is undefined', () => {
    const saved = { ...linkedPipeline(), model: 'opus' as const };
    const next = changed(edit(saved, { field: 'model', value: undefined }));
    expect(next).not.toHaveProperty('model');
    expect(next.flows).toEqual(saved.flows);
  });

  it('refuses a model that is not one of the four with the parser reason and keeps the saved model', () => {
    const saved = { ...linkedPipeline(), model: 'haiku' as const };
    const refused = fieldRefusal(edit(saved, { field: 'model', value: 'gpt' }));
    expect(refused).toEqual({
      field: 'model',
      reason: reasonAt({ ...documentOf(saved), model: 'gpt' }, 'pipeline.model'),
    });
    expect(saved.model).toBe('haiku');
  });
});

describe('F-11 AC-045 the pipeline tools are a comma-separated list, each item at most 100 characters', () => {
  it('splits the typed text on commas, trims each item and leaves out empty items', () => {
    const next = changed(edit(linkedPipeline(), { field: 'tools', value: ' Read, Write ,, Edit, Bash ' }));
    expect(next.tools).toEqual(['Read', 'Write', 'Edit', 'Bash']);
  });

  it('stores an empty list when the text holds no item', () => {
    expect(changed(edit(linkedPipeline(), { field: 'tools', value: ' , ' })).tools).toEqual([]);
  });

  it('refuses an item of 101 characters with the parser reason at that item, and keeps the saved tools', () => {
    const saved = { ...linkedPipeline(), tools: ['Read'] };
    const long = 't'.repeat(101);
    const refused = fieldRefusal(edit(saved, { field: 'tools', value: `Read, ${long}` }));
    expect(refused).toEqual({
      field: 'tools',
      reason: reasonAt({ ...documentOf(saved), tools: ['Read', long] }, 'pipeline.tools.1'),
    });
    expect(saved.tools).toEqual(['Read']);
  });
});

describe('F-11 AC-044 the pipeline body is optional, may be empty, and at most 1000 code points', () => {
  it('accepts an empty body', () => {
    expect(changed(edit(linkedPipeline(), { field: 'body', value: '' })).body).toBe('');
  });

  it('counts code points, not UTF-16 units: 1000 emoji are accepted and 1001 are refused', () => {
    const saved = linkedPipeline();
    const emoji = '\u{1F600}';
    expect(changed(edit(saved, { field: 'body', value: emoji.repeat(1000) })).body).toBe(emoji.repeat(1000));
    const refused = fieldRefusal(edit(saved, { field: 'body', value: emoji.repeat(1001) }));
    expect(refused).toEqual({
      field: 'body',
      reason: reasonAt({ ...documentOf(saved), body: emoji.repeat(1001) }, 'pipeline.body'),
    });
  });

  it('keeps the saved body when a body of 1001 characters is refused', () => {
    const saved = { ...linkedPipeline(), body: 'Runs the feature.' };
    const result = edit(saved, { field: 'body', value: 'x'.repeat(1001) });
    expect(result.ok).toBe(false);
    expect(saved.body).toBe('Runs the feature.');
  });
});

describe('F-11 AC-028 every pipeline field edit goes through the parser and touches only its field', () => {
  it('leaves the flows and the other fields as they were when an edit is accepted', () => {
    const saved: Pipeline = { ...linkedPipeline(), model: 'sonnet', body: 'Runs.' };
    const next = changed(edit(saved, { field: 'description', value: 'Changed.' }));
    expect(next).toEqual({ ...saved, description: 'Changed.' });
  });

  it('never changes the input pipeline, whether the edit is accepted or refused', () => {
    const saved = { ...linkedPipeline(), tools: ['Read'], model: 'opus' as const };
    const snapshot = structuredClone(saved);
    edit(saved, { field: 'name', value: 'Renamed' });
    edit(saved, { field: 'name', value: '' });
    edit(saved, { field: 'body', value: 'x'.repeat(1001) });
    edit(saved, { field: 'tools', value: 'x'.repeat(101) });
    edit(saved, { field: 'model', value: 'gpt' });
    expect(saved).toEqual(snapshot);
  });
});

describe('F-11 AC-043 the pipeline arguments are rows: add, edit and remove each row on its own', () => {
  it('appends a row after the saved ones, keeping its index as its position', () => {
    const first = accepted(addPipelineArgument(linkedPipeline(), RULES, row('topic', { required: true })));
    const second = accepted(addPipelineArgument(first, RULES, row('depth')));
    expect(second.arguments).toEqual([
      { index: 0, id: 'topic', required: true, hint: 'The topic value.' },
      { index: 1, id: 'depth', required: false, hint: 'The depth value.' },
    ]);
    expect(second.flows).toEqual(linkedPipeline().flows);
  });

  it.each(['Topic', 'my topic', '1topic', 'topic_name', '-topic', ''])(
    'refuses the file-unsafe id %j with the parser reason and adds no row',
    (id) => {
      const saved = linkedPipeline();
      const reason = rowRefusal(addPipelineArgument(saved, RULES, row(id)));
      expect(reason).toBe(reasonAt({ ...documentOf(saved), arguments: [{ ...row(id) }] }, 'pipeline.arguments.0.id'));
      expect(saved.arguments).toEqual([]);
    },
  );

  it('refuses a hint of 101 characters with the parser reason', () => {
    const saved = linkedPipeline();
    const hint = 'h'.repeat(101);
    const reason = rowRefusal(addPipelineArgument(saved, RULES, row('topic', { hint })));
    expect(reason).toBe(
      reasonAt(
        { ...documentOf(saved), arguments: [{ id: 'topic', required: false, hint }] },
        'pipeline.arguments.0.hint',
      ),
    );
  });

  it('accepts a hint of exactly 100 characters', () => {
    const hint = 'h'.repeat(100);
    const next = accepted(addPipelineArgument(linkedPipeline(), RULES, row('topic', { hint })));
    expect(next.arguments[0]?.hint).toBe(hint);
  });

  it('refuses an id that a flow argument of the project already has, since the ids share one pool', () => {
    const saved = accepted(addFlowArgument(linkedPipeline(), RULES, 'plan', row('topic')));
    const reason = rowRefusal(addPipelineArgument(saved, RULES, row('topic')));
    expect(reason).toBe(
      reasonAt(
        {
          ...documentOf(saved),
          arguments: [{ id: 'topic', required: false, hint: 'The topic value.' }],
        },
        'pipeline.flows.0.arguments.0.id',
      ),
    );
    expect(saved.arguments).toEqual([]);
  });

  it('edits one row and a refused edit keeps the saved row with the parser reason', () => {
    const first = accepted(addPipelineArgument(linkedPipeline(), RULES, row('topic')));
    const second = accepted(addPipelineArgument(first, RULES, row('depth')));
    const edited = accepted(editPipelineArgument(second, RULES, 1, row('depth', { required: true })));
    expect(edited.arguments[1]).toEqual({ index: 1, id: 'depth', required: true, hint: 'The depth value.' });
    expect(edited.arguments[0]).toEqual(second.arguments[0]);

    const reason = rowRefusal(editPipelineArgument(second, RULES, 1, row('topic')));
    expect(reason).toBe(
      reasonAt(
        {
          ...documentOf(second),
          arguments: [
            { id: 'topic', required: false, hint: 'The topic value.' },
            { id: 'topic', required: false, hint: 'The depth value.' },
          ],
        },
        'pipeline.arguments.1.id',
      ),
    );
    expect(second.arguments[1]?.id).toBe('depth');
  });

  it('removes one row and renumbers the rows after it', () => {
    const first = accepted(addPipelineArgument(linkedPipeline(), RULES, row('topic')));
    const second = accepted(addPipelineArgument(first, RULES, row('depth')));
    const third = accepted(addPipelineArgument(second, RULES, row('scope')));
    const removed = removePipelineArgument(third, 0);
    expect(removed.arguments).toEqual([
      { index: 0, id: 'depth', required: false, hint: 'The depth value.' },
      { index: 1, id: 'scope', required: false, hint: 'The scope value.' },
    ]);
  });

  it('throws a programmer error for an argument row the pipeline does not have', () => {
    expect(() => editPipelineArgument(linkedPipeline(), RULES, 0, row('topic'))).toThrow(
      'F-11: the pipeline has no argument row 0',
    );
    expect(() => removePipelineArgument(linkedPipeline(), 0)).toThrow('F-11: the pipeline has no argument row 0');
  });
});

describe('F-11 AC-045 the pipeline rule tags are rows: a rule of the project is added, any other is refused', () => {
  it('adds a rule of the Technical details step as a tag with its position', () => {
    const next = accepted(addPipelineRuleTag(linkedPipeline(), RULES, 'style'));
    expect(next.ruleTags).toEqual([{ index: 0, ruleId: 'style' }]);
  });

  it('refuses a tag that names no rule of the project with the parser reason and stores nothing', () => {
    const saved = linkedPipeline();
    const reason = rowRefusal(addPipelineRuleTag(saved, RULES, 'missing'));
    expect(reason).toBe(reasonAt({ ...documentOf(saved), ruleTags: ['missing'] }, 'pipeline.ruleTags.0'));
    expect(saved.ruleTags).toBeUndefined();
  });

  it('refuses a tag the pipeline already has with the parser reason', () => {
    const saved = accepted(addPipelineRuleTag(linkedPipeline(), RULES, 'style'));
    const reason = rowRefusal(addPipelineRuleTag(saved, RULES, 'style'));
    expect(reason).toBe(reasonAt({ ...documentOf(saved), ruleTags: ['style', 'style'] }, 'pipeline.ruleTags.1'));
    expect(saved.ruleTags).toHaveLength(1);
  });

  it('removes one tag on its own and renumbers the tags after it', () => {
    const first = accepted(addPipelineRuleTag(linkedPipeline(), RULES, 'style'));
    const second = accepted(addPipelineRuleTag(first, RULES, 'security'));
    expect(removePipelineRuleTag(second, 0).ruleTags).toEqual([{ index: 0, ruleId: 'security' }]);
  });

  it('throws a programmer error for a tag row the pipeline does not have', () => {
    expect(() => removePipelineRuleTag(linkedPipeline(), 0)).toThrow('F-11: the pipeline has no rule tag row 0');
  });
});
