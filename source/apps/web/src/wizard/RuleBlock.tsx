import { Box, Button, TextField, Typography, useTheme } from '@mui/material';
import { NAME_LIMIT, limitToCodePoints } from './project.js';
import { RULE_DESCRIPTION_LIMIT, ruleFileLine, ruleIdProblem, ruleIdProblemMessage } from './technical.js';
import { getRuleBlockStyles } from './ruleBlockStyles.js';
import type { RuleValues, RulePatch } from './state.js';

// One rule block of the technical details step (F-10, screen 01 and 03). The name is a single-line field
// limited to 100 characters; the file line shows `.claude/rules/<id>.md`, or the id message in its place
// when the derived id is refused. The description is multi-line and limited to 1,000 characters. Both
// limits apply on every change, so a paste is limited too (AC-013, AC-020). Nothing is stored or logged.
// The block is kept as typed: a refused id shows a message and never blocks Next (AC-015 to AC-018).

export const NAME_LABEL = 'Name';
export const DESCRIPTION_LABEL = 'Description';
export const DESCRIPTION_ROWS = 2;

export function duplicateMessage(duplicateOf: number): string {
  return `Same file as rule block ${duplicateOf}. Both are kept.`;
}

export interface RuleBlockProps {
  // The 1-based number of the block in the list, shown in its caption.
  readonly blockNumber: number;
  readonly rule: RuleValues;
  // The number of the first other block that gives the same valid id, or undefined when the id is unique (AC-019).
  readonly duplicateOf: number | undefined;
  readonly onChange: (patch: RulePatch) => void;
  readonly onRemove: () => void;
}

export function RuleBlock({ blockNumber, rule, duplicateOf, onChange, onRemove }: RuleBlockProps) {
  const styles = getRuleBlockStyles(useTheme());
  const problem = ruleIdProblem(rule.name);
  const problemMessage = ruleIdProblemMessage(problem);

  return (
    <Box sx={styles.root}>
      <Box sx={styles.header}>
        <Typography component="p" sx={styles.caption}>
          {`Rule block ${blockNumber}`}
        </Typography>
        <Button
          variant="outlined"
          aria-label={`Remove rule block ${blockNumber}`}
          onClick={onRemove}
          sx={styles.removeButton}
        >
          −
        </Button>
      </Box>

      <Typography component="label" htmlFor={`rule-name-${blockNumber}`} sx={styles.nameLabel}>
        {NAME_LABEL}
      </Typography>
      <TextField
        id={`rule-name-${blockNumber}`}
        value={rule.name}
        onChange={(event) => {
          onChange({ name: limitToCodePoints(event.target.value, NAME_LIMIT) });
        }}
        sx={styles.nameField}
      />

      {problemMessage === undefined ? (
        <Typography component="p" sx={styles.fileLine}>
          {`File: ${ruleFileLine(rule.name)}`}
        </Typography>
      ) : (
        <Box sx={styles.noteBox}>
          <Typography component="p" sx={styles.noteText}>
            {problemMessage}
          </Typography>
        </Box>
      )}
      {duplicateOf === undefined ? null : (
        <Box sx={styles.noteBox}>
          <Typography component="p" sx={styles.noteText}>
            {duplicateMessage(duplicateOf)}
          </Typography>
        </Box>
      )}

      <Typography component="label" htmlFor={`rule-description-${blockNumber}`} sx={styles.descriptionLabel}>
        {DESCRIPTION_LABEL}
      </Typography>
      <TextField
        id={`rule-description-${blockNumber}`}
        multiline
        rows={DESCRIPTION_ROWS}
        value={rule.description}
        onChange={(event) => {
          onChange({ description: limitToCodePoints(event.target.value, RULE_DESCRIPTION_LIMIT) });
        }}
        sx={styles.descriptionField}
      />
    </Box>
  );
}
