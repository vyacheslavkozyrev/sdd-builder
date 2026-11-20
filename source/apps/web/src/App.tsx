import { AppFrame } from './layout/AppFrame.js';

// The application root (F-07 AC-008). It renders the shared frame, so the left panel and the
// footer appear on the first screen. The centre area is empty until the wizard arrives in F-08.

// New project starts the wizard only in F-08; until then the click does nothing.
const onNewProject = (): void => undefined;

export function App() {
  return <AppFrame onNewProject={onNewProject} />;
}
