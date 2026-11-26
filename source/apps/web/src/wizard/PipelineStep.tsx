import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { pipeline } from '@sddbuilder/core';
import { AgentPanel, ConditionPanel, EndPanel, StartPanel } from '../builder/BlockPanel.js';
import { BlockArrowPanel, ConnectionPanel } from '../builder/ConnectionPanel.js';
import { BlockCanvas } from '../builder/BlockCanvas.js';
import { Canvas } from '../builder/Canvas.js';
import type { BlockSelection } from '../builder/panel.js';
import { afterDeleteBlock, blockPanelFor } from '../builder/panel.js';
import { flowArrows } from '../builder/blockArrows.js';
import type { BlockArrow, OutputName } from '../builder/blockArrows.js';
import { addBlock } from '../builder/blocks.js';
import type { BlockKind } from '../builder/blocks.js';
import type { Rule } from '../builder/fields.js';
import { ErrorPanel } from '../builder/ErrorPanel.js';
import { FlowPanel } from '../builder/FlowPanel.js';
import { CurrentPipelineContext } from '../builder/RowEditors.js';
import { canvasLayout } from '../builder/layout.js';
import { findingsOfBlock, WarningNote, warningsAt } from '../builder/MarkViews.js';
import { structureMarks } from '../builder/marks.js';
import type { StructureMarks } from '../builder/marks.js';
import { addFlow } from '../builder/model.js';
import type { Flow, Pipeline, Tab } from '../builder/model.js';
import { afterDeleteFlow } from '../builder/panel.js';
import type { PanelState, Selection } from '../builder/panel.js';
import { PipelinePanel } from '../builder/PipelinePanel.js';
import { PipelineTabs } from '../builder/PipelineTabs.js';
import { ruleId, ruleIdProblem } from './technical.js';
import type { RuleValues, WizardValues } from './state.js';
import { getPipelineStepStyles } from './pipelineStepStyles.js';

// The Workflow step (F-11 AC-002, AC-031, screen 01; F-12 AC-011, AC-044, AC-049, AC-051): the pipeline builder in
// step 3. The open tab and the selection are held here (PanelState). The pipeline is the wizard's value and every
// change is reported to the caller, which stores it (set-pipeline). The Pipeline tab shows the canvas, the structure
// marks and the properties card of the selection. A flow tab shows the flow's block canvas, with its toolbox, and the
// panel of the selected block or arrow (BlockSelection). Each flow keeps its own block selection (AC-049), so
// switching tabs does not clear it.

// The canvas starts its boxes 24 px in from its left edge (its defaultViewport) and at its top edge; a box is
// 76 px high, and the warning notes under a box sit 12 px below it.
const VIEWPORT_LEFT = 24;
const BOX_HEIGHT = 76;
const NOTE_GAP = 12;
const NOTE_TOP = BOX_HEIGHT + NOTE_GAP;

const PIPELINE_SELECTION: Selection = { kind: 'pipeline' };
const INITIAL_PANEL: PanelState = { tab: { kind: 'pipeline' }, selection: PIPELINE_SELECTION };
const NO_BLOCK_SELECTION: BlockSelection = { kind: 'none' };

// The block selection of each flow, by flow id (F-12 AC-049). A flow with no entry has no selection.
type BlockSelections = Readonly<Record<string, BlockSelection>>;

// The rules the builder can tag (F-11 AC-026): the rule blocks of the Technical details step with a valid name,
// each file name offered once (the first block with it). A block whose name is refused or repeated is not offered;
// the technical step already shows that problem on the block. The tag refers to the block's GUID id (F-16 AC-027).
export function builderRules(blocks: readonly RuleValues[]): Rule[] {
  const seen = new Set<string>();
  const rules: Rule[] = [];
  for (const block of blocks) {
    if (ruleIdProblem(block.name) !== 'none') continue;
    const fileName = ruleId(block.name);
    if (seen.has(fileName)) continue;
    seen.add(fileName);
    rules.push({ index: rules.length, id: block.id, title: block.name, text: block.description });
  }
  return rules;
}

function flowNamed(pipelineState: Pipeline, flowId: string): Flow {
  const flow = pipelineState.flows.find((candidate) => candidate.id === flowId);
  if (flow === undefined) {
    throw new Error(`F-11: the pipeline has no flow "${flowId}"`);
  }
  return flow;
}

// The pipeline with one flow replaced by the given flow, found by id (F-12 AC-050: the parser has accepted it).
function withFlow(pipelineState: Pipeline, flow: Flow): Pipeline {
  return { ...pipelineState, flows: pipelineState.flows.map((item) => (item.id === flow.id ? flow : item)) };
}

