import { useMemo, useState, type ReactElement } from 'react';
import { Box } from '@mui/material';
import type { pipeline } from '@sddbuilder/core';
import { Canvas } from '../builder/Canvas.js';
import { addFlow, type Tab } from '../builder/model.js';
import { FlowTabBody, PipelineTabs } from '../builder/PipelineTabs.js';
import { PropertiesPanel } from '../builder/PropertiesPanel.js';
import { deleteFlow } from '../builder/delete.js';
import { rulesFor } from '../builder/marks.js';
import type { Selection } from '../builder/panel.js';
import { Toolbox } from '../builder/Toolbox.js';
import type { RuleBlock } from './state.js';

// The Workflow step (F-11 AC-001 to AC-005, AC-040 to AC-042): the Pipeline tab's body on step 3. It composes the
// tab row, the toolbox, the canvas and the properties panel, and holds the two pieces of view state: the open tab and
// the one selected item. Every change calls a pure edit function and reports the new pipeline through `onChange`;
// nothing is sent over the network or stored. The card follows screens 01 and 08 in
// spec/design/features/F-11-pipeline-builder/: the tab row on top, then the toolbox (170 px), the canvas and the
// properties panel (262 px).

const PIPELINE_TAB: Tab = { kind: 'pipeline' };

const CARD_SX = {
  position: 'relative',
  flexGrow: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  px: 2,
  pt: 2,
  pb: 2,
  bgcolor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 6px 20px rgba(79, 70, 229, 0.12)',
  overflow: 'hidden',
} as const;

const ACCENT_SX = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 6,
  background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
} as const;

const BODY_SX = { display: 'flex', flexGrow: 1, minHeight: 0, gap: 2, pt: 1.5 } as const;
const TOOLBOX_COLUMN_SX = { width: 170, flexShrink: 0, minHeight: 0, overflowY: 'auto' } as const;
const PANEL_COLUMN_SX = { width: 262, flexShrink: 0, minHeight: 0, overflowY: 'auto' } as const;
const CANVAS_COLUMN_SX = { display: 'flex', flex: 1, minWidth: 0, minHeight: 0 } as const;

export interface PipelineStepProps {
  readonly pipeline: pipeline.Pipeline;
  // The rule blocks of step 2. They are mapped to rules here, so the canvas can mark a rule tag that names no rule.
  readonly ruleBlocks: readonly RuleBlock[];
  readonly onChange: (next: pipeline.Pipeline) => void;
}

export function PipelineStep({ pipeline: config, ruleBlocks, onChange }: PipelineStepProps) {
  const [tab, setTab] = useState<Tab>(PIPELINE_TAB);
  const [selection, setSelection] = useState<Selection | undefined>(undefined);
  const rules = useMemo(() => rulesFor(ruleBlocks), [ruleBlocks]);

  // + adds a flow and opens its tab at once (AC-003).
  const addNewFlow = () => {
    const added = addFlow(config);
    onChange(added.pipeline);
    setTab({ kind: 'flow', id: added.flowId, name: added.flowId });
  };

  // The confirmed Delete flow removes the flow, clears the selection and moves the tab to Pipeline (AC-031, open item 6).
  // The flow id comes from the selection, so a refusal here is a programmer error.
  const removeFlow = (flowId: string) => {
    const result = deleteFlow(config, flowId);
    if (!result.ok) {
      throw new Error(result.reason);
    }
    onChange(result.pipeline);
    setSelection(undefined);
    setTab(PIPELINE_TAB);
  };

  let body: ReactElement;
  if (tab.kind === 'flow') {
    const flow = config.flows.find((candidate) => candidate.id === tab.id);
    if (flow === undefined) {
      throw new Error(`The pipeline has no flow with the id ${tab.id}.`);
    }
    body = <FlowTabBody name={flow.name} blockCount={flow.blocks.length} />;
  } else {
    body = (
      <Box sx={BODY_SX}>
        <Box sx={TOOLBOX_COLUMN_SX}>
          <Toolbox />
        </Box>
        <Box sx={CANVAS_COLUMN_SX}>
          <Canvas
            pipeline={config}
            rules={rules}
            selection={selection}
            onSelect={setSelection}
            onChange={onChange}
          />
        </Box>
        <Box sx={PANEL_COLUMN_SX}>
          <PropertiesPanel
            pipeline={config}
            selection={selection}
            onChange={onChange}
            onDelete={removeFlow}
            onSelect={setSelection}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={CARD_SX}>
      <Box aria-hidden="true" sx={ACCENT_SX} />
      <PipelineTabs pipeline={config} selected={tab} onSelect={setTab} onAddFlow={addNewFlow} />
      {body}
    </Box>
  );
}
