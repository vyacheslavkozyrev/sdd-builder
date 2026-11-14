// Top-level builder view: shows the global map and the workflow tabs for the map state it is given.
// The state is owned by App (F-06 AC-003) and passed in; every edit goes through the state
// functions in map-state.ts, tab-state.ts and step-state.ts. This view holds no rules of its own.
import { MapView } from './MapView.js';
import { TabView } from './TabView.js';
import type { MapState } from './map-state.js';

interface BuilderProps {
  map: MapState;
  onChange: (state: MapState) => void;
}

export function Builder({ map, onChange }: BuilderProps) {
  return (
    <>
      <MapView map={map} onChange={onChange} />
      <TabView map={map} onChange={onChange} />
    </>
  );
}
