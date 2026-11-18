// The structure marks as the Pipeline canvas shows them (F-11 AC-035 to AC-037; screens 06, 07 and 11). A mark is one
// finding of `marksFor`: its severity colour, the word for the severity and its message. A mark beside a flow box or
// on an arrow has no path; a mark under the canvas (Not on a drawn item) shows its path too. These components only show
// text: a mark never disables an edit (AC-037).

import { Box, Typography } from '@mui/material';
import type { pipeline } from '@sddbuilder/core';

type Finding = pipeline.Finding;
type Severity = pipeline.Severity;

export const NOT_DRAWN_HEADING = 'Not on a drawn item';

const SEVERITY_WORD: Record<Severity, string> = { blocker: 'Blocker', warning: 'Warning' };

// Red for a blocker, amber for a warning (screen 06). The word says the severity too, so colour is not the only cue.
const MARK_COLOURS: Record<Severity, { bgcolor: string; borderColor: string; color: string }> = {
  blocker: { bgcolor: '#fef2f2', borderColor: '#dc2626', color: '#b91c1c' },
  warning: { bgcolor: '#fffbeb', borderColor: '#f59e0b', color: '#b45309' },
};
const MARK_SX = { border: '1px solid', borderRadius: '6px', px: 1, py: 0.5, textAlign: 'left' } as const;
const MARK_TEXT_SX = { fontSize: 11, fontWeight: 700, lineHeight: 1.35 } as const;
const PATH_SX = { fontSize: 10, color: '#475569', lineHeight: 1.35 } as const;
const STACK_SX = { display: 'flex', flexDirection: 'column', gap: 0.5 } as const;
const SECTION_SX = { px: 1.5, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 } as const;
const HEADING_SX = { fontSize: 12, fontWeight: 700, color: '#334155', pt: 1 } as const;
const NOTE_TEXT_SX = { fontSize: 11, color: '#475569', px: 1.5, pt: 0.5 } as const;

// The text of a mark: "Blocker · The flow has no End block. Add at least one End block." (the words of screen 06).
export function markText(finding: Finding): string {
  return `${SEVERITY_WORD[finding.severity]} · ${finding.message}`;
}

interface FindingMarkProps {
  readonly finding: Finding;
  readonly showPath: boolean;
}

// One mark: its message in its severity colour, and its path when it is listed under the canvas.
function FindingMark({ finding, showPath }: FindingMarkProps) {
  const colours = MARK_COLOURS[finding.severity];
  return (
    <Box data-severity={finding.severity} sx={{ ...MARK_SX, ...colours }}>
      <Typography sx={{ ...MARK_TEXT_SX, color: colours.color }}>{markText(finding)}</Typography>
      {showPath ? <Typography sx={PATH_SX}>path: {finding.path}</Typography> : null}
    </Box>
  );
}

export interface FlowMarksProps {
  readonly findings: readonly Finding[];
}

// The marks of one flow box, stacked under it (AC-035). The caller places the stack beside the box.
export function FlowMarks({ findings }: FlowMarksProps) {
  return (
    <Box sx={STACK_SX}>
      {findings.map((finding, index) => (
        <FindingMark key={index} finding={finding} showPath={false} />
      ))}
    </Box>
  );
}

export interface ArrowLabelProps {
  readonly text: string;
  readonly findings: readonly Finding[];
}

// The label of an arrow: its artifact label and gate on the first line, and the arrow's marks under it (AC-035).
export function ArrowLabel({ text, findings }: ArrowLabelProps) {
  return (
    <Box sx={STACK_SX}>
      <Typography sx={{ fontSize: 11, color: '#0f172a', bgcolor: '#ffffff', lineHeight: 1.35 }}>{text}</Typography>
      {findings.length === 0 ? null : <FlowMarks findings={findings} />}
    </Box>
  );
}

// The notes of screens 06 and 11: the marks update with each edit and never block one, and brief problems are not shown
// on this tab (AC-037, AC-038). The first is shown while any mark is shown; the second in the empty state.
export const MARKS_NOTE =
  'Marks update as you edit. A blocker never stops an edit: Delete and Add stay enabled. Brief problems (name, idea, stack, rules) are not shown here; they appear at Analyze.';
export const EMPTY_MARKS_NOTE =
  'The last flow was deleted. Deleting the last flow is allowed; no edit is blocked. The mark stays until a flow is added with +.';

export interface MarksNoteProps {
  readonly text: string;
}

export function MarksNote({ text }: MarksNoteProps) {
  return <Typography sx={NOTE_TEXT_SX}>{text}</Typography>;
}

export interface NotDrawnMarksProps {
  readonly findings: readonly Finding[];
}

// The marks that name no drawn item, under the canvas, each with its message and its path (AC-036). Nothing is shown
// when there are none.
export function NotDrawnMarks({ findings }: NotDrawnMarksProps) {
  if (findings.length === 0) {
    return null;
  }
  return (
    <Box component="section" aria-label={NOT_DRAWN_HEADING} sx={SECTION_SX}>
      <Typography component="h3" sx={HEADING_SX}>
        {NOT_DRAWN_HEADING}
      </Typography>
      {findings.map((finding, index) => (
        <FindingMark key={index} finding={finding} showPath />
      ))}
    </Box>
  );
}
