// Top-level builder view: owns the map state in React memory (F-06 AC-003) and shares it between
// the global map and the workflow tabs. Every edit goes through the state functions in map-state.ts,
// tab-state.ts and step-state.ts; this view holds no rules of its own.
import { useState } from 'react';
import { MapView } from './MapView.js';
import { TabView } from './TabView.js';
import { startState } from './map-state.js';
import type { MapState } from './map-state.js';

export function Builder() {
  const [map, setMap] = useState<MapState>(startState);
  return (
    <>
      <MapView map={map} onChange={setMap} />
      <TabView map={map} onChange={setMap} />
    </>
  );
}
