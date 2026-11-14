// Connection editor: the panel for the selected connection. It only calls setArtifact and setGate
// from map-state.ts, which hold every rule. A refused gate leaves the map as it was.
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { GateType, MapConnection } from '@sddbuilder/core';
import { setArtifact, setGate } from './map-state.js';
import type { MapState } from './map-state.js';

const GATE_OPTIONS: readonly { value: GateType | ''; label: string }[] = [
  { value: '', label: 'No gate' },
  { value: 'approval', label: 'approval' },
  { value: 'checks', label: 'checks' },
  { value: 'review', label: 'review' },
  { value: 'diff-size', label: 'diff-size' },
];

interface ConnectionEditorProps {
  map: MapState;
  connection: MapConnection;
  onChange: (state: MapState) => void;
}

export function ConnectionEditor({ map, connection, onChange }: ConnectionEditorProps) {
  const [artifact, setArtifactText] = useState(connection.artifact ?? '');
  const [gateType, setGateType] = useState<GateType | ''>(connection.gate?.type ?? '');
  const [threshold, setThreshold] = useState(
    connection.gate?.threshold === undefined ? '' : String(connection.gate.threshold),
  );
  const [message, setMessage] = useState<string | null>(null);

  const from = map.workflows.find((w) => w.id === connection.from)?.name ?? connection.from;
  const to = map.workflows.find((w) => w.id === connection.to)?.name ?? connection.to;

  function handleGateType(value: string) {
    const option = GATE_OPTIONS.find((item) => item.value === value);
    if (option !== undefined) {
      setGateType(option.value);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Both edits run on the same base map. Only a fully accepted result replaces the state.
    const withArtifact = setArtifact(map, connection.id, artifact);
    const result = setGate(withArtifact, connection.id, gateType === '' ? null : gateType, threshold);
    if (result.ok) {
      onChange(result.state);
      // Show the stored label (trimmed, or empty when cleared), not the raw text typed.
      setArtifactText(result.state.connections.find((c) => c.id === connection.id)?.artifact ?? '');
      setMessage(null);
    } else {
      setMessage(result.message);
    }
  }

  return (
    <section aria-label="Connection editor">
      <h2>
        {from} → {to}
      </h2>
      <form onSubmit={handleSubmit}>
        <label>
          Artifact{' '}
          <input value={artifact} onChange={(event) => setArtifactText(event.target.value)} />
        </label>{' '}
        <label>
          Gate{' '}
          <select value={gateType} onChange={(event) => handleGateType(event.target.value)}>
            {GATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>{' '}
        {gateType === 'diff-size' && (
          <label>
            Threshold{' '}
            <input
              value={threshold}
              inputMode="numeric"
              onChange={(event) => setThreshold(event.target.value)}
            />
          </label>
        )}{' '}
        <button type="submit">Save connection</button>
      </form>
      {message !== null && <p role="alert">{message}</p>}
    </section>
  );
}
