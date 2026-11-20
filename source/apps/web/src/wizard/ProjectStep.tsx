import { Box, TextField, Typography, useTheme } from '@mui/material';
import { IDEA_LIMIT, NAME_LIMIT, codePointCount, ideaCounterText, limitToCodePoints } from './project.js';
import { IDEA_ROWS, getProjectStepStyles } from './projectStepStyles.js';
import type { ProjectValuesPatch, WizardValues } from './state.js';

// The project step body (F-09, screen 01 to 03): the project name and the idea. The name is a
// single-line field with no counter; the idea is a multi-line field with the counter N / 5,000.
// Both fields are limited on every change, so a paste is limited too (AC-003, AC-007, AC-008).
// The text is stored as typed; only the limit is applied here. Nothing is stored or logged.

export const NAME_HELP_LINE =
  'Up to 100 characters; text past the limit is cut. It appears as the project name in the generated CLAUDE.md.';
export const IDEA_HELP_LINES = [
  'Describe what the product does and who uses it. Leave out how it is built.',
  'Nothing is stored between visits. Reloading clears the wizard.',
  'Up to 5,000 characters. Text past the limit is cut.',
] as const;
export const NAME_LIMIT_NOTE =
  '100 characters: the limit is reached. Text past the limit is cut, also when pasted.';
export const IDEA_LIMIT_NOTE = 'The idea is at the limit of 5,000 characters. Text past it is cut, also when pasted.';

const NAME_PLACEHOLDER = 'Name your project';
const IDEA_PLACEHOLDER = 'For example: a tracker for hourly work.';

export interface ProjectStepProps {
  readonly values: WizardValues;
  readonly onChange: (patch: ProjectValuesPatch) => void;
}

export function ProjectStep({ values, onChange }: ProjectStepProps) {
  const styles = getProjectStepStyles(useTheme());
  const nameAtLimit = codePointCount(values.name) >= NAME_LIMIT;
  const ideaAtLimit = codePointCount(values.idea) >= IDEA_LIMIT;
  const counter = ideaCounterText(values.idea);

  return (
    <Box sx={styles.root}>
      <Typography component="label" htmlFor="project-name" sx={styles.nameLabel}>
        Project name
        <Box component="span" aria-hidden="true" sx={styles.required}>
          {' *'}
        </Box>
      </Typography>
      <TextField
        id="project-name"
        required
        value={values.name}
        placeholder={NAME_PLACEHOLDER}
        onChange={(event) => {
          onChange({ name: limitToCodePoints(event.target.value, NAME_LIMIT) });
        }}
        sx={styles.nameField}
        slotProps={{ htmlInput: { 'aria-describedby': 'project-name-help' } }}
      />
      {nameAtLimit ? (
        <Typography id="project-name-help" component="p" sx={styles.nameNote}>
          {NAME_LIMIT_NOTE}
        </Typography>
      ) : (
        <Typography id="project-name-help" component="p" sx={styles.nameHelp}>
          {NAME_HELP_LINE}
        </Typography>
      )}

      <Typography component="label" htmlFor="project-idea" sx={styles.ideaLabel}>
        Idea
        <Box component="span" aria-hidden="true" sx={styles.required}>
          {' *'}
        </Box>
      </Typography>
      <TextField
        id="project-idea"
        required
        multiline
        rows={IDEA_ROWS}
        value={values.idea}
        placeholder={IDEA_PLACEHOLDER}
        onChange={(event) => {
          onChange({ idea: limitToCodePoints(event.target.value, IDEA_LIMIT) });
        }}
        sx={styles.ideaField}
      />

      <Box sx={styles.counterRow}>
        {ideaAtLimit ? null : (
          <Typography component="p" sx={styles.counterHelp}>
            {IDEA_HELP_LINES[0]}
          </Typography>
        )}
        {ideaAtLimit ? (
          <Typography component="p" sx={styles.limitCounter}>
            {counter}
          </Typography>
        ) : (
          <Typography component="p" sx={styles.counter}>
            {counter}
          </Typography>
        )}
      </Box>
      {ideaAtLimit ? (
        <>
          <Box sx={styles.noteBox}>
            <Typography component="p" sx={styles.noteText}>
              {IDEA_LIMIT_NOTE}
            </Typography>
          </Box>
          <Typography component="p" sx={styles.helpAfterNote}>
            {IDEA_HELP_LINES[0]}
          </Typography>
        </>
      ) : null}
      <Typography component="p" sx={styles.help}>
        {IDEA_HELP_LINES[1]}
      </Typography>
      <Typography component="p" sx={styles.help}>
        {IDEA_HELP_LINES[2]}
      </Typography>
    </Box>
  );
}
