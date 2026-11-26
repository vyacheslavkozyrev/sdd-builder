import { describe, expect, it } from 'vitest';
import { pipeline as core } from '@sddbuilder/core';
import {
  addFlowArgument,
  addFlowArtifact,
  addFlowRuleTag,
  editFlowArgument,
  editFlowField,
  removeFlowArgument,
  removeFlowRuleTag,
  setFlowApproval,
} from '../src/builder/fields.js';
import type { ArgumentRow, Pipeline, Rule, RowResult } from '../src/builder/fields.js';

type Flow = core.Flow;
type Argument = core.Argument;

// A flow with the required fields only, and the arguments and rule tags given.
function flow(id: string, name: string = id, next?: string): Flow {
  const base: Flow = {
    index: 0,
    id,
    name,
    description: `The ${name} step.`,
    arguments: [],
    body: `Do the ${name} work.`,
    artifacts: [{ label: `${name.toLowerCase()}.md`, template: 'output.md' }],
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
  return pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'Plan', 'a0c3aad4-8765-5b23-8df5-7c03d481233c'), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c', 'Build'));
}

// A project rule as the Technical details step gives it: its id, title and text.
function rule(id: string): Rule {
  return { index: 0, id, title: id, text: `The ${id} rule.` };
}

const RULES: readonly Rule[] = [rule('0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc'), rule('5d1d8905-7a0e-5281-b85f-92d26b3a346b')];

function row(id: string, overrides: Partial<ArgumentRow> = {}): ArgumentRow {
  return { id, required: false, hint: 'The value.', ...overrides };
}

// The flow `id` of a pipeline, read after a change that must have been accepted.
function flowOf(pipelineState: Pipeline, id: string): Flow {
  const found = pipelineState.flows.find((item) => item.id === id);
  if (found === undefined) throw new Error(`no flow ${id}`);
  return found;
}

function accepted(result: RowResult): Pipeline {
  if (!result.ok) throw new Error(`the edit was refused: ${result.reason}`);
  return result.pipeline;
}

// The parser's message at `path` for a pipeline, written as the document holds it. Used to prove that a
// refusal names the parser's message and not a wording of the builder's own.
function parserReason(pipelineState: Pipeline, path: string, rules: readonly Rule[] = RULES): string {
  const document = {
    schemaVersion: 2,
    rules: rules.map(({ id, title, text }) => ({ id, title, text })),
    pipeline: {
      name: pipelineState.name,
      description: pipelineState.description,
      arguments: [],
      flows: pipelineState.flows.map(({ index: _index, ...item }) => ({
        ...item,
        arguments: item.arguments.map(({ index: _rowIndex, ...argument }) => argument),
        ...(item.ruleTags === undefined ? {} : { ruleTags: item.ruleTags.map((tag) => tag.ruleId) }),
      })),
    },
  };
  const parsed = core.parseProjectConfig(document);
  if (parsed.ok) throw new Error('the parser accepted the document');
  const found = parsed.problems.find((problem) => problem.path === path);
  if (found === undefined) throw new Error(`the parser gave no problem at ${path}`);
  return found.message;
}

