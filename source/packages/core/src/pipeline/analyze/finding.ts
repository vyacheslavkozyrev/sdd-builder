// The finding shape of the structural checks (architecture.md §6 decision 10, §12). A finding names the
// item it is about by `path`; the flow and block positions used to order findings are internal and never
// leave the analysis.

export type Severity = 'blocker' | 'warning';

export interface Finding {
  severity: Severity;
  path: string;
  message: string;
}

// A finding as a rule produces it, with the position of the item it names. `flow` and `block` are indexes
// into the document order; `-1` means a pipeline-level item (no flow, or no block inside a flow).
export interface LocatedFinding extends Finding {
  flow: number;
  block: number;
}