// The arrow of the flow that leaves one output of a block. The arrow panel takes the arrow itself (AC-021).
function arrowFrom(flow: Flow, fromId: string, output: OutputName): BlockArrow {
  const arrow = flowArrows(flow).find((candidate) => candidate.fromId === fromId && candidate.output === output);
  if (arrow === undefined) {
    throw new Error(`F-12: flow ${flow.id} has no ${output} arrow from block ${fromId}`);
  }
  return arrow;
}

// Whether the block selection still names a block or an arrow of the flow. A confirmed block delete removes the
// selected item, so the selection is then cleared and no panel names a block that is gone (AC-044).
function stillInFlow(flow: Flow, selection: BlockSelection): boolean {
  switch (selection.kind) {
    case 'none':
      return true;
    case 'block':
      return flow.blocks.some((block) => block.id === selection.blockId);
    case 'blockArrow':
      return flowArrows(flow).some(
        (arrow) => arrow.fromId === selection.fromId && arrow.output === selection.output,
      );
  }
}

// The warnings beside one flow box: the warnings on the box, then those on its outgoing arrow.
function warningsBeside(marks: StructureMarks, flowId: string) {
  return [
    ...warningsAt(marks, { kind: 'flow', flowId }),
    ...warningsAt(marks, { kind: 'arrow', source: flowId }),
  ];
}

// The title and subtitle of the properties card. A block's panel draws its own title, so no header is given.
interface PropertiesHeader {
  readonly title: string;
  readonly subtitle: string;
}

export interface PipelineStepProps {
  readonly values: WizardValues;
  readonly onPipelineChange: (pipeline: Pipeline) => void;
}

// The step gives its lists the pipeline it holds now (F-16 AC-023), set after each render, so a list that unmounts in the
// same step as a delete does not write back the pipeline it last rendered.
export function PipelineStep({ values, onPipelineChange }: PipelineStepProps) {
  const latestPipeline = useRef(values.pipeline);
  useLayoutEffect(() => {
    latestPipeline.current = values.pipeline;
  });
  return (
    <CurrentPipelineContext.Provider value={latestPipeline}>
      <PipelineStepView values={values} onPipelineChange={onPipelineChange} />
    </CurrentPipelineContext.Provider>
  );
}

