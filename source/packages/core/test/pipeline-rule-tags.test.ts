// F-03 AC-029 and AC-030: rule tags on Agent blocks and flows. The parser reads `ruleTags` as a list of non-empty
// strings and gives an empty list when the key is absent; the structural check refuses a tag that names no entry of
// `ProjectConfig.rules`, and lists every such tag at its path.
import { describe, expect, it } from 'vitest';
import defaultPipeline from '../../../templates/pipeline/default.json' with { type: 'json' };
import { ruleTagProblems } from '../src/pipeline/generate/refusals-names.js';
import type { FlowBlock, PipelineBlock, ProjectConfig, Rule } from '../src/pipeline/model.js';
import { parsePipelineConfig, type PipelineProblem } from '../src/pipeline/parse.js';
import { agent, configWith, end, flow, refusalOf, start } from './pipeline-routes-fixtures.js';

type JsonObject = Record<string, unknown>;

/** A fresh copy of the default pipeline JSON, so a test can edit it without touching the import. */
function defaultJson(): JsonObject {
  return JSON.parse(JSON.stringify(defaultPipeline)) as JsonObject;
}

/** The block of the JSON with this id, and its dotted path in the config. Searches the pipeline blocks and the child blocks. */
function locate(json: JsonObject, id: string): { block: JsonObject; path: string } {
  const blocks = (json['pipeline'] as JsonObject)['blocks'] as JsonObject[];
  for (const [index, block] of blocks.entries()) {
    if (block['id'] === id) return { block, path: `pipeline.blocks[${index}]` };
    const children = (block['blocks'] as JsonObject[] | undefined) ?? [];
    for (const [childIndex, child] of children.entries()) {
      if (child['id'] === id) return { block: child, path: `pipeline.blocks[${index}].blocks[${childIndex}]` };
    }
  }
  throw new Error(`no block with id ${id}`);
}

/** The Agent block and the flow of the default pipeline that a parse test edits, by id. */
const TARGETS = [
  { label: 'an Agent block', id: 'specify-agent' },
  { label: 'a flow', id: 'specify' },
] as const;

/** A `ruleTags` value that is refused: the problem's item index (undefined for the list itself) and its message. */
const REFUSED: { name: string; value: unknown; index: number | undefined; message: string }[] = [
  { name: 'a string instead of a list', value: 'style', index: undefined, message: 'must be a list' },
  { name: 'an object instead of a list', value: { id: 'style' }, index: undefined, message: 'must be a list' },
  { name: 'a number item', value: [1], index: 0, message: 'must be a string' },
  { name: 'a null item after a valid one', value: ['style', null], index: 1, message: 'must be a string' },
  { name: 'an object item', value: [{ id: 'style' }], index: 0, message: 'must be a string' },
  { name: 'an empty string item', value: [''], index: 0, message: 'must not be empty' },
];

