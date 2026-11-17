import { Box, TextField, Typography } from '@mui/material';
import type { StackValues, WizardValues } from './state.js';
import { limitArchitecture, limitSingleLine } from './technical.js';

// The technical details step body, stack and architecture (F-10 AC-001 to AC-006,
// AC-022). The left column of the step card: the five stack fields as single-line
// fields, and the architecture as a multi-line field. Each is limited on change, so
// a paste is limited too. The layout follows the approved screens in
// spec/design/features/F-10-technical-details/ (01 and 02). The step keeps the
// values in memory only: no storage and no logging (decision 13).

export const LANGUAGE_ID = 'technical-language';
export const FRAMEWORK_ID = 'technical-framework';
export const PLATFORM_ID = 'technical-platform';
export const BUILD_TOOL_ID = 'technical-build-tool';
export const TEST_FRAMEWORK_ID = 'technical-test-framework';
export const ARCHITECTURE_ID = 'technical-architecture';

export const STACK_LABEL = 'Stack';
export const LANGUAGE_PLACEHOLDER = 'e.g. TypeScript';
export const OPTIONAL_PLACEHOLDER = 'Optional';
export const STACK_HELP_REQUIRED = 'Language is required. The other four are optional.';
export const STACK_HELP_LIMIT = 'Up to 100 characters each; text past the limit is cut.';
export const BLANK_LANGUAGE_NOTE = 'Language is blank. You can still go on; the analysis reports it.';
export const ARCHITECTURE_LABEL = 'Architecture (optional)';
export const ARCHITECTURE_PLACEHOLDER = 'Optional. Describe the structure in a few lines.';
export const ARCHITECTURE_HELP = 'Up to 5,000 characters. Text past the limit is cut, also when pasted.';

// The four optional stack fields after the language, in screen order.
const STACK_FIELDS = [
  { key: 'framework', id: FRAMEWORK_ID, label: 'Framework' },
  { key: 'platform', id: PLATFORM_ID, label: 'Platform' },
  { key: 'buildTool', id: BUILD_TOOL_ID, label: 'Build tool' },
  { key: 'testFramework', id: TEST_FRAMEWORK_ID, label: 'Test framework' },
] as const satisfies readonly { key: keyof StackValues; id: string; label: string }[];

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

const SECTION_SX = { fontSize: 13, fontWeight: 700, color: '#0f172a' } as const;
const LABEL_SX = { fontSize: 12, fontWeight: 600, color: '#334155' } as const;
const REQUIRED_SX = { color: '#dc2626' } as const;
const HELP_SX = { fontSize: 11, color: '#64748b' } as const;
const WARN_SX = { fontSize: 12, fontWeight: 600, color: '#92400e' } as const;
const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  columnGap: 3,
  rowGap: 2,
} as const;
const COLUMN_SX = { display: 'flex', flexDirection: 'column', gap: 2, width: 548, maxWidth: '100%' } as const;

export interface TechnicalStepProps {
  readonly stack: StackValues;
  readonly architecture: string;
  readonly onChange: (patch: Partial<WizardValues>) => void;
}

export function TechnicalStep({ stack, architecture, onChange }: TechnicalStepProps) {
  const languageBlank = stack.language.trim() === '';

  const setStack = (key: keyof StackValues, value: string): void => {
    onChange({ stack: { ...stack, [key]: limitSingleLine(value) } });
  };

  return (
    <Box sx={CARD_SX}>
      <Box aria-hidden="true" sx={ACCENT_SX} />

      <Box sx={COLUMN_SX}>
        <Typography sx={SECTION_SX}>{STACK_LABEL}</Typography>

        <Box sx={GRID_SX}>
          <Box>
            <Typography component="label" htmlFor={LANGUAGE_ID} sx={LABEL_SX}>
              Language<Box component="span" sx={REQUIRED_SX}> *</Box>
            </Typography>
            <TextField
              id={LANGUAGE_ID}
              value={stack.language}
              onChange={(event) => setStack('language', event.target.value)}
              placeholder={LANGUAGE_PLACEHOLDER}
              required
              fullWidth
              size="small"
            />
          </Box>
          {STACK_FIELDS.map((field) => (
            <Box key={field.id}>
              <Typography component="label" htmlFor={field.id} sx={LABEL_SX}>
                {field.label}
              </Typography>
              <TextField
                id={field.id}
                value={stack[field.key]}
                onChange={(event) => setStack(field.key, event.target.value)}
                placeholder={OPTIONAL_PLACEHOLDER}
                fullWidth
                size="small"
              />
            </Box>
          ))}
        </Box>

        {languageBlank ? (
          <Typography sx={WARN_SX}>{BLANK_LANGUAGE_NOTE}</Typography>
        ) : (
          <>
            <Typography sx={HELP_SX}>{STACK_HELP_REQUIRED}</Typography>
            <Typography sx={HELP_SX}>{STACK_HELP_LIMIT}</Typography>
          </>
        )}

        <Typography component="label" htmlFor={ARCHITECTURE_ID} sx={LABEL_SX}>
          {ARCHITECTURE_LABEL}
        </Typography>
        <TextField
          id={ARCHITECTURE_ID}
          value={architecture}
          onChange={(event) => onChange({ architecture: limitArchitecture(event.target.value) })}
          placeholder={ARCHITECTURE_PLACEHOLDER}
          fullWidth
          multiline
          rows={5}
        />
        <Typography sx={HELP_SX}>{ARCHITECTURE_HELP}</Typography>
      </Box>
    </Box>
  );
}