function PipelineStepView({ values, onPipelineChange }: PipelineStepProps) {
  const styles = getPipelineStepStyles(useTheme());
  const pipelineState = values.pipeline;
  const [panel, setPanel] = useState<PanelState>(INITIAL_PANEL);
  const [blockSelections, setBlockSelections] = useState<BlockSelections>({});
  const rules = useMemo(() => builderRules(values.rules), [values.rules]);
  const marks = useMemo(() => structureMarks(pipelineState, rules), [pipelineState, rules]);
  const blockedFlowIds = useMemo(() => marks.blockedFlowIds, [marks]);
  const boxes = useMemo(() => canvasLayout(pipelineState).boxes, [pipelineState]);
  const { tab, selection } = panel;
  // The block selection of the open flow tab; the Pipeline tab has none.
  const blockSelection = tab.kind === 'flow' ? (blockSelections[tab.id] ?? NO_BLOCK_SELECTION) : NO_BLOCK_SELECTION;

  // Sets the block selection of one flow, and leaves the other flows' selections as they are (AC-049).
  const selectBlockIn = (flowId: string, next: BlockSelection) => {
    setBlockSelections((current) => ({ ...current, [flowId]: next }));
  };

  const selectTab = (next: Tab) => {
    setPanel({ tab: next, selection: PIPELINE_SELECTION });
  };

  // + appends a flow and opens its tab (AC-003).
  const addFlowTab = () => {
    const added = addFlow(pipelineState);
    onPipelineChange(added.pipeline);
    setPanel({ tab: { kind: 'flow', id: added.flowId }, selection: PIPELINE_SELECTION });
  };

  // A drag or repoint on the canvas clears the selection: a repointed arrow may no longer be the one selected.
  const changeFromCanvas = (next: Pipeline) => {
    onPipelineChange(next);
    setPanel((current) => ({ tab: current.tab, selection: PIPELINE_SELECTION }));
  };

  const select = (next: Selection) => {
    setPanel((current) => ({ tab: current.tab, selection: next }));
  };

  // Confirmed Delete flow: the new pipeline is applied and the selection cleared, the tab moves to Pipeline (AC-031).
  // The selections of a deleted flow are dropped, so a flow that later takes its id starts with none.
  const deleteFlowDone = (next: Pipeline) => {
    onPipelineChange(next);
    setPanel(afterDeleteFlow());
    setBlockSelections((current) =>
      Object.fromEntries(Object.entries(current).filter(([flowId]) => next.flows.some((flow) => flow.id === flowId))),
    );
  };

  // Confirmed Delete connection: the new pipeline is applied and the selection cleared; the tab stays open.
  const deleteConnectionDone = (next: Pipeline) => {
    onPipelineChange(next);
    setPanel((current) => ({ tab: current.tab, selection: PIPELINE_SELECTION }));
  };

  // A change made in a flow's panel: the new pipeline is applied. The block selection stays unless the change
  // removed the selected block or arrow (a confirmed Delete block), in which case it is cleared (AC-044).
  const flowChanged = (next: Pipeline, flowId: string) => {
    onPipelineChange(next);
    const edited = flowNamed(next, flowId);
    setBlockSelections((current) => {
      const selected = current[flowId] ?? NO_BLOCK_SELECTION;
      return { ...current, [flowId]: stillInFlow(edited, selected) ? selected : afterDeleteBlock(flowId).selection };
    });
  };

  // A block added from the toolbox is stored and selected, so its panel opens (AC-002). Its id is a new GUID, so it
  // is unique across every flow of the pipeline (F-16 AC-027).
  const blockAdded = (flow: Flow, kind: BlockKind) => {
    const result = addBlock(flow, kind);
    onPipelineChange(withFlow(pipelineState, result.flow));
    selectBlockIn(result.flow.id, { kind: 'block', blockId: result.blockId });
  };

  // A drag accepted on the flow canvas is stored; the selection of that flow is cleared.
  const blockDragged = (flow: Flow) => {
    onPipelineChange(withFlow(pipelineState, flow));
    selectBlockIn(flow.id, NO_BLOCK_SELECTION);
  };

  // Confirmed Delete connection on a block arrow (AC-021): the new flow is stored and its selection cleared.
  const blockArrowDeleted = (flow: Flow) => {
    onPipelineChange(withFlow(pipelineState, flow));
    selectBlockIn(flow.id, NO_BLOCK_SELECTION);
  };

  const tabs = (
    <PipelineTabs pipelineState={pipelineState} openTab={tab} onSelectTab={selectTab} onAddFlow={addFlowTab} />
  );

  const propertiesCard = (header: PropertiesHeader | null, body: ReactNode) => (
    <Box component="section" aria-label="Properties" sx={styles.propertiesCard}>
      {header !== null && (
        <Box sx={styles.propertiesHeader}>
          <Typography component="h2" sx={styles.propertiesTitle}>
            {header.title}
          </Typography>
          <Typography component="p" sx={styles.propertiesSubtitle}>
            {header.subtitle}
          </Typography>
        </Box>
      )}
      <Box sx={styles.propertiesBody}>{body}</Box>
    </Box>
  );

  if (tab.kind === 'flow') {
    const flow = flowNamed(pipelineState, tab.id);
    const shown = blockPanelFor(flow, blockSelection);
    const findingsFor = (blockId: string) => findingsOfBlock(marks, flow.id, blockId);
    const flowHeader = (): PropertiesHeader => ({
      title: `Flow: ${flow.name}`,
      subtitle: `Generates .claude/commands/${pipeline.flowFileName(flow)}.md`,
    });
    const panelOf = (): { readonly header: PropertiesHeader | null; readonly body: ReactNode } => {
      switch (shown.kind) {
        case 'flow':
          return {
            header: flowHeader(),
            body: (
              <FlowPanel
                key={flow.id}
                pipelineState={pipelineState}
                rules={rules}
                flow={flow}
                onChange={(next) => {
                  flowChanged(next, flow.id);
                }}
                onDelete={deleteFlowDone}
              />
            ),
          };
        case 'start':
          return {
            header: null,
            body: (
              <StartPanel
                key={shown.block.id}
                pipelineState={pipelineState}
                flow={flow}
                block={shown.block}
                onChange={(next) => {
                  flowChanged(next, flow.id);
                }}
                findings={findingsFor(shown.block.id)}
              />
            ),
          };
        case 'agent':
          return {
            header: null,
            body: (
              <AgentPanel
                key={shown.block.id}
                pipelineState={pipelineState}
                rules={rules}
                flow={flow}
                block={shown.block}
                onChange={(next) => {
                  flowChanged(next, flow.id);
                }}
                findings={findingsFor(shown.block.id)}
              />
            ),
          };
        case 'condition':
          return {
            header: null,
            body: (
              <ConditionPanel
                key={shown.block.id}
                pipelineState={pipelineState}
                rules={rules}
                flow={flow}
                block={shown.block}
                onChange={(next) => {
                  flowChanged(next, flow.id);
                }}
                findings={findingsFor(shown.block.id)}
              />
            ),
          };
        case 'end':
          return {
            header: null,
            body: (
              <EndPanel
                key={shown.block.id}
                pipelineState={pipelineState}
                rules={rules}
                flow={flow}
                block={shown.block}
                onChange={(next) => {
                  flowChanged(next, flow.id);
                }}
                findings={findingsFor(shown.block.id)}
              />
            ),
          };
        case 'blockArrow': {
          if (blockSelection.kind !== 'blockArrow') {
            throw new Error('F-12: the arrow panel is shown without an arrow selection');
          }
          const arrow = arrowFrom(flow, blockSelection.fromId, blockSelection.output);
          return {
            header: { title: 'Connection', subtitle: 'An arrow only points one block to another.' },
            body: (
              <BlockArrowPanel
                key={`${arrow.fromId}:${arrow.output}`}
                flow={flow}
                arrow={arrow}
                onDelete={blockArrowDeleted}
              />
            ),
          };
        }
      }
    };
    const properties = panelOf();
    return (
      <Box sx={styles.root}>
        {tabs}
        <Box sx={styles.body}>
          <Box sx={styles.flowColumn}>
            <Box sx={styles.flowCanvas}>
              <BlockCanvas
                flow={flow}
                selection={blockSelection}
                onSelect={(next) => selectBlockIn(flow.id, next)}
                onAdd={(kind) => blockAdded(flow, kind)}
                onChange={blockDragged}
                marks={marks}
              />
            </Box>
          </Box>
          {propertiesCard(properties.header, properties.body)}
        </Box>
      </Box>
    );
  }

  const properties = (() => {
    switch (selection.kind) {
      case 'pipeline':
        return {
          title: 'Pipeline',
          subtitle: 'Generates .claude/commands/pipeline.md',
          body: (
            <PipelinePanel pipelineState={pipelineState} rules={rules} onChange={onPipelineChange} />
          ),
        };
      case 'flow': {
        const flow = flowNamed(pipelineState, selection.id);
        return {
          title: `Flow: ${flow.name}`,
          subtitle: `Generates .claude/commands/${pipeline.flowFileName(flow)}.md`,
          body: (
            <FlowPanel
              key={flow.id}
              pipelineState={pipelineState}
              rules={rules}
              flow={flow}
              onChange={onPipelineChange}
              onDelete={deleteFlowDone}
            />
          ),
        };
      }
      case 'arrow':
        return {
          title: 'Connection',
          subtitle: 'An arrow only points one flow to another.',
          body: (
            <ConnectionPanel pipelineState={pipelineState} arrow={selection.arrow} onDelete={deleteConnectionDone} />
          ),
        };
    }
  })();

  return (
    <Box sx={styles.root}>
      {tabs}
      <Box sx={styles.body}>
        <Box component="section" aria-label="Canvas card" sx={styles.canvasColumn}>
          <Box sx={styles.canvasHeader}>
            <Box sx={styles.canvasTitles}>
              <Typography component="h2" sx={styles.canvasTitle}>
                Pipeline
              </Typography>
              <Typography component="p" sx={styles.hint}>
                Flows in pipeline order, left to right. Select a flow to edit its artifacts and Human approval.
              </Typography>
            </Box>
            <ErrorPanel findings={marks.findings} />
          </Box>
          <Box sx={styles.canvasArea}>
            <Canvas
              pipelineState={pipelineState}
              blockedFlowIds={blockedFlowIds}
              selection={selection}
              onPipelineChange={changeFromCanvas}
              onSelect={select}
            />
            {boxes.map((box) => {
              const notes = warningsBeside(marks, box.flowId);
              if (notes.length === 0) return null;
              return (
                <Box key={box.flowId} sx={styles.noteColumn(VIEWPORT_LEFT + box.x, NOTE_TOP)}>
                  {notes.map((note, index) => (
                    <WarningNote key={`${note.finding.path}-${index}`} text={note.label.message} />
                  ))}
                </Box>
              );
            })}
          </Box>
        </Box>
        {propertiesCard({ title: properties.title, subtitle: properties.subtitle }, properties.body)}
      </Box>
    </Box>
  );
}