describe('F-11 AC-024 flow argument rows: add appends a row with an id, a required flag and a hint', () => {
  it('appends the row after the saved ones, keeping its index as its position', () => {
    const first = accepted(addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038', { required: true })));
    const second = accepted(addFlowArgument(first, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6669861-3c54-5758-b031-ec6a8d50ffe2')));
    expect(flowOf(second, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments).toEqual<Argument[]>([
      { index: 0, id: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038', required: true, hint: 'The value.' },
      { index: 1, id: 'f6669861-3c54-5758-b031-ec6a8d50ffe2', required: false, hint: 'The value.' },
    ]);
  });

  it('accepts an empty hint, since the hint is optional text of at most 100 characters', () => {
    const result = addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038', { hint: '' }));
    expect(result).toMatchObject({ ok: true });
  });

  it.each(['Topic', 'my topic', '1topic', 'topic_name', 'topic/name', '-topic', ''])(
    'refuses the id %j, which is not a GUID, with the parser reason and adds no row',
    (id) => {
      const saved = linkedPipeline();
      const result = addFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row(id));
      expect(result).toEqual({
        ok: false,
        reason: 'must be a GUID',
      });
      expect(flowOf(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments).toEqual([]);
    },
  );

  it('refuses an id that another row of the same flow already has, at the later row', () => {
    const saved = accepted(addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038')));
    const result = addFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038', { required: true }));
    expect(result).toEqual({
      ok: false,
      reason: 'must be unique: the id f6e48fc8-29f2-5a26-9b01-9d90e8d52038 is already used at pipeline.flows.0.arguments.0.id',
    });
    expect(flowOf(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments).toHaveLength(1);
  });

  it('refuses an id that a flow id of the project already has (the parser keeps ids unique project-wide)', () => {
    const result = addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('a0c3aad4-8765-5b23-8df5-7c03d481233c'));
    expect(result).toEqual({
      ok: false,
      reason: 'must be unique: the id a0c3aad4-8765-5b23-8df5-7c03d481233c is also used at pipeline.flows.1.id',
    });
  });

  it('refuses an id that a rule of the project already has', () => {
    const result = addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc'));
    expect(result).toEqual({
      ok: false,
      reason: 'must be unique: the id 0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc is already used at rules.0.id',
    });
  });

  it('accepts a hint of exactly 100 characters and refuses 101, with the parser reason', () => {
    expect(addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038', { hint: 'x'.repeat(100) }))).toMatchObject({
      ok: true,
    });
    const saved = linkedPipeline();
    const result = addFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038', { hint: 'x'.repeat(101) }));
    expect(result).toEqual({ ok: false, reason: 'must be at most 100 characters' });
    expect(flowOf(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments).toEqual([]);
  });

  it('counts a hint in code points, so 100 emoji are accepted and 101 are refused', () => {
    expect(addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038', { hint: '😀'.repeat(100) }))).toMatchObject({
      ok: true,
    });
    expect(addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038', { hint: '😀'.repeat(101) }))).toEqual({
      ok: false,
      reason: 'must be at most 100 characters',
    });
  });

  it('never changes the input pipeline, whether the add is accepted or refused', () => {
    const saved = accepted(addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038')));
    const snapshot = structuredClone(saved);
    addFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038'));
    addFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6669861-3c54-5758-b031-ec6a8d50ffe2'));
    expect(saved).toEqual(snapshot);
  });

  it('throws for a flow id that is not in the pipeline, as a programmer error', () => {
    expect(() => addFlowArgument(linkedPipeline(), RULES, '083d3886-6635-54c4-bd03-441c22610371', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038'))).toThrow(
      'F-11: the pipeline has no flow "083d3886-6635-54c4-bd03-441c22610371"',
    );
  });
});

describe('F-11 AC-024 flow argument rows: edit changes one row and a refused edit keeps the saved row', () => {
  function withTwoRows(): Pipeline {
    const once = accepted(addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038')));
    return accepted(addFlowArgument(once, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6669861-3c54-5758-b031-ec6a8d50ffe2')));
  }

  it('replaces only the edited row and keeps the others', () => {
    const saved = withTwoRows();
    const result = accepted(
      editFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 1, row('c71781e4-d9c6-5781-815e-b9b8506f6c37', { required: true, hint: 'Level.' })),
    );
    expect(flowOf(result, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments).toEqual<Argument[]>([
      { index: 0, id: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038', required: false, hint: 'The value.' },
      { index: 1, id: 'c71781e4-d9c6-5781-815e-b9b8506f6c37', required: true, hint: 'Level.' },
    ]);
  });

  it('accepts an edit that keeps the row own id', () => {
    const saved = withTwoRows();
    const result = editFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 0, row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038', { hint: 'Changed.' }));
    expect(result).toMatchObject({ ok: true });
  });

  it('refuses an edit to a file-unsafe id, keeps the saved row, and gives the parser reason', () => {
    const saved = withTwoRows();
    const result = editFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 0, row('Topic'));
    expect(result).toEqual({
      ok: false,
      reason: 'must be a GUID',
    });
    expect(flowOf(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments[0]).toEqual({
      index: 0,
      id: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038',
      required: false,
      hint: 'The value.',
    });
  });

  it('refuses an edit to an id that the other row has, at the edited row', () => {
    const saved = withTwoRows();
    const result = editFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 1, row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038'));
    expect(result).toEqual({
      ok: false,
      reason: 'must be unique: the id f6e48fc8-29f2-5a26-9b01-9d90e8d52038 is already used at pipeline.flows.0.arguments.0.id',
    });
    expect(flowOf(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments[1]?.id).toBe('f6669861-3c54-5758-b031-ec6a8d50ffe2');
  });

  it('F-11 AC-024 refuses an edit to the id of a later row, and keeps the saved row (F-16 T015 clash scope)', () => {
    const saved = withTwoRows();
    const result = editFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 0, row('f6669861-3c54-5758-b031-ec6a8d50ffe2'));
    expect(result).toMatchObject({ ok: false });
    expect(result).toMatchObject({ reason: expect.stringMatching(/^must be unique: the id f6669861-3c54-5758-b031-ec6a8d50ffe2 is /) });
    expect(flowOf(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments[0]?.id).toBe('f6e48fc8-29f2-5a26-9b01-9d90e8d52038');
  });

  it('refuses a hint of 101 characters and keeps the saved hint', () => {
    const saved = withTwoRows();
    const result = editFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 0, row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038', { hint: 'x'.repeat(101) }));
    expect(result).toEqual({ ok: false, reason: 'must be at most 100 characters' });
    expect(flowOf(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments[0]?.hint).toBe('The value.');
  });

  it('gives the parser reason for the refusal, as the parser words it for that row', () => {
    const saved = withTwoRows();
    const result = editFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 1, row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038'));
    if (result.ok) throw new Error('the edit should be refused');
    // The copy the edit builds: row 1 takes the id `topic`, which row 0 already has.
    const copy: Pipeline = {
      ...saved,
      flows: saved.flows.map((item) =>
        item.id === 'ea3211a4-b64b-5204-9451-6fe12fd7c655'
          ? {
              ...item,
              arguments: [
                ...item.arguments.slice(0, 1),
                { index: 1, id: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038', required: false, hint: 'The value.' },
              ],
            }
          : item,
      ),
    };
    expect(result.reason).toBe(parserReason(copy, 'pipeline.flows.0.arguments.1.id'));
  });

  it('throws for a row that does not exist, as a programmer error', () => {
    expect(() => editFlowArgument(withTwoRows(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 2, row('eba2b431-0c8f-54bb-b072-e6ce9d4525a1'))).toThrow(
      'F-11: the flow "ea3211a4-b64b-5204-9451-6fe12fd7c655" has no argument row 2',
    );
  });
});

describe('F-11 AC-024 flow argument rows: remove takes out one row on its own', () => {
  it('removes only the given row and renumbers the rows after it', () => {
    let saved = linkedPipeline();
    for (const id of ['f6e48fc8-29f2-5a26-9b01-9d90e8d52038', 'f6669861-3c54-5758-b031-ec6a8d50ffe2', 'c71781e4-d9c6-5781-815e-b9b8506f6c37']) saved = accepted(addFlowArgument(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row(id)));
    const result = removeFlowArgument(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 0);
    expect(flowOf(result, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments).toEqual<Argument[]>([
      { index: 0, id: 'f6669861-3c54-5758-b031-ec6a8d50ffe2', required: false, hint: 'The value.' },
      { index: 1, id: 'c71781e4-d9c6-5781-815e-b9b8506f6c37', required: false, hint: 'The value.' },
    ]);
  });

  it('removes the last row, leaving the others as they were', () => {
    const once = accepted(addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038')));
    const twice = accepted(addFlowArgument(once, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6669861-3c54-5758-b031-ec6a8d50ffe2')));
    expect(flowOf(removeFlowArgument(twice, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 1), 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments).toEqual<Argument[]>([
      { index: 0, id: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038', required: false, hint: 'The value.' },
    ]);
  });

  it('never changes the input pipeline', () => {
    const saved = accepted(addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038')));
    const snapshot = structuredClone(saved);
    removeFlowArgument(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 0);
    expect(saved).toEqual(snapshot);
  });

  it('throws for a row that does not exist, as a programmer error', () => {
    expect(() => removeFlowArgument(linkedPipeline(), 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 0)).toThrow(
      'F-11: the flow "ea3211a4-b64b-5204-9451-6fe12fd7c655" has no argument row 0',
    );
  });
});

describe('F-11 AC-026 rule tag rows: add stores a rule of the Technical details step, and refuses any other', () => {
  it('stores the chosen rule id as a tag and keeps the order of the tags', () => {
    const once = accepted(addFlowRuleTag(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc'));
    const twice = accepted(addFlowRuleTag(once, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '5d1d8905-7a0e-5281-b85f-92d26b3a346b'));
    expect(flowOf(twice, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').ruleTags).toEqual([
      { index: 0, ruleId: '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc' },
      { index: 1, ruleId: '5d1d8905-7a0e-5281-b85f-92d26b3a346b' },
    ]);
  });

  it('refuses a tag that is not a rule of the Technical details step, and stores nothing', () => {
    const saved = linkedPipeline();
    const result = addFlowRuleTag(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '7dc596a9-1390-5056-b6bb-03e37f304a86');
    expect(result).toEqual({ ok: false, reason: 'must name a rule of this project, got 7dc596a9-1390-5056-b6bb-03e37f304a86' });
    expect(flowOf(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655')).not.toHaveProperty('ruleTags');
  });

  it('refuses every tag when the Technical details step has no rules', () => {
    const result = addFlowRuleTag(linkedPipeline(), [], 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc');
    expect(result).toEqual({ ok: false, reason: 'must name a rule of this project, got 0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc' });
  });

  it('refuses a tag the flow already has, with the parser reason, and keeps the saved tags', () => {
    const once = accepted(addFlowRuleTag(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc'));
    const result = addFlowRuleTag(once, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc');
    expect(result).toEqual({ ok: false, reason: 'repeats 0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc; each entry must be listed once' });
    expect(flowOf(once, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').ruleTags).toEqual([{ index: 0, ruleId: '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc' }]);
  });

  it('never changes the input pipeline, whether the add is accepted or refused', () => {
    const saved = linkedPipeline();
    const snapshot = structuredClone(saved);
    addFlowRuleTag(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc');
    addFlowRuleTag(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '7dc596a9-1390-5056-b6bb-03e37f304a86');
    expect(saved).toEqual(snapshot);
  });
});

describe('F-11 AC-026 rule tag rows: remove takes out one tag on its own', () => {
  it('removes only the given tag and renumbers the tags after it', () => {
    let saved = linkedPipeline();
    for (const id of ['0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc', '5d1d8905-7a0e-5281-b85f-92d26b3a346b']) saved = accepted(addFlowRuleTag(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', id));
    const result = removeFlowRuleTag(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 0);
    expect(flowOf(result, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').ruleTags).toEqual([{ index: 0, ruleId: '5d1d8905-7a0e-5281-b85f-92d26b3a346b' }]);
  });

  it('removes the only tag, leaving the flow otherwise unchanged', () => {
    const saved = accepted(addFlowRuleTag(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc'));
    const result = removeFlowRuleTag(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 0);
    expect(flowOf(result, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').ruleTags).toEqual([]);
    expect(flowOf(result, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').name).toBe('Plan');
  });

  it('throws for a tag that does not exist, as a programmer error', () => {
    expect(() => removeFlowRuleTag(linkedPipeline(), 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 0)).toThrow('F-11: the flow "ea3211a4-b64b-5204-9451-6fe12fd7c655" has no rule tag row 0');
  });
});

describe('F-11 AC-028 rows and field edits go through the parser with rows present', () => {
  it('still refuses a too-long description with the parser reason when the flow has argument rows and tags', () => {
    let saved = accepted(addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038')));
    saved = accepted(addFlowRuleTag(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc'));
    const result = editFlowField(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', { field: 'description', value: 'x'.repeat(1001) });
    expect(result).toEqual({ ok: false, field: 'description', reason: 'must be at most 1000 characters' });
  });

  it('accepts a name edit on a flow that has argument rows and tags', () => {
    let saved = accepted(addFlowArgument(linkedPipeline(), RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038')));
    saved = accepted(addFlowRuleTag(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc'));
    const result = editFlowField(saved, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', { field: 'name', value: 'Draft' });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(flowOf(result.pipeline, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments).toEqual(flowOf(saved, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').arguments);
    expect(flowOf(result.pipeline, 'ea3211a4-b64b-5204-9451-6fe12fd7c655').ruleTags).toEqual([{ index: 0, ruleId: '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc' }]);
  });
});

// F-16 AC-020: a flow of a new project with a blank body (from Add flow). The parser drops a flow with a blank body,
// so its own rows are checked against a placeholder body while the body is blank; the saved body stays blank.
function blankBodyPipeline(): Pipeline {
  const base = linkedPipeline();
  const planWithArgument: Flow = { ...flowOf(base, 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), arguments: [{ index: 0, id: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038', required: false, hint: 'The topic.' }] };
  const draft: Flow = { ...flow('48dc5da1-b874-5660-b208-b182cb4293a6', 'Draft'), index: 2, body: '' };
  return { ...base, flows: [planWithArgument, flowOf(base, 'a0c3aad4-8765-5b23-8df5-7c03d481233c'), draft] };
}

describe('F-16 AC-020 row edits on a flow with a blank body', () => {
  it('F-16 AC-020 refuses a rule tag that names no rule of the project, with the parser reason', () => {
    const result = addFlowRuleTag(blankBodyPipeline(), RULES, '48dc5da1-b874-5660-b208-b182cb4293a6', '7dc596a9-1390-5056-b6bb-03e37f304a86');
    expect(result).toEqual({ ok: false, reason: 'must name a rule of this project, got 7dc596a9-1390-5056-b6bb-03e37f304a86' });
  });

  it('F-16 AC-020 refuses an argument whose id is already used by another flow, with the parser reason', () => {
    const result = addFlowArgument(blankBodyPipeline(), RULES, '48dc5da1-b874-5660-b208-b182cb4293a6', row('f6e48fc8-29f2-5a26-9b01-9d90e8d52038'));
    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.reason).toMatch(/^must be unique: the id f6e48fc8-29f2-5a26-9b01-9d90e8d52038 is /);
  });

  it('F-16 AC-020 accepts a valid rule tag and keeps the saved body blank', () => {
    const result = addFlowRuleTag(blankBodyPipeline(), RULES, '48dc5da1-b874-5660-b208-b182cb4293a6', '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc');
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(flowOf(result.pipeline, '48dc5da1-b874-5660-b208-b182cb4293a6')).toMatchObject({ body: '', ruleTags: [{ index: 0, ruleId: '0c1e20fe-da74-5dbc-a196-e3ff90f6d6fc' }] });
  });

  it('F-16 AC-020 refuses an artifact with a blank label on a flow with a blank body, with the parser reason', () => {
    const result = addFlowArtifact(blankBodyPipeline(), RULES, '48dc5da1-b874-5660-b208-b182cb4293a6', { label: '', template: 'output.md' });
    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.reason).toBe('must not be blank');
  });

  it('F-16 AC-020 accepts a valid artifact on a flow with a blank body and keeps the saved body blank', () => {
    const result = addFlowArtifact(blankBodyPipeline(), RULES, '48dc5da1-b874-5660-b208-b182cb4293a6', { label: 'notes.md', template: 'output.md' });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(flowOf(result.pipeline, '48dc5da1-b874-5660-b208-b182cb4293a6')).toMatchObject({ body: '' });
    expect(flowOf(result.pipeline, '48dc5da1-b874-5660-b208-b182cb4293a6').artifacts).toEqual([
      { label: 'draft.md', template: 'output.md' },
      { label: 'notes.md', template: 'output.md' },
    ]);
  });

  it('F-16 AC-020 sets Human approval on a flow with a blank body and keeps the saved body blank', () => {
    const result = setFlowApproval(blankBodyPipeline(), RULES, '48dc5da1-b874-5660-b208-b182cb4293a6', true);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(flowOf(result.pipeline, '48dc5da1-b874-5660-b208-b182cb4293a6')).toMatchObject({ body: '', approval: true });
  });

  it('F-16 AC-020 accepts a valid argument and keeps the saved body blank', () => {
    const result = addFlowArgument(blankBodyPipeline(), RULES, '48dc5da1-b874-5660-b208-b182cb4293a6', row('f6669861-3c54-5758-b031-ec6a8d50ffe2'));
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(flowOf(result.pipeline, '48dc5da1-b874-5660-b208-b182cb4293a6')).toMatchObject({ body: '', arguments: [{ index: 0, id: 'f6669861-3c54-5758-b031-ec6a8d50ffe2' }] });
  });
});
