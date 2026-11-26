import type { Flow } from '../model.js';
import { fileNameOf } from './file-name.js';

// The file name of a flow's command, without the `.md` (F-16, AC-013): the flow's name, as `fileNameOf` gives it. The
// flow id is never used, since it is a GUID.
export function flowFileName(flow: Flow): string {
  return fileNameOf(flow.name);
}
