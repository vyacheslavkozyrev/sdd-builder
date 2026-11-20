// A structural finding (F-03). A blocker stops the build; a warning is shown and does not.
export type Severity = 'blocker' | 'warning';

export interface Finding {
  readonly severity: Severity;
  readonly rule: string;
  readonly path: string;
  readonly message: string;
}

// Where a finding sits in the document, used only to sort the findings. A level that does not apply
// is -1: a pipeline-level item has flow -1, a flow-level item has block -1, and a block item has slot -1.
// A route is slot 0 (`true`) or 1 (`false`), so the `true` route sorts before the `false` route.
export interface Position {
  readonly flow: number;
  readonly block: number;
  readonly slot: number;
}

export interface PositionedFinding extends Finding {
  readonly position: Position;
}
