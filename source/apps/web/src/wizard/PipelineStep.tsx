import { useMemo, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Canvas } from '../builder/Canvas.js';
import { ConnectionPanel } from '../builder/ConnectionPanel.js';
import type { Rule } from '../builder/fields.js';
import { FlowPanel } from '../builder/FlowPanel.js';
import { canvasLayout } from '../builder/layout.js';
import { UnplacedFindings, WarningNote, unplacedFindings, warningsAt } from '../builder/MarkViews.js';
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

// The Workflow step (F-11 AC-002, AC-031, screen 01): the pipeline builder in step 3. The open tab and the
// selection are held here (PanelState). The pipeline is the wizard's value and every change is reported to
// the caller, which stores it (set-pipeline). The Pipeline tab shows the canvas, the structure marks and the
// properties card of the selection; a flow tab shows the flow's name and a note, with no block (AC-002).

// The canvas starts its boxes 24 px in from its left edge (its defaultViewport) and at its top edge; a box is
// 76 px high, and the warning notes under a box sit 12 px below it.
const VIEWPORT_LEFT = 24;
const BOX_HEIGHT = 76;
const NOTE_GAP = 12;
const NOTE_TOP = BOX_HEIGHT + NOTE_GAP;

const PIPELINE_SELECTION: Selection = { kind: 'pipeline' };
const INITIAL_PANEL: PanelState = { tab: { kind: 'pipeline' }, selection: PIPELINE_SELECTION };

// The rules the builder can tag (F-11 AC-026): the rule blocks of the Technical details step with a valid id,
// each id offered once (the first block with it). A block whose id is refused or repeated is not offered;
// the technical step already shows that problem on the block.
export function builderRules(blocks: readonly RuleValues[]): Rule[] {
  const seen = new Set<string>();
  const rules: Rule[] = [];
  for (const block of blocks) {
    if (ruleIdProblem(block.name) !== 'none') continue;
    const id = ruleId(block.name);
    if (seen.has(id)) continue;
    seen.add(id);
    rules.push({ index: rules.length, id, title: block.name, text: block.description });
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

// The warnings beside one flow box: the warnings on the box, then those on its outgoing arrow.
function warningsBeside(marks: StructureMarks, flowId: string) {
  return [
    ...warningsAt(marks, { kind: 'flow', flowId }),
    ...warningsAt(marks, { kind: 'arrow', source: flowId }),
  ];
}

export interface PipelineStepProps {
  readonly values: WizardValues;
  readonly onPipelineChange: (pipeline: Pipeline) => void;
}

export function PipelineStep({ values, onPipelineChange }: PipelineStepProps) {
  const styles = getPipelineStepStyles(useTheme());
  const pipelineState = values.pipeline;
  const [panel, setPanel] = useState<PanelState>(INITIAL_PANEL);
  const rules = useMemo(() => builderRules(values.rules), [values.rules]);
  const marks = useMemo(() => structureMarks(pipelineState, rules), [pipelineState, rules]);
  const blockedFlowIds = useMemo(() => marks.blockedFlowIds, [marks]);
  const blockerMessages = useMemo(
    () => marks.findings.filter((entry) => entry.finding.severity === 'blocker').map((entry) => entry.finding.message),
    [marks],
  );
  const boxes = useMemo(() => canvasLayout(pipelineState).boxes, [pipelineState]);
  const { tab, selection } = panel;

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
  const deleteFlowDone = (next: Pipeline) => {
    onPipelineChange(next);
    setPanel(afterDeleteFlow());
  };

  // Confirmed Delete connection: the new pipeline is applied and the selection cleared; the tab stays open.
  const deleteConnectionDone = (next: Pipeline) => {
    onPipelineChange(next);
    setPanel((current) => ({ tab: current.tab, selection: PIPELINE_SELECTION }));
  };

  const tabs = (
    <PipelineTabs pipelineState={pipelineState} openTab={tab} onSelectTab={selectTab} onAddFlow={addFlowTab} />
  );

  if (tab.kind === 'flow') {
    const flow = flowNamed(pipelineState, tab.id);
    return (
      <Box sx={styles.root}>
        {tabs}
        <Box sx={styles.flowTab}>
          <Typography component="h2" sx={styles.flowTabName}>
            {flow.name}
          </Typography>
          <Typography component="p" sx={styles.flowTabNote}>
            The blocks of this flow are built in a later step.
          </Typography>
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
          subtitle: `Generates .claude/commands/${flow.name}.md`,
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
            <Typography component="h2" sx={styles.canvasTitle}>
              Pipeline
            </Typography>
            <Typography component="p" sx={styles.hint}>
              Flows in pipeline order, left to right. Select a flow to edit its artifacts and Human approval.
            </Typography>
          </Box>
          <Box sx={styles.canvasArea}>
            <Canvas
              pipelineState={pipelineState}
              blockedFlowIds={blockedFlowIds}
              blockerMessages={blockerMessages}
              onPipelineChange={changeFromCanvas}
              onSelect={select}
            />
            {boxes.map((box) => {
              const notes = warningsBeside(marks, box.flowId);
              if (notes.length === 0) return null;
              return (
                <Box key={box.flowId} sx={styles.noteColumn(VIEWPORT_LEFT + box.x, NOTE_TOP)}>
                  {notes.map((finding, index) => (
                    <WarningNote key={`${finding.path}-${index}`} text={finding.message} />
                  ))}
                </Box>
              );
            })}
          </Box>
          <UnplacedFindings findings={unplacedFindings(marks)} />
        </Box>
        <Box component="section" aria-label="Properties" sx={styles.propertiesCard}>
          <Box sx={styles.propertiesHeader}>
            <Typography component="h2" sx={styles.propertiesTitle}>
              {properties.title}
            </Typography>
            <Typography component="p" sx={styles.propertiesSubtitle}>
              {properties.subtitle}
            </Typography>
          </Box>
          <Box sx={styles.propertiesBody}>{properties.body}</Box>
        </Box>
      </Box>
    </Box>
  );
}
