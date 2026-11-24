import { Box, Typography, useTheme } from '@mui/material';
import type { AnalysisFinding, AnalysisResult, AnalysisState, FindingSeverity } from './analysisState.js';
import { isGreen } from './analysisState.js';
import { getFindingsStyles } from './findingsStyles.js';
import { errorMessage, problemLines, type FailedOutcome } from './reply.js';

// The findings of the last analysis, the review note, the error box and the result line (F-13 AC-007 to AC-011,
// AC-016; screens 03, 04, 05, 07, 09 and 11). It shows what the analysis state holds and nothing else: no request
// is sent here. The text is plain: a message holding markup is shown as typed (React escapes it).

const REVIEW_NOT_FINISHED = 'The analysis did not finish. Analyze again.';
const GREEN_RESULT ='Result: no blocker and no warning. You can generate the project.';
const WARNING_RESULT = 'Result: a warning is present. Fix it, then Analyze again to generate.';

const SEVERITY_LABELS: Readonly<Record<FindingSeverity, string>> = {
  blocker: 'Blocker',
  warning: 'Warning',
  info: 'Info',
};

// Every finding of a result in the order it is shown: the structural findings, then the review findings (AC-008).
function allFindings(result: AnalysisResult): readonly AnalysisFinding[] {
  return [...result.findings, ...result.review.findings];
}

// "1 blocker, 2 warnings and 1 info", or "no finding" when there is none.
function countText(findings: readonly AnalysisFinding[]): string {
  const count = (severity: FindingSeverity): number => findings.filter((finding) => finding.severity === severity).length;
  const blockers = count('blocker');
  const warnings = count('warning');
  const infos = count('info');
  const parts: string[] = [];
  if (blockers > 0) parts.push(`${blockers} ${blockers === 1 ? 'blocker' : 'blockers'}`);
  if (warnings > 0) parts.push(`${warnings} ${warnings === 1 ? 'warning' : 'warnings'}`);
  if (infos > 0) parts.push(`${infos} info`);
  if (parts.length <= 1) return parts[0] ?? 'no finding';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1] ?? ''}`;
}

export interface ResultLine {
  readonly text: string;
  readonly green: boolean;
}

// The result line for a current result, or `null` when there is none to show. Green wins: it needs no blocker, no
// warning and a review that ran (AC-015, AC-016). Otherwise the first reason that applies is named, in the order of
// the approved screens: an analysis that did not finish, then a blocker, then a warning.
export function resultLine(state: AnalysisState, configKey: string): ResultLine | null {
  if (state.kind !== 'result') return null;
  if (isGreen(state, configKey)) return { text: GREEN_RESULT, green: true };
  const { result } = state;
  const findings = allFindings(result);
  if (result.review.status !== 'ok') {
    return { text: `Result: ${countText(findings)}. The analysis did not finish, so Generate stays off.`, green: false };
  }
  if (findings.some((finding) => finding.severity === 'blocker')) {
    return { text: `Result: ${countText(findings)}. Fix the blocker, then Analyze again.`, green: false };
  }
  if (findings.some((finding) => finding.severity === 'warning')) {
    return { text: WARNING_RESULT, green: false };
  }
  return null;
}

function failedOutcome(status: number | null, body: unknown): FailedOutcome {
  return status === null
    ? { kind: 'network-error', status: null, body: null }
    : { kind: 'http-error', status, body };
}

export interface FindingsProps {
  readonly state: AnalysisState;
  readonly configKey: string;
}

export function Findings({ state, configKey }: FindingsProps) {
  const styles = getFindingsStyles(useTheme());

  if (state.kind === 'not-run' || state.kind === 'pending') return null;

  if (state.kind === 'error') {
    const lines = problemLines(state.body);
    return (
      <Box sx={styles.root}>
        <Box role="alert" sx={styles.note}>
          <Typography component="p" sx={styles.noteText}>
            {errorMessage(failedOutcome(state.status, state.body))}
          </Typography>
          {lines.map((line, index) => (
            <Typography key={index} component="p" sx={styles.noteDetail}>
              {line}
            </Typography>
          ))}
        </Box>
      </Box>
    );
  }

  const { result } = state;
  const line = resultLine(state, configKey);
  return (
    <Box sx={styles.root}>
      {result.review.status === 'ok' ? null : (
        <Box role="alert" sx={styles.note}>
          <Typography component="p" sx={styles.noteText}>
            {REVIEW_NOT_FINISHED}
          </Typography>
        </Box>
      )}
      <Typography component="p" sx={styles.label}>
        Findings
      </Typography>
      <Box component="ul" sx={styles.list}>
        {allFindings(result).map((finding, index) => (
          <Box component="li" key={index} sx={styles.row}>
            <Box sx={styles.rowHead}>
              <Box component="span" sx={styles.pills[finding.severity]}>
                {SEVERITY_LABELS[finding.severity]}
              </Box>
              <Typography component="p" sx={styles.subject}>
                {finding.subject}
              </Typography>
            </Box>
            <Typography component="p" sx={styles.message}>
              {finding.message}
            </Typography>
          </Box>
        ))}
      </Box>
      {line === null ? null : (
        <Typography component="p" sx={styles.result(line.green)}>
          {line.text}
        </Typography>
      )}
    </Box>
  );
}
