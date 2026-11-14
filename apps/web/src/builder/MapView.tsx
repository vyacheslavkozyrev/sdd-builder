// Global map: React Flow shows the workflows and connections; the state and every rule
// live in map-state.ts and the read model in map-view.ts. The view only calls them.
// The map is held in React memory only (F-06 AC-003); a reload starts from the reference process.
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Background, Controls, ReactFlow } from '@xyflow/react';
import type { Connection, Edge, Node, NodeChange, XYPosition } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Scope } from '@sddbuilder/core';
import { addWorkflow, connect, removeWorkflow, startState } from './map-state.js';
import { ConnectionEditor } from './ConnectionEditor.js';
import type { MapState } from './map-state.js';
import { edgeText, mapEdges, mapNodes } from './map-view.js';
import type { MapNode } from './map-view.js';

const SCOPES: readonly Scope[] = ['project', 'feature', 'task'];
const COLUMNS = 3;
const COLUMN_WIDTH = 260;
const ROW_HEIGHT = 150;

/** Where the user has left a node: its position once dragged, and whether it is selected. */
interface Layout {
  position?: XYPosition;
  selected?: boolean;
}

/** Grid position for a workflow that has not been dragged yet. */
function defaultPosition(index: number): XYPosition {
  return { x: (index % COLUMNS) * COLUMN_WIDTH, y: Math.floor(index / COLUMNS) * ROW_HEIGHT };
}

function NodeLabel({ node }: { node: MapNode }) {
  return (
    <div>
      <strong>{node.name}</strong>
      <div>{node.scope} · {node.iterationSource}</div>
      <div>
        {node.stepCount} steps, {node.gateCount} gates, {node.routeCount} routes
      </div>
    </div>
  );
}

export function MapView() {
  const [map, setMap] = useState<MapState>(startState);
  const [layout, setLayout] = useState<Readonly<Record<string, Layout>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<Scope>('feature');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // A removed workflow takes its connections with it, so the panel may have nothing to show.
  const selectedConnection = map.connections.find((c) => c.id === selectedEdgeId);

  const nodes: Node[] = mapNodes(map.workflows).map((node, index) => ({
    id: node.id,
    position: layout[node.id]?.position ?? defaultPosition(index),
    selected: layout[node.id]?.selected ?? false,
    data: { label: <NodeLabel node={node} /> },
  }));

  const edges: Edge[] = mapEdges(map.connections).map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edgeText(edge),
  }));

  // Controlled nodes are rebuilt from props on every render, so dragged positions and
  // selection are kept here. Other change kinds (dimensions, removal) are not applied.
  function handleNodesChange(changes: NodeChange[]) {
    setLayout((current) => {
      const next: Record<string, Layout> = { ...current };
      for (const change of changes) {
        if (change.type === 'position' && change.position !== undefined) {
          next[change.id] = { ...next[change.id], position: change.position };
        } else if (change.type === 'select') {
          next[change.id] = { ...next[change.id], selected: change.selected };
        }
      }
      return next;
    });
  }

  function handleConnect(connection: Connection) {
    const result = connect(map, connection.source, connection.target);
    if (result.ok) {
      setMap(result.state);
      setMessage(null);
    } else {
      setMessage(result.message);
    }
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addWorkflow(map, name, scope);
    if (result.ok) {
      setMap(result.state);
      setName('');
      setMessage(null);
    } else {
      setMessage(result.message);
    }
  }

  function handleRemove(workflowId: string) {
    setMap(removeWorkflow(map, workflowId));
    // A later workflow with the same id must not reappear at this one's old place.
    setLayout((current) => {
      const next: Record<string, Layout> = { ...current };
      delete next[workflowId];
      return next;
    });
    setMessage(null);
  }

  function handleScope(value: string) {
    const next = SCOPES.find((item) => item === value);
    if (next !== undefined) {
      setScope(next);
    }
  }

  return (
    <section aria-label="Global map">
      <form onSubmit={handleAdd}>
        <label>
          Workflow name{' '}
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>{' '}
        <label>
          Scope{' '}
          <select value={scope} onChange={(event) => handleScope(event.target.value)}>
            {SCOPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>{' '}
        <button type="submit">Add workflow</button>
      </form>

      {message !== null && <p role="alert">{message}</p>}

      <div style={{ height: 420 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onConnect={handleConnect}
          onEdgeClick={(_event, edge) => setSelectedEdgeId(edge.id)}
          onPaneClick={() => setSelectedEdgeId(null)}
          deleteKeyCode={null}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {selectedConnection !== undefined && (
        <ConnectionEditor
          key={selectedConnection.id}
          map={map}
          connection={selectedConnection}
          onChange={setMap}
        />
      )}

      <ul>
        {map.workflows.map((workflow) => (
          <li key={workflow.id}>
            {workflow.name}{' '}
            <button type="button" onClick={() => handleRemove(workflow.id)}>
              Remove {workflow.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
