// The Map tab: flows as nodes, Connections as arrows with their gates on them, the Map toolbox and the connection panel
// (F-06 AC-005, AC-010 to AC-012). The read model is `mapTabView`, the rules are `addGate` and `gateTargetAt`; this view
// only binds them. A gate dropped on an arrow and a gate added from the panel go through the same `addGate` call.
import { useState } from 'react';
import type { DragEvent } from 'react';
import { Background, Controls, Position, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { pipeline } from '@sddbuilder/core';
import { addGate, gateTargetAt } from './map-edit.js';
import type { GateChoice, MapPoint } from './map-edit.js';
import { COLUMN_STEP, MAP_LAYOUT, connectionBoxes, mapTabView } from './map-tab-view.js';
import type { ConnectionEdge, FlowNode } from './map-tab-view.js';
import { GATE_DRAG_TYPE, Toolbox, isGateKind } from './Toolbox.js';
import type { GateKind } from './Toolbox.js';

type ProjectConfig = pipeline.ProjectConfig;

const NO_GATE_ON_CONNECTION = 'This connection already has a gate: one gate per connection.';

export interface MapTabProps {
  config: ProjectConfig;
  onChange: (config: ProjectConfig) => void;
}

/** The Map tab. It sits in a React Flow provider so a drop can be turned into flow coordinates. */
export function MapTab(props: MapTabProps) {
  return (
    <ReactFlowProvider>
      <MapTabBody {...props} />
    </ReactFlowProvider>
  );
}

function MapTabBody({ config, onChange }: MapTabProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const view = mapTabView(config);
  const columns = new Map(view.nodes.map((node) => [node.id, node.column]));
  const names = new Map(view.nodes.map((node) => [node.id, node.name]));
  const boxes = connectionBoxes(view.edges, columns);
  // A connection removed from the configuration leaves the panel with nothing to show.
  const selected = view.edges.find((edge) => edge.id === selectedId);

  const nodes: Node[] = view.nodes.map((node) => ({
    id: node.id,
    position: { x: node.column * COLUMN_STEP, y: 0 },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    selectable: false,
    draggable: false,
    connectable: false,
    style: {
      width: MAP_LAYOUT.nodeWidth,
      height: MAP_LAYOUT.nodeHeight,
      ...(node.enabled ? nodeStyle : { ...nodeStyle, border: '1.5px dashed #a1a1aa', background: '#fafafa' }),
    },
    data: { label: <FlowLabel node={node} /> },
  }));

  const edges: Edge[] = view.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: 'straight',
    selected: edge.id === selectedId,
    style: edge.enabled ? {} : { strokeDasharray: '5 4' },
    label: <ConnectionLabel edge={edge} highlighted={edge.id === dropTarget} />,
  }));

  function pointOf(event: DragEvent<HTMLDivElement>): MapPoint {
    return screenToFlowPosition({ x: event.clientX, y: event.clientY });
  }

  function place(connectionId: string, kind: GateKind) {
    const result = addGate(config, connectionId, gateChoice(kind));
    if (result.ok) {
      onChange(result.config);
      setSelectedId(connectionId);
      setMessage(null);
    } else {
      setMessage(result.message);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes(GATE_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropTarget(gateTargetAt(pointOf(event), boxes));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes(GATE_DRAG_TYPE)) return;
    event.preventDefault();
    setDropTarget(null);
    const kind = event.dataTransfer.getData(GATE_DRAG_TYPE);
    if (!isGateKind(kind)) return;
    const target = gateTargetAt(pointOf(event), boxes);
    if (target === null) {
      setMessage("Drop the gate on a connection's arrow. Nothing was added.");
      return;
    }
    place(target, kind);
  }

  return (
    <section aria-label="Map" style={{ display: 'flex', gap: 16 }}>
      <aside style={{ width: 200 }}>
        <Toolbox items={view.toolbox} />
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ height: 420 }}
          onDragOver={handleDragOver}
          onDragLeave={(event) => {
            // Moving onto a child fires dragleave on the wrapper too; only leaving the wrapper clears the highlight.
            if (!event.currentTarget.contains(event.relatedTarget as HTMLElement | null)) setDropTarget(null);
          }}
          onDrop={handleDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            deleteKeyCode={null}
            onEdgeClick={(_event, edge) => {
              setSelectedId(edge.id);
              setMessage(null);
            }}
            onPaneClick={() => setSelectedId(null)}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
        {message !== null && <p role="alert">{message}</p>}
      </div>

      <aside style={{ width: 260 }}>
        {selected !== undefined && (
          <ConnectionPanel
            edge={selected}
            from={names.get(selected.from) ?? selected.from}
            to={names.get(selected.to) ?? selected.to}
            onAdd={(kind) => place(selected.id, kind)}
          />
        )}
      </aside>
    </section>
  );
}