describe.each(TARGETS)('F-03 AC-029 parser on $label', (target) => {
  it.each(REFUSED)('F-03 AC-029 refuses $name at the path of the key or the item', (row) => {
    const json = defaultJson();
    const { block, path } = locate(json, target.id);
    block['ruleTags'] = row.value;
    const expectedPath = row.index === undefined ? `${path}.ruleTags` : `${path}.ruleTags[${row.index}]`;
    const result = parsePipelineConfig(json);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual<PipelineProblem[]>([{ path: expectedPath, message: row.message }]);
  });

  it('F-03 AC-029 reads a list of non-empty strings onto the block', () => {
    const json = defaultJson();
    const { block } = locate(json, target.id);
    block['ruleTags'] = ['style', 'testing'];
    const result = parsePipelineConfig(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = findParsed(result.config.pipeline.blocks, target.id);
    expect(parsed.ruleTags).toEqual(['style', 'testing']);
  });

  it('F-03 AC-030 gives an empty list when the key is absent', () => {
    const json = defaultJson();
    const { block } = locate(json, target.id);
    expect(has(block, 'ruleTags')).toBe(false);
    const result = parsePipelineConfig(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(findParsed(result.config.pipeline.blocks, target.id).ruleTags).toEqual([]);
  });
});

/** The parsed flow, or Agent block inside a flow, with this id. */
function findParsed(blocks: PipelineBlock[], id: string): { ruleTags?: string[] } {
  for (const block of blocks) {
    if (block.kind !== 'flow') continue;
    if (block.id === id) return block;
    for (const child of block.blocks) {
      if (child.kind === 'agent' && child.id === id) return child;
    }
  }
  throw new Error(`no parsed block with id ${id}`);
}

function has(obj: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

describe('F-03 AC-030 the default pipeline', () => {
  it('F-03 AC-030 parses with no problems and empty rule tags on every flow and Agent block', () => {
    const result = parsePipelineConfig(defaultPipeline);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    const flows = result.config.pipeline.blocks.filter((block): block is FlowBlock => block.kind === 'flow');
    expect(flows.length).toBeGreaterThan(0);
    for (const flowBlock of flows) {
      expect(flowBlock.ruleTags).toEqual([]);
      for (const child of flowBlock.blocks) {
        if (child.kind === 'agent') expect(child.ruleTags).toEqual([]);
      }
    }
  });
});

function rulesOf(ids: readonly string[]): Rule[] {
  return ids.map((id) => ({ id, title: `${id} title`, text: `${id} text` }));
}

function configOf(blocks: PipelineBlock[], ruleIds: readonly string[] = ['style']): ProjectConfig {
  return { ...configWith(blocks), rules: rulesOf(ruleIds) };
}

/** A flow with a Start and an End around one Agent block that takes the given tags. */
function flowWithAgent(tags: string[], enabled = true): FlowBlock {
  return flow('f', [start('f-start'), { ...agent('f-agent'), ruleTags: tags }, end('f-end')], enabled);
}

describe('F-03 AC-029 the structural check on rule tags', () => {
  it.each([
    {
      name: 'a known tag on an Agent block is accepted',
      config: configOf([flowWithAgent(['style'])]),
      paths: [],
    },
    {
      name: 'an unknown tag on an Agent block is refused at its path',
      config: configOf([flowWithAgent(['missing'])]),
      paths: ['pipeline.blocks[0].blocks[1].ruleTags[0]'],
    },
    {
      name: 'every unknown tag on one Agent block is listed, the known one is not',
      config: configOf([flowWithAgent(['gone', 'style', 'missing'])]),
      paths: ['pipeline.blocks[0].blocks[1].ruleTags[0]', 'pipeline.blocks[0].blocks[1].ruleTags[2]'],
    },
    {
      name: 'an unknown tag on a flow is refused at the flow path',
      config: configOf([{ ...flowWithAgent(['style']), ruleTags: ['missing'] }]),
      paths: ['pipeline.blocks[0].ruleTags[0]'],
    },
    {
      name: 'unknown tags on a flow and on its Agent block are both listed, the flow first',
      config: configOf([{ ...flowWithAgent(['missing']), ruleTags: ['gone'] }]),
      paths: ['pipeline.blocks[0].ruleTags[0]', 'pipeline.blocks[0].blocks[1].ruleTags[0]'],
    },
    {
      name: 'a tag is refused when the project has no rules',
      config: configOf([flowWithAgent(['style'])], []),
      paths: ['pipeline.blocks[0].blocks[1].ruleTags[0]'],
    },
    {
      name: 'a disabled Agent block with an unknown tag is left out',
      config: configOf([flow('f', [start('f-start'), { ...agent('f-agent', false), ruleTags: ['missing'] }, end('f-end')])]),
      paths: [],
    },
    {
      name: 'a disabled flow with an unknown tag is left out',
      config: configOf([flowWithAgent(['missing'], false)]),
      paths: [],
    },
  ])('F-03 AC-029 $name', ({ config, paths }) => {
    expect(ruleTagProblems(config).map((problem) => problem.path)).toEqual(paths);
  });

  it('F-03 AC-029 names the unknown tag in the message', () => {
    const problems = ruleTagProblems(configOf([flowWithAgent(['missing'])]));
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain('"missing" names no rule');
  });

  it('F-03 AC-029 generate refuses an unknown tag with its path in the refusal', () => {
    const problems = refusalOf(configOf([flowWithAgent(['missing'])]));
    expect(problems).toContain(
      'pipeline.blocks[0].blocks[1].ruleTags[0]: "missing" names no rule; every ruleTags entry must be the id of a project rule',
    );
  });
});
