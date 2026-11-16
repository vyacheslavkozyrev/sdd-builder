// The live structural marks of one item, drawn next to it on the Map and the flow tabs (F-06 AC-009, AC-022, AC-036).
// Each mark shows its severity and its message. The marks come from `structuralMarks`, `marksAt` and `unplacedMarks`;
// this view only draws them. A blocker is red and a warning amber, as the approved screens show; an info mark is grey.
import type { UnplacedMark } from './marks.js';

const SEVERITY_LABEL: Record<UnplacedMark['severity'], string> = {
  blocker: 'Blocker',
  warning: 'Warning',
  info: 'Info',
};

const SEVERITY_COLOUR: Record<UnplacedMark['severity'], string> = {
  blocker: '#b91c1c',
  warning: '#b45309',
  info: '#52525b',
};

export interface MarkListProps {
  marks: readonly UnplacedMark[];
}

/** The marks on one item, or the marks the Map lists, in the analyzer's order. Draws nothing when there is no mark. */
export function MarkList({ marks }: MarkListProps) {
  if (marks.length === 0) return null;
  return (
    <ul aria-label="Structural marks" style={listStyle}>
      {marks.map((mark, index) => (
        <li key={index} style={{ color: SEVERITY_COLOUR[mark.severity] }}>
          <strong>{SEVERITY_LABEL[mark.severity]}:</strong> {mark.message}
        </li>
      ))}
    </ul>
  );
}

const listStyle = {
  listStyle: 'none',
  margin: '4px 0',
  padding: 0,
  fontSize: 12,
  lineHeight: 1.3,
} as const;
