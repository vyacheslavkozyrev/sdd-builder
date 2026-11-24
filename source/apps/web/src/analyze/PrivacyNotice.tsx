import { Box, Button, Checkbox, CircularProgress, FormControlLabel, Typography, useTheme } from '@mui/material';
import { getAnalyzeStepStyles } from './analyzeStepStyles.js';

// The privacy notice above Analyze (F-13 AC-001 to AC-004, screens 01 and 02). It states that the brief and the
// pipeline go to the model provider and that the server does not store or log the brief. The checkbox is
// unticked when the step opens; Analyze is disabled until it is ticked. The tick is held by the step (AnalyzeStep),
// so this component only shows it and reports changes. While the analysis is pending, Analyze shows a progress mark and
// is disabled (AC-006); the step's action refuses a second run as well.

export const PRIVACY_CHECKBOX_LABEL = 'I have read the notice. Send the brief for review.';
export const ANALYZE_REASON = 'Tick the box to analyse';
const ANALYZE_REASON_ID = 'analyze-reason';

export interface PrivacyNoticeProps {
  readonly ticked: boolean;
  readonly pending: boolean;
  readonly onTickedChange: (ticked: boolean) => void;
  readonly onAnalyze: () => void;
}

export function PrivacyNotice({ ticked, pending, onTickedChange, onAnalyze }: PrivacyNoticeProps) {
  const styles = getAnalyzeStepStyles(useTheme());
  return (
    <>
      <Box sx={styles.notice}>
        <Typography component="p" sx={styles.noticeTitle}>
          Privacy notice
        </Typography>
        <Typography component="p" sx={styles.noticeText}>
          Analyze sends the brief and the pipeline to the model provider for review.
        </Typography>
        <Typography component="p" sx={styles.noticeText}>
          The server does not store or log the brief.
        </Typography>
      </Box>
      <FormControlLabel
        sx={styles.checkboxRow}
        control={
          <Checkbox
            checked={ticked}
            onChange={(event) => {
              onTickedChange(event.target.checked);
            }}
            sx={styles.checkbox}
          />
        }
        label={<Typography component="span" sx={styles.checkboxLabel}>{PRIVACY_CHECKBOX_LABEL}</Typography>}
      />
      <Box sx={styles.analyzeRow}>
        <Button
          variant="contained"
          disableElevation
          disabled={!ticked || pending}
          onClick={onAnalyze}
          aria-busy={pending}
          aria-describedby={ticked ? undefined : ANALYZE_REASON_ID}
          sx={styles.analyzeButton}
        >
          Analyze
          {pending ? <CircularProgress aria-hidden size={14} sx={styles.spinner} /> : null}
        </Button>
        {ticked ? null : (
          <Typography id={ANALYZE_REASON_ID} component="span" sx={styles.reason}>
            {ANALYZE_REASON}
          </Typography>
        )}
      </Box>
    </>
  );
}
