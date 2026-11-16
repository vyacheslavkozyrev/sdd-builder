// The flow tab: the blocks of one flow in order, the flow toolbox, the selected block with Move up and Move down, and
// the Connections drawn as a list between the numbered blocks (F-06 AC-017 to AC-021). The read model is `flowTabView`;
// the rules are `addBlock`, `addFlowConnection` and `moveBlock`. This view only binds them and keeps the selection in
// React memory. The property panels and the footer are the Inspector (T018), not this view.
import { useState } from 'react';
import type { pipeline } from '@sddbuilder/core';
import { addBlock, addFlowConnection, moveBlock } from './block-edit.js';
import type { BlockEdit, MoveDirection } from './block-edit.js';
import { flowTabView } from './tab-view.js';
import type { FlowBox, ToolboxKind } from './tab-view.js';

type ProjectConfig = pipeline.ProjectConfig;

const NO_SELECTION_FOR_CONNECTION = 'Select a block first: a connection joins it to the block after it. Nothing was added.';
const NO_BLOCK_AFTER = 'The selected block has no block after it to join. Nothing was added.';

export interface FlowTabProps {
  config: ProjectConfig;
  flowId: string;
  onChange: (config: ProjectConfig) => void;
}

export function FlowTab({ config, flowId, onChange }: FlowTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [artifactLabel, setArtifactLabel] = useState('');

  // A block removed from the configuration leaves the selection with nothing to point at; it is dropped here.
  const everything = flowTabView(config, flowId);
  const known = new Set([...everything.boxes, ...everything.arrows].map((item) => item.id));
  const selected = selectedId !== null && known.has(selectedId) ? selectedId : null;
  const view = flowTabView(config, flowId, selected);

  function apply(edit: BlockEdit) {
    if (edit.ok) {
      onChange(edit.config);
      setSelectedId(edit.id);
      setMessage(null);
    } else {
      setMessage(edit.message);
    }
  }

  function addFromToolbox(kind: ToolboxKind) {
    if (kind === 'connection') {
      apply(connectToNext(config, flowId, view.boxes, selected, artifactLabel.trim()));
      return;
    }
    apply(addBlock(config, flowId, kind, selected));
  }

  function move(direction: MoveDirection) {
    if (selected === null) return;
    apply(moveBlock(config, flowId, selected, direction));
  }

  const moveDisabled = (direction: MoveDirection) =>
    selected === null || !moveBlock(config, flowId, selected, direction).ok;

  return (
    <section aria-label="Flow tab" style={{ display: 'flex', gap: 16 }}>
      <aside style={{ width: 200 }}>
        <section aria-label="Flow toolbox">
          <h2>Toolbox</h2>
          {view.toolbox.map((item) => (
            <div key={item.kind} style={itemStyle}>
              <button type="button" disabled={item.disabled} onClick={() => addFromToolbox(item.kind)}>
                {item.label}
              </button>
              {item.kind === 'connection' && (
                <input
                  type="text"
                  aria-label="Connection artifact label"
                  aria-required="true"
                  placeholder="Artifact label (required)"
                  value={artifactLabel}
                  onChange={(event) => setArtifactLabel(event.target.value)}
                />
              )}
              <div>{item.hint}</div>
              {item.reason !== null && <div role="note">{item.reason}</div>}
            </div>
          ))}
          <p>Click to add after the selected block, or at the end of the flow when none is selected.</p>
        </section>

        <section aria-label="Selected block">
          <h2>Selected block</h2>
          <button type="button" disabled={moveDisabled('up')} onClick={() => move('up')}>
            Move up
          </button>{' '}
          <button type="button" disabled={moveDisabled('down')} onClick={() => move('down')}>
            Move down
          </button>
          <p>Select a block to move it. Start stays first; End stays last.</p>
        </section>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h2>Flow: {view.name}</h2>
        {message !== null && <p role="alert">{message}</p>}

        <ol aria-label="Blocks in order" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {view.boxes.map((box) => (
            <li key={box.id}>
              <BlockBox box={box} selected={box.id === selected} onSelect={() => setSelectedId(box.id)} />
            </li>
          ))}
        </ol>

        <section aria-label="Connections in the flow">
          <h3>Connections</h3>
          {view.arrows.length === 0 ? (
            <p>No connection yet.</p>
          ) : (
            <ul>
              {view.arrows.map((arrow) => (
                <li key={arrow.id}>
                  #{arrow.fromNumber} to #{arrow.toNumber}
                  {arrow.label !== null ? `: ${arrow.label}` : ''}
                  {arrow.enabled ? '' : ' (off)'}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}

interface BlockBoxProps {
  box: FlowBox;
  selected: boolean;
  onSelect: () => void;
}

function BlockBox({ box, selected, onSelect }: BlockBoxProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      style={{
        ...boxStyle,
        ...(selected ? selectedBoxStyle : {}),
        ...(box.enabled ? {} : offBoxStyle),
      }}
    >
      <span>#{box.number}</span> <strong>{box.title}</strong> <span>{box.subtitle}</span>
      {box.enabled ? '' : ' (off)'}
    </button>
  );
}

/**
 * A Connection from the selected block to the block after it in the flow, carrying the typed artifact label (F-06
 * AC-008). A blank label is refused by `addFlowConnection` with its own message.
 */
function connectToNext(
  config: ProjectConfig,
  flowId: string,
  boxes: readonly FlowBox[],
  selectedId: string | null,
  artifact: string,
): BlockEdit {
  if (selectedId === null) {
    return { ok: false, message: NO_SELECTION_FOR_CONNECTION };
  }
  const at = boxes.findIndex((box) => box.id === selectedId);
  const next = at === -1 ? undefined : boxes[at + 1];
  if (next === undefined) {
    return { ok: false, message: NO_BLOCK_AFTER };
  }
  return addFlowConnection(config, flowId, selectedId, next.id, artifact);
}

const itemStyle = {
  border: '1px solid #d4d4d8',
  borderRadius: 6,
  padding: '6px 8px',
  marginBottom: 8,
} as const;

const boxStyle = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  border: '1px solid #18181b',
  borderRadius: 8,
  padding: '8px 10px',
  marginBottom: 8,
  background: '#ffffff',
} as const;

const selectedBoxStyle = { borderColor: '#2563eb', borderWidth: 2, background: '#eff6ff' } as const;

const offBoxStyle = { borderStyle: 'dashed', borderColor: '#a1a1aa', background: '#fafafa' } as const;
