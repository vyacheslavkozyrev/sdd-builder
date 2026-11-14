// Workflow diagram: React Flow draws the steps and conditions of the selected workflow in order.
// The node and edge model is in tab-diagram-view.ts. The diagram is read-only apart from selection:
// nodes cannot be dragged or connected, and nothing is deleted from it. Selecting a step calls
// onSelectStep; the inspector shows that step.
import { Background, MarkerType, ReactFlow } from '@xyflow/react';
import type { Edge, Node, NodeMouseHandler } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Workflow } from '@sddbuilder/core';
import { tabDiagram } from './tab-diagram-view.js';
import type { DiagramNode } from './tab-diagram-view.js';

const COLUMN_WIDTH = 200;

function nodeClass(node: DiagramNode, selectedStepId: string | null): string {
  const classes = ['diagram-node', node.kind === 'step' ? 'diagram-step' : 'diagram-condition'];
  if (!node.enabled) {
    classes.push('diagram-off');
  }
  if (node.stepId !== null && node.stepId === selectedStepId) {
    classes.push('diagram-selected');
  }
  return classes.join(' ');
}

interface TabDiagramProps {
  workflow: Workflow;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
}

export function TabDiagram({ workflow, selectedStepId, onSelectStep }: TabDiagramProps) {
  const model = tabDiagram(workflow);

  if (model.nodes.length === 0) {
    return <p className="hint">No steps in this workflow yet.</p>;
  }

  const nodes: Node[] = model.nodes.map((node) => ({
    id: node.id,
    position: { x: node.column * COLUMN_WIDTH, y: 0 },
    data: { label: node.label },
    className: nodeClass(node, selectedStepId),
    selected: node.stepId !== null && node.stepId === selectedStepId,
  }));

  const edges: Edge[] = model.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: edge.kind === 'route' ? 'smoothstep' : 'default',
    label: edge.label ?? undefined,
    markerEnd: { type: MarkerType.ArrowClosed },
  }));

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    const stepId = model.nodes.find((item) => item.id === node.id)?.stepId ?? null;
    if (stepId !== null) {
      onSelectStep(stepId);
    }
  };

  return (
    <div className="tab-diagram">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        deleteKeyCode={null}
        fitView
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
