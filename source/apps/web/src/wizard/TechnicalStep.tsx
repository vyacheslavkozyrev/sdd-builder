import { Box, TextField, Typography, useTheme } from '@mui/material';
import { NAME_LIMIT, limitToCodePoints } from './project.js';
import { ARCHITECTURE_LIMIT } from './technical.js';
import { RuleList, type RuleActions } from './RuleList.js';
import { ARCHITECTURE_ROWS, getTechnicalStepStyles } from './technicalStepStyles.js';
import type { ProjectValuesPatch, StackValues, WizardValues } from './state.js';

// The technical details step body (F-10, screen 01): the five stack fields and the architecture text.
// The stack fields are single-line and limited to 100 characters; the architecture is multi-line and
// limited to 5,000 characters. Both limits apply on every change, so a paste is limited too
// (AC-004, AC-006). The text is stored as typed; only the limit is applied here. Nothing is stored or
// logged. The rule list of the right column (RuleList) sits beside the stack in the same card.

export const STACK_HELP_LINES = [
  'Language is required. The other four are optional.',
  'Up to 100 characters each; text past the limit is cut.',
] as const;
export const ARCHITECTURE_HELP_LINE = 'Up to 5,000 characters. Text past the limit is cut, also when pasted.';

type StackKey = keyof StackValues;

// The stack fields in screen order: two per row, the language first and the only required one (AC-002).
const STACK_FIELDS: ReadonlyArray<{ readonly key: StackKey; readonly label: string; readonly required: boolean }> = [
  { key: 'language', label: 'Language', required: true },
  { key: 'framework', label: 'Framework', required: false },
  { key: 'platform', label: 'Platform', required: false },
  { key: 'buildTool', label: 'Build tool', required: false },
  { key: 'testFramework', label: 'Test framework', required: false },
];

// The patch that sets one stack field and leaves the other four as they are.
function stackPatch(key: StackKey, value: string): ProjectValuesPatch {
  const stack: Partial<Record<StackKey, string>> = {};
  stack[key] = value;
  return { stack };
}

export interface TechnicalStepProps {
  readonly values: WizardValues;
  readonly onChange: (patch: ProjectValuesPatch) => void;
  readonly ruleActions: RuleActions;
}

export function TechnicalStep({ values, onChange, ruleActions }: TechnicalStepProps) {
  const styles = getTechnicalStepStyles(useTheme());

  return (
    <Box sx={styles.root}>
      <Box sx={styles.column}>
        <Typography component="h2" sx={styles.sectionTitle}>
          Stack
        </Typography>
        <Box sx={styles.stackGrid}>
          {STACK_FIELDS.map((field) => (
            <Box key={field.key} sx={styles.stackCell}>
              <Typography component="label" htmlFor={`technical-${field.key}`} sx={styles.fieldLabel}>
                {field.label}
                {field.required ? (
                  <Box component="span" aria-hidden="true" sx={styles.required}>
                    {' *'}
                  </Box>
                ) : null}
              </Typography>
              <TextField
                id={`technical-${field.key}`}
                required={field.required}
                value={values.stack[field.key]}
                onChange={(event) => {
                  onChange(stackPatch(field.key, limitToCodePoints(event.target.value, NAME_LIMIT)));
                }}
                sx={styles.singleField}
              />
            </Box>
          ))}
        </Box>
        <Typography component="p" sx={styles.stackHelp}>
          {STACK_HELP_LINES[0]}
        </Typography>
        <Typography component="p" sx={styles.help}>
          {STACK_HELP_LINES[1]}
        </Typography>

        <Typography component="label" htmlFor="technical-architecture" sx={styles.architectureLabel}>
          Architecture (optional)
        </Typography>
        <TextField
          id="technical-architecture"
          multiline
          rows={ARCHITECTURE_ROWS}
          value={values.architecture}
          onChange={(event) => {
            onChange({ architecture: limitToCodePoints(event.target.value, ARCHITECTURE_LIMIT) });
          }}
          sx={styles.architectureField}
          slotProps={{ htmlInput: { 'aria-describedby': 'technical-architecture-help' } }}
        />
        <Typography id="technical-architecture-help" component="p" sx={styles.architectureHelp}>
          {ARCHITECTURE_HELP_LINE}
        </Typography>
      </Box>
      <Box sx={styles.divider} />
      <RuleList rules={values.rules} actions={ruleActions} />
    </Box>
  );
}