interface ConnectionPanelProps {
  edge: ConnectionEdge;
  from: string;
  to: string;
  onAdd: (kind: GateKind) => void;
}

function ConnectionPanel({ edge, from, to, onAdd }: ConnectionPanelProps) {
  const hasGate = edge.gates.length > 0;
  return (
    <section aria-label="Connection">
      <h2>{`Connection: ${from} → ${to}`}</h2>
      <p>Artifact handed over</p>
      <div style={boxStyle}>{edge.label ?? 'no artifact label'}</div>
      <p>Gate on this connection</p>
      {hasGate ? (
        edge.gates.map((gate) => (
          <div key={gate.id} style={boxStyle}>
            {gate.text}
            {edge.label !== null && ` (${edge.label})`}
          </div>
        ))
      ) : (
        <div style={boxStyle}>none</div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" disabled={hasGate} onClick={() => onAdd('approval')}>
          Add approval
        </button>
        <button type="button" disabled={hasGate} onClick={() => onAdd('check')}>
          Add check
        </button>
      </div>
      {hasGate && <p role="note">{NO_GATE_ON_CONNECTION}</p>}
      <p>Drag an Approval or a Check onto the arrow, or add one here.</p>
    </section>
  );
}

function FlowLabel({ node }: { node: FlowNode }) {
  const blocks = `${node.blockCount} ${node.blockCount === 1 ? 'block' : 'blocks'}`;
  return (
    <div>
      <strong>{node.name}</strong>
      <div>{node.scope}</div>
      <div>{node.enabled ? blocks : `${blocks}, switched off`}</div>
    </div>
  );
}

function ConnectionLabel({ edge, highlighted }: { edge: ConnectionEdge; highlighted: boolean }) {
  return (
    <div
      style={{
        fontSize: 11,
        lineHeight: 1.3,
        textAlign: 'center',
        padding: '2px 4px',
        borderRadius: 4,
        background: '#ffffff',
        border: highlighted ? '1.5px dashed #2563eb' : '1px solid transparent',
      }}
    >
      <div>{edge.label ?? 'no artifact label'}</div>
      {edge.gates.map((gate) => (
        <div key={gate.id} style={{ color: '#9a3412' }}>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              marginRight: 5,
              border: '1.5px solid #ea580c',
              background: '#fff7ed',
              transform: 'rotate(45deg)',
            }}
          />
          {gate.text}
        </div>
      ))}
    </div>
  );
}

function gateChoice(kind: GateKind): GateChoice {
  return kind === 'approval' ? { checkType: 'approval' } : { checkType: 'checks' };
}

const nodeStyle = {
  border: '1.5px solid #18181b',
  borderRadius: 8,
  background: '#ffffff',
  fontSize: 12,
  padding: 6,
} as const;

const boxStyle = {
  border: '1px solid #d4d4d8',
  borderRadius: 6,
  padding: '4px 8px',
  marginBottom: 4,
} as const;
