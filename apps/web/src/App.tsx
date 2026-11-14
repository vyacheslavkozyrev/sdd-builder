import { useState } from 'react';
import { BriefForm } from './brief/BriefForm.js';
import { emptyBrief } from './brief/state.js';
import type { BriefState } from './brief/state.js';

/**
 * The page. The brief lives in React memory only, so nothing is stored in the browser and a reload
 * starts clean (F-05 AC-024, AC-025).
 */
export function App() {
  const [brief, setBrief] = useState<BriefState>(emptyBrief);
  return <BriefForm brief={brief} onChange={setBrief} />;
}
