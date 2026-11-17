import { Box, TextField, Typography } from '@mui/material';
import type { WizardValues } from './state.js';
import {
  codePointCount,
  ideaCounterText,
  IDEA_LIMIT,
  limitToCodePoints,
  NAME_LIMIT,
} from './project.js';

// The project step body (F-09 AC-001, AC-003, AC-005 to AC-008, AC-012, AC-015).
// The wizard shows it on step 1 in place of the F-08 placeholder (F-09 AC-012). The name is
// a single-line field, the idea a multi-line field with its counter. Both are
// limited on change, so a paste is limited too. The layout follows the approved
// screens in spec/design/features/F-09-project-step/ (01 to 03). The step keeps
// the values in memory only: no storage and no logging (decision 13).

export const NAME_ID = 'project-name';
export const IDEA_ID = 'project-idea';
export const IDEA_COUNTER_ID = 'project-idea-counter';
export const NAME_PLACEHOLDER = 'Name your project';
export const IDEA_PLACEHOLDER = 'For example: a tracker for hourly work.';
export const NAME_HELP =
  'Up to 100 characters; text past the limit is cut. It appears as the project name in the generated CLAUDE.md.';
export const NAME_LIMIT_NOTE =
  '100 characters: the limit is reached. Text past the limit is cut, also when pasted.';
export const IDEA_HELP_DESCRIBE = 'Describe what the product does and who uses it. Leave out how it is built.';
export const IDEA_HELP_STORAGE = 'Nothing is stored between visits. Reloading clears the wizard.';
export const IDEA_HELP_LIMIT = 'Up to 5,000 characters. Text past the limit is cut.';
export const IDEA_LIMIT_NOTE =
  'The idea is at the limit of 5,000 characters. Text past it is cut, also when pasted.';
export const BLANK_NOTE = 'Name and idea are empty. You can still press Next; the analysis on step 4 reports them.';

const CARD_SX = {
  position: 'relative',
  flexGrow: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  px: 6,
  pt: 6,
  pb: 3,
  bgcolor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 6px 20px rgba(79, 70, 229, 0.12)',
  overflow: 'hidden',
} as const;

const ACCENT_SX = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 6,
  background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
} as const;

const LABEL_SX = { fontSize: 12, fontWeight: 600, color: '#334155' } as const;
const REQUIRED_SX = { color: '#dc2626' } as const;
const HELP_SX = { fontSize: 11, color: '#64748b' } as const;
const WARN_SX = { fontSize: 12, fontWeight: 600, color: '#92400e' } as const;
const WARN_BOX_SX = {
  bgcolor: '#fffbeb',
  border: '1px solid #fcd34d',
  borderRadius: '6px',
  px: 2,
  py: 1,
} as const;
const COUNTER_SX = {
  position: 'absolute',
  right: 16,
  bottom: 12,
  fontSize: 11,
  color: '#64748b',
} as const;
const COUNTER_AT_LIMIT_SX = { ...COUNTER_SX, color: '#92400e', fontWeight: 600 } as const;

export interface ProjectStepProps {
  readonly name: string;
  readonly idea: string;
  readonly onChange: (patch: Partial<WizardValues>) => void;
}

export function ProjectStep({ name, idea, onChange }: ProjectStepProps) {
  const nameAtLimit = codePointCount(name) >= NAME_LIMIT;
  const ideaAtLimit = codePointCount(idea) >= IDEA_LIMIT;
  const bothBlank = name.trim() === '' && idea.trim() === '';

  return (
    <Box sx={CARD_SX}>
      <Box aria-hidden="true" sx={ACCENT_SX} />

      <Typography component="label" htmlFor={NAME_ID} sx={LABEL_SX}>
        Project name<Box component="span" sx={REQUIRED_SX}> *</Box>
      </Typography>
      <TextField
        id={NAME_ID}
        value={name}
        onChange={(event) => onChange({ name: limitToCodePoints(event.target.value, NAME_LIMIT) })}
        placeholder={NAME_PLACEHOLDER}
        required
        fullWidth
        size="small"
        helperText={nameAtLimit ? NAME_LIMIT_NOTE : NAME_HELP}
        slotProps={{ formHelperText: { sx: nameAtLimit ? WARN_SX : HELP_SX } }}
      />

      <Typography component="label" htmlFor={IDEA_ID} sx={LABEL_SX}>
        Idea<Box component="span" sx={REQUIRED_SX}> *</Box>
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <TextField
          id={IDEA_ID}
          value={idea}
          onChange={(event) => onChange({ idea: limitToCodePoints(event.target.value, IDEA_LIMIT) })}
          placeholder={IDEA_PLACEHOLDER}
          required
          fullWidth
          multiline
          rows={8}
          slotProps={{ htmlInput: { 'aria-describedby': IDEA_COUNTER_ID } }}
        />
        <Typography id={IDEA_COUNTER_ID} sx={ideaAtLimit ? COUNTER_AT_LIMIT_SX : COUNTER_SX}>
          {ideaCounterText(idea)}
        </Typography>
      </Box>

      {ideaAtLimit && (
        <Box sx={WARN_BOX_SX}>
          <Typography sx={WARN_SX}>{IDEA_LIMIT_NOTE}</Typography>
        </Box>
      )}
      <Typography sx={HELP_SX}>{IDEA_HELP_DESCRIBE}</Typography>
      <Typography sx={HELP_SX}>{IDEA_HELP_STORAGE}</Typography>
      {!ideaAtLimit && <Typography sx={HELP_SX}>{IDEA_HELP_LIMIT}</Typography>}

      {bothBlank && <Typography sx={WARN_SX}>{BLANK_NOTE}</Typography>}
    </Box>
  );
}
