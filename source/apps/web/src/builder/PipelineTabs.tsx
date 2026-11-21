import { Box, Button, useTheme } from '@mui/material';
import { getPipelineTabsStyles } from './builderStyles.js';
import { tabOrder } from './model.js';
import type { Pipeline, Tab } from './model.js';

// The tab row of the pipeline builder (F-11 AC-001, AC-003, AC-004). The Pipeline tab comes first,
// then one tab per flow in pipeline order, then the + control after the last flow. The open tab
// is marked (aria-selected). The Pipeline tab has no remove control, and the row draws no toolbox:
// the toolbox belongs to a flow tab (F-12), not to this row.

export interface PipelineTabsProps {
  readonly pipelineState: Pipeline;
  readonly openTab: Tab;
  readonly onSelectTab: (tab: Tab) => void;
  readonly onAddFlow: () => void;
}

// The label of a tab: the word Pipeline, or the name of its flow (F-11 AC-002).
function labelOf(tab: Tab, names: ReadonlyMap<string, string>): string {
  if (tab.kind === 'pipeline') {
    return 'Pipeline';
  }
  return names.get(tab.id) ?? tab.id;
}

function isOpen(tab: Tab, openTab: Tab): boolean {
  if (tab.kind === 'pipeline') {
    return openTab.kind === 'pipeline';
  }
  return openTab.kind === 'flow' && openTab.id === tab.id;
}

export function PipelineTabs({ pipelineState, openTab, onSelectTab, onAddFlow }: PipelineTabsProps) {
  const styles = getPipelineTabsStyles(useTheme());
  const names = new Map(pipelineState.flows.map((flow) => [flow.id, flow.name] as const));
  return (
    <Box sx={styles.row}>
      <Box role="tablist" aria-label="Pipeline tabs" sx={styles.tabList}>
        {tabOrder(pipelineState).map((tab) => {
          const open = isOpen(tab, openTab);
          return (
            <Button
              key={tab.kind === 'pipeline' ? 'pipeline' : tab.id}
              role="tab"
              aria-selected={open}
              variant="text"
              color="inherit"
              onClick={() => {
                onSelectTab(tab);
              }}
              sx={styles.tab[open ? 'open' : 'closed']}
            >
              {labelOf(tab, names)}
            </Button>
          );
        })}
      </Box>
      <Button
        variant="outlined"
        color="primary"
        aria-label="Add flow"
        onClick={() => {
          onAddFlow();
        }}
        sx={styles.addButton}
      >
        +
      </Button>
    </Box>
  );
}
