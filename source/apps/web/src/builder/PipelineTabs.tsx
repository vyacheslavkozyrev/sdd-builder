import { Box, Button, Typography } from '@mui/material';
import type { pipeline } from '@sddbuilder/core';
import { tabRow, type Tab } from './model.js';

// The tab row of step 3 (F-11 AC-001 to AC-005; AC-006 is checked on screen). The Pipeline tab
// comes first and has no remove control; one tab per flow follows in pipeline order; the + button
// after the last tab is the only control that adds a flow. The row spans the full width of the
// card. The layout follows the approved screens in spec/design/features/F-11-pipeline-builder/
// (01, 07 and 08). The flow tab's body is a placeholder until F-12 builds its blocks.

export const PIPELINE_TAB_LABEL = 'Pipeline';
export const ADD_FLOW_LABEL = 'Add flow';
export const TAB_ROW_LABEL = 'Pipeline tabs';

const ROW_SX = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  borderBottom: '1px solid #cbd5e1',
} as const;
const TABS_SX = {
  display: 'flex',
  flex: 1,
  minWidth: 0,
  overflowX: 'auto',
} as const;
const TAB_SX = {
  textTransform: 'none',
  fontSize: 13,
  fontWeight: 600,
  color: '#475569',
  borderRadius: 0,
  borderBottom: '2px solid transparent',
  whiteSpace: 'nowrap',
} as const;
const SELECTED_TAB_SX = {
  ...TAB_SX,
  color: '#0f172a',
  borderBottom: '2px solid #0f172a',
} as const;
const ADD_SX = {
  minWidth: 32,
  fontSize: 16,
  fontWeight: 700,
  color: '#334155',
  borderRadius: 0,
} as const;
const BODY_SX = { display: 'flex', flexDirection: 'column', gap: 1, pt: 2 } as const;
const NAME_SX = { fontSize: 14, fontWeight: 700, color: '#0f172a' } as const;
const PLACEHOLDER_SX = { fontSize: 13, color: '#64748b' } as const;

// The one-line placeholder that a flow tab shows until F-12 builds its blocks (AC-005).
export function flowPlaceholder(name: string): string {
  return `The blocks of ${name} are built in F-12.`;
}

function tabKey(tab: Tab): string {
  return tab.kind === 'pipeline' ? 'pipeline' : `flow:${tab.id}`;
}

function isSameTab(a: Tab, b: Tab): boolean {
  return tabKey(a) === tabKey(b);
}

export interface PipelineTabsProps {
  readonly pipeline: pipeline.Pipeline;
  readonly selected: Tab;
  readonly onSelect: (tab: Tab) => void;
  // The caller applies addFlow and selects the new flow's tab.
  readonly onAddFlow: () => void;
}

export function PipelineTabs({ pipeline, selected, onSelect, onAddFlow }: PipelineTabsProps) {
  return (
    <Box sx={ROW_SX}>
      <Box role="tablist" aria-label={TAB_ROW_LABEL} sx={TABS_SX}>
        {tabRow(pipeline).map((tab) => {
          const isSelected = isSameTab(tab, selected);
          return (
            <Button
              key={tabKey(tab)}
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelect(tab)}
              sx={isSelected ? SELECTED_TAB_SX : TAB_SX}
            >
              {tab.kind === 'pipeline' ? PIPELINE_TAB_LABEL : tab.name}
            </Button>
          );
        })}
      </Box>
      <Button aria-label={ADD_FLOW_LABEL} onClick={onAddFlow} sx={ADD_SX}>
        +
      </Button>
    </Box>
  );
}

export interface FlowTabBodyProps {
  readonly name: string;
  readonly blockCount: number;
}

// The body of a flow tab: its name and block count, and the placeholder (screen 08).
export function FlowTabBody({ name, blockCount }: FlowTabBodyProps) {
  const blocks = blockCount === 1 ? '1 block' : `${blockCount} blocks`;
  return (
    <Box sx={BODY_SX}>
      <Typography sx={NAME_SX}>{`${name} · ${blocks}`}</Typography>
      <Typography sx={PLACEHOLDER_SX}>{flowPlaceholder(name)}</Typography>
    </Box>
  );
}
