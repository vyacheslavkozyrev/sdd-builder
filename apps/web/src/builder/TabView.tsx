// Workflow tabs: a tab bar from tabsFor, an add-tab form and the step list of the selected tab.
// The view only calls the state functions in tab-state.ts; a refused edit shows its message and
// leaves the map as it was.
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Scope } from '@sddbuilder/core';
import { addTab, tabsFor } from './tab-state.js';
import { StepList } from './StepList.js';
import type { MapState } from './map-state.js';

const SCOPES: readonly Scope[] = ['project', 'feature', 'task'];

interface TabViewProps {
  map: MapState;
  onChange: (state: MapState) => void;
}

export function TabView({ map, onChange }: TabViewProps) {
  const tabs = tabsFor(map.workflows);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<Scope>('feature');
  const [message, setMessage] = useState<string | null>(null);

  // A workflow removed on the map may have been selected here; fall back to the first tab.
  const selected = tabs.find((tab) => tab.id === selectedId) ?? tabs[0];
  const workflow = map.workflows.find((w) => w.id === selected?.id);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addTab(map, name, scope);
    if (result.ok) {
      onChange(result.state);
      setName('');
      setMessage(null);
    } else {
      setMessage(result.message);
    }
  }

  function handleScope(value: string) {
    const next = SCOPES.find((item) => item === value);
    if (next !== undefined) {
      setScope(next);
    }
  }

  return (
    <section aria-label="Workflow tabs">
      <nav aria-label="Workflow tab list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={tab.id === selected?.id}
            onClick={() => setSelectedId(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </nav>

      <form onSubmit={handleAdd}>
        <label>
          Tab name{' '}
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
        <button type="submit">Add tab</button>
      </form>
      {message !== null && <p role="alert">{message}</p>}

      {workflow !== undefined && <StepList key={workflow.id} map={map} workflow={workflow} onChange={onChange} />}
    </section>
  );
}
