// Live structural marks on the Map and the flow tabs (F-06 AC-009, AC-022, AC-033, AC-036 to AC-040). A mark shows why
// a configuration is not complete, next to the flow, block or Connection it names. The marks are the findings of
// `analyzeStructure` from core, the rule set F-04 uses too (AC-038), so one rule has one implementation. A mark never
// refuses an edit (AC-039). A finding on a disabled flow or block gives no mark (AC-033), except a disabled Start or End
// of an enabled flow, which is marked on that flow (AC-037). Pure: no DOM, no storage, no network.
import { pipeline } from '@sddbuilder/core';

type ProjectConfig = pipeline.ProjectConfig;
type AnalysisFinding = pipeline.AnalysisFinding;

/** The kinds a marked item can have: a flow, or any block a flow or the pipeline holds. */
export type MarkedKind = 'flow' | pipeline.PipelineBlock['kind'] | pipeline.ChildBlock['kind'];

/** One mark: the finding, and the item it is shown on. `path` is the item's path, as the analyzer names it. */
export interface StructuralMark {
  path: string;
  kind: MarkedKind;
  severity: AnalysisFinding['severity'];
  message: string;
}

/**
 * The path of an item from the indexes of the pipeline list and, for a block of a flow, of the flow's list, in the
 * format the analyzer uses: `pipeline.blocks[1]` for a pipeline item, `pipeline.blocks[1].blocks[2]` for a flow's block.
 */
export function itemPath(...indexes: number[]): string {
  return indexes.map((index, depth) => (depth === 0 ? `pipeline.blocks[${index}]` : `.blocks[${index}]`)).join('');
}

/**
 * An item the marks can name, and whether it takes part in the analysis: it and every flow around it are enabled.
 * `flow` is the flow a block of a flow belongs to; a pipeline item has none.
 */
interface Item {
  path: string;
  kind: MarkedKind;
  live: boolean;
  flow?: Item;
}

function items(config: ProjectConfig): Item[] {
  return config.pipeline.blocks.flatMap((block, index): Item[] => {
    const own: Item = { path: itemPath(index), kind: block.kind, live: block.enabled };
    if (block.kind !== 'flow') return [own];
    const children = block.blocks.map(
      (child, childIndex): Item => ({
        path: itemPath(index, childIndex),
        kind: child.kind,
        live: block.enabled && child.enabled,
        flow: own,
      }),
    );
    return [own, ...children];
  });
}

/** The item a finding names: the longest item path that is the subject or the start of it, at a path boundary. */
function namedItem(subject: string, all: readonly Item[]): Item | undefined {
  let found: Item | undefined;
  for (const item of all) {
    const names = subject === item.path || subject.startsWith(`${item.path}.`) || subject.startsWith(`${item.path}[`);
    if (names && (found === undefined || item.path.length > found.path.length)) found = item;
  }
  return found;
}

/**
 * The item a finding is shown on. A live item is shown on itself. A disabled Start or End inside an enabled flow is
 * shown on that flow (AC-037): core names the disabled block, but the problem belongs to the flow that has no enabled
 * endpoint. Any other disabled item, or an item inside a disabled flow, gives no mark (AC-033).
 */
function shownItem(item: Item): Item | undefined {
  if (item.live) return item;
  if (item.flow?.live && (item.kind === 'start' || item.kind === 'end')) return item.flow;
  return undefined;
}

/**
 * The marks of a configuration, in the analyzer's order. Each finding that names a flow, a block or a Connection
 * becomes one mark on the item it is shown on (see `shownItem`); a finding that names none (the brief, the stack) is
 * not shown on the Map. A disabled pipeline-level Start or End has no owning flow, so it gets no mark.
 */
export function structuralMarks(config: ProjectConfig): StructuralMark[] {
  const all = items(config);
  return pipeline.analyzeStructure(config).flatMap((finding): StructuralMark[] => {
    const item = namedItem(finding.subject, all);
    const shown = item === undefined ? undefined : shownItem(item);
    if (shown === undefined) return [];
    return [{ path: shown.path, kind: shown.kind, severity: finding.severity, message: finding.message }];
  });
}

/** The marks shown on one item, in the analyzer's order. */
export function marksAt(marks: readonly StructuralMark[], path: string): StructuralMark[] {
  return marks.filter((mark) => mark.path === path);
}
