import { useState } from 'react';
import { BriefForm } from './brief/BriefForm.js';
import { emptyBrief } from './brief/state.js';
import type { BriefState } from './brief/state.js';
import { Builder } from './builder/Builder.js';
import { startState } from './builder/map-state.js';
import type { MapState } from './builder/map-state.js';

type View = 'brief' | 'builder';

/**
 * The page. The brief and the builder map live in React memory only, so nothing is stored in the
 * browser and a reload starts clean from the reference process (F-05 AC-024, AC-025; F-06 AC-003,
 * AC-004). Both views stay mounted and only the inactive one is hidden, so switching keeps the
 * brief's last analysis and the map's node positions.
 */
export function App() {
  const [brief, setBrief] = useState<BriefState>(emptyBrief);
  const [map, setMap] = useState<MapState>(startState);
  const [view, setView] = useState<View>('brief');
  return (
    <>
      <nav className="view-switch" aria-label="Views">
        <button type="button" aria-pressed={view === 'brief'} onClick={() => setView('brief')}>
          Brief
        </button>
        <button type="button" aria-pressed={view === 'builder'} onClick={() => setView('builder')}>
          Builder
        </button>
      </nav>
      <div hidden={view !== 'brief'}>
        <BriefForm brief={brief} map={map} onChange={setBrief} />
      </div>
      <div hidden={view !== 'builder'}>
        <Builder map={map} onChange={setMap} />
      </div>
    </>
  );
}
