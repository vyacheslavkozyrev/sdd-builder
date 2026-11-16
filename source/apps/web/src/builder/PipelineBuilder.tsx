// The pipeline builder: the component the wizard renders at step 3 (F-06 AC-043). It starts from the host's
// configuration or, without one, from the default pipeline (AC-041), and reports each change to the host through
// the builder state (state.ts). The configuration lives in React memory only, so a page load starts clean (AC-044,
// AC-045). The tab row is the one `mapTabView` gives: Map, one tab per flow in order, then + (screen 01). The
// selection is kept here; the rules are in the edit modules and this view only binds them.
import { useEffect, useRef, useState } from 'react';
import type { pipeline } from '@sddbuilder/core';
import { addFlow } from './flow-edit.js';
import { FlowTab } from './FlowTab.js';
import { MapTab } from './MapTab.js';
import { mapTabView } from './map-tab-view.js';
import { createBuilderState } from './state.js';
import type { BuilderHost } from './state.js';

type ProjectConfig = pipeline.ProjectConfig;

export interface PipelineBuilderProps {
  /** The starting configuration from the host. Absent, the builder starts from the default pipeline. */
  initial?: ProjectConfig;
  /** Called after each change with the current configuration. */
  onChange?: (config: ProjectConfig) => void;
}

/** The selected tab: the Map, or the id of a flow. */
const MAP = 'map';

export function PipelineBuilder({ initial, onChange }: PipelineBuilderProps) {
  // The state keeps the host's callback from creation; the ref lets it call the latest one.
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);
  const [builder] = useState(() => {
    const host: BuilderHost = { onChange: (config) => latest.current?.(config) };
    if (initial !== undefined) host.initial = initial;
    return createBuilderState(host);
  });
  const [config, setConfig] = useState<ProjectConfig>(() => builder.current());
  const [selected, setSelected] = useState<string>(MAP);

  const view = mapTabView(config);
  // A flow removed or renamed on the map leaves its tab; the builder falls back to the Map.
  const active = view.tabs.some((tab) => tab.kind === 'flow' && tab.flowId === selected) ? selected : MAP;

  function change(next: ProjectConfig) {
    builder.replace(next);
    setConfig(next);
    // A selected flow the change removed or renamed away is dropped from the selection.
    if (!mapTabView(next).tabs.some((tab) => tab.kind === 'flow' && tab.flowId === selected)) setSelected(MAP);
  }

  function addTab() {
    const edit = addFlow(config);
    change(edit.config);
    setSelected(edit.flowId);
  }

  return (
    <section aria-label="Pipeline builder">
      <nav aria-label="Pipeline tabs">
        {view.tabs.map((tab) => {
          if (tab.kind === 'map') {
            return (
              <button key="map" type="button" aria-pressed={active === MAP} onClick={() => setSelected(MAP)}>
                {tab.label}
              </button>
            );
          }
          if (tab.kind === 'flow') {
            return (
              <button
                key={tab.flowId}
                type="button"
                aria-pressed={active === tab.flowId}
                style={tab.enabled ? undefined : { borderStyle: 'dashed', color: '#71717a' }}
                onClick={() => setSelected(tab.flowId)}
              >
                {tab.label}
                {tab.enabled ? '' : ' (off)'}
              </button>
            );
          }
          return (
            <button key="add" type="button" aria-label="Add a flow" onClick={addTab}>
              {tab.label}
            </button>
          );
        })}
      </nav>

      {active === MAP ? (
        <MapTab config={config} onChange={change} />
      ) : (
        <FlowTab
          key={active}
          config={config}
          flowId={active}
          onChange={change}
          onFlowDeleted={() => setSelected(MAP)}
        />
      )}
    </section>
  );
}
