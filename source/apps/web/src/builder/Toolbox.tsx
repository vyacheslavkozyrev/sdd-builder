// The Map toolbox: an Approval and a Check are dragged onto a connection's arrow; a Connection is listed with its hint
// (F-06 AC-010, AC-011). The drag carries the gate kind in its data transfer; the Map tab reads it on drop.
import type { ToolboxItem } from './map-tab-view.js';

/** The data transfer type a toolbox gate carries when it is dragged. */
export const GATE_DRAG_TYPE = 'application/x-sddbuilder-gate';

/** The gates a drag can carry: an Approval, or a Check (its type is chosen in its panel). */
export type GateKind = 'approval' | 'check';

/** True when a value read from a drag is one of the gate kinds. Anything else is ignored by the drop. */
export function isGateKind(value: string): value is GateKind {
  return value === 'approval' || value === 'check';
}

interface ToolboxProps {
  items: readonly ToolboxItem[];
}

export function Toolbox({ items }: ToolboxProps) {
  return (
    <section aria-label="Map toolbox">
      <h2>Toolbox</h2>
      {items.map((item) => {
        const kind = item.kind;
        if (!isGateKind(kind)) {
          return (
            <div key={kind} style={itemStyle}>
              <strong>{item.label}</strong>
              <div>{item.hint}</div>
            </div>
          );
        }
        return (
          <div
            key={kind}
            draggable
            style={{ ...itemStyle, cursor: 'grab' }}
            onDragStart={(event) => {
              event.dataTransfer.setData(GATE_DRAG_TYPE, kind);
              event.dataTransfer.effectAllowed = 'copy';
            }}
          >
            <strong>{item.label}</strong>
            <div>{item.hint}</div>
          </div>
        );
      })}
      <p>Drop a gate on the dashed target to place it. Keyboard and touch users add it from the connection panel.</p>
    </section>
  );
}

const itemStyle = {
  border: '1px solid #d4d4d8',
  borderRadius: 6,
  padding: '6px 8px',
  marginBottom: 8,
} as const;
