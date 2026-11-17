import { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import type { RuleBlock } from './state.js';
import {
  canAddRule,
  duplicateIdFlags,
  hasLetterOrDigit,
  limitRuleDescription,
  limitSingleLine,
  RULE_BLOCK_LIMIT,
  ruleIdFromName,
} from './technical.js';

// The rule blocks, the right column of the technical details step (F-10 AC-008 to
// AC-018, AC-022). The list scrolls in its own region; each block has a name (single
// line), its file line, its duplicate or no-id message, and a description (multi-line).
// Remove asks first (RemoveRuleDialog). The layout follows the approved screens in
// spec/design/features/F-10-technical-details/ (01 to 06). The values stay in memory
// only: no storage and no logging (decision 13).

export const RULES_HEADING = 'Rule blocks';
export const RULES_HELP = 'Each block becomes one file in .claude/rules/. The list starts empty.';
export const EMPTY_TITLE = 'No rule blocks yet.';
export const EMPTY_LINE = 'Add rule block adds one empty block after the last one.';
export const EMPTY_NOTE = 'Nothing is added until you add one.';
export const ADD_LABEL = 'Add rule block';
export const LIMIT_REASON_FIRST = `Limit reached: ${RULE_BLOCK_LIMIT} of ${RULE_BLOCK_LIMIT} rule blocks.`;
export const LIMIT_REASON_SECOND = 'Remove a block to add one.';
export const NO_ID_MESSAGE = 'Name needs a letter or digit. No file name is written.';
export const DESCRIPTION_LABEL = 'Description';
export const DESCRIPTION_HELP = 'Up to 1,000 characters; text past the limit is cut.';
export const REMOVE_LABEL = 'Remove';
export const CANCEL_LABEL = 'Cancel';

export function ruleFileName(name: string): string {
  return `.claude/rules/${ruleIdFromName(name)}.md`;
}

export function duplicateMessage(blockNumber: number): string {
  return `Same file as rule block ${blockNumber}. Both are kept.`;
}

// The 1-based number of the first other block whose name gives the same id, or null.
// Only called for a name that is flagged as a duplicate.
function sameFileAs(rules: readonly RuleBlock[], index: number): number | null {
  const id = ruleIdFromName(rules[index]?.name ?? '');
  const other = rules.findIndex(
    (rule, i) => i !== index && hasLetterOrDigit(rule.name) && ruleIdFromName(rule.name) === id,
  );
  return other === -1 ? null : other + 1;
}

const COLUMN_SX = { display: 'flex', flexDirection: 'column', gap: 2, width: 548, maxWidth: '100%' } as const;
const SECTION_SX = { fontSize: 13, fontWeight: 700, color: '#0f172a' } as const;
const LABEL_SX = { fontSize: 12, fontWeight: 600, color: '#334155' } as const;
const HELP_SX = { fontSize: 11, color: '#64748b' } as const;
const MUTED_SX = { fontSize: 12, color: '#64748b' } as const;
const WARN_SX = { fontSize: 12, fontWeight: 600, color: '#92400e' } as const;
const WARN_RIGHT_SX = { ...WARN_SX, textAlign: 'right' } as const;
const LIST_SX = {
  height: 428,
  overflowY: 'auto',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  p: '12px',
  bgcolor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
} as const;
const BLOCK_SX = {
  boxSizing: 'border-box',
  minHeight: 200,
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
  p: 2,
  bgcolor: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
} as const;
const BLOCK_HEAD_SX = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as const;
const EMPTY_SX = { flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 } as const;
const ADD_ROW_SX = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 } as const;
const DIALOG_PAPER_SX = { width: 480, maxWidth: '100%' } as const;

const nameId = (index: number): string => `rule-name-${index}`;
const descriptionId = (index: number): string => `rule-description-${index}`;

export interface RuleBlockListProps {
  readonly rules: readonly RuleBlock[];
  readonly onAdd: () => void;
  readonly onAskRemove: (index: number) => void;
  readonly onUpdate: (index: number, patch: Partial<RuleBlock>) => void;
}

// The right column of the step: heading, help, the scrolling list, and Add. Holds no
// state; Remove only asks (onAskRemove), and the wrapper confirms (RuleBlocks).
export function RuleBlockList({ rules, onAdd, onAskRemove, onUpdate }: RuleBlockListProps) {
  const flags = duplicateIdFlags(rules.map((rule) => rule.name));
  const addAllowed = canAddRule(rules.length);

  const renderBlock = (rule: RuleBlock, index: number) => {
    const usable = hasLetterOrDigit(rule.name);
    const duplicateOf = flags[index] ? sameFileAs(rules, index) : null;
    return (
      <Box key={index} sx={BLOCK_SX}>
        <Box sx={BLOCK_HEAD_SX}>
          <Typography sx={LABEL_SX}>{`Rule block ${index + 1}`}</Typography>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            aria-label={`${REMOVE_LABEL} rule block ${index + 1}`}
            onClick={() => onAskRemove(index)}
          >
            {REMOVE_LABEL}
          </Button>
        </Box>
        <TextField
          id={nameId(index)}
          value={rule.name}
          onChange={(event) => onUpdate(index, { name: limitSingleLine(event.target.value) })}
          placeholder="Name"
          slotProps={{ htmlInput: { 'aria-label': `Rule block ${index + 1} name` } }}
          fullWidth
          size="small"
        />
        {usable ? (
          <>
            <Typography sx={MUTED_SX}>{`File: ${ruleFileName(rule.name)}`}</Typography>
            {duplicateOf !== null ? <Typography sx={WARN_SX}>{duplicateMessage(duplicateOf)}</Typography> : null}
          </>
        ) : (
          <Typography sx={WARN_SX}>{NO_ID_MESSAGE}</Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <Typography component="label" htmlFor={descriptionId(index)} sx={LABEL_SX}>
            {DESCRIPTION_LABEL}
          </Typography>
          <Typography sx={HELP_SX}>{DESCRIPTION_HELP}</Typography>
        </Box>
        <TextField
          id={descriptionId(index)}
          value={rule.description}
          onChange={(event) => onUpdate(index, { description: limitRuleDescription(event.target.value) })}
          fullWidth
          multiline
          rows={2}
        />
      </Box>
    );
  };

  return (
    <Box sx={COLUMN_SX}>
      <Typography sx={SECTION_SX}>{RULES_HEADING}</Typography>
      <Typography sx={HELP_SX}>{RULES_HELP}</Typography>

      <Box sx={LIST_SX}>
        {rules.length === 0 ? (
          <Box sx={EMPTY_SX}>
            <Typography sx={LABEL_SX}>{EMPTY_TITLE}</Typography>
            <Typography sx={HELP_SX}>{EMPTY_LINE}</Typography>
            <Typography sx={HELP_SX}>{EMPTY_NOTE}</Typography>
          </Box>
        ) : (
          rules.map(renderBlock)
        )}
      </Box>

      <Box sx={ADD_ROW_SX}>
        {addAllowed ? null : (
          <Box>
            <Typography sx={WARN_RIGHT_SX}>{LIMIT_REASON_FIRST}</Typography>
            <Typography sx={WARN_RIGHT_SX}>{LIMIT_REASON_SECOND}</Typography>
          </Box>
        )}
        <Button variant="outlined" disabled={!addAllowed} onClick={onAdd}>
          {ADD_LABEL}
        </Button>
      </Box>

    </Box>
  );
}

export interface RuleBlocksProps {
  readonly rules: readonly RuleBlock[];
  readonly onAdd: () => void;
  readonly onRemove: (index: number) => void;
  readonly onUpdate: (index: number, patch: Partial<RuleBlock>) => void;
}

// The rule blocks with their confirmation: the block whose removal waits for the
// user's answer is held here (F-10 AC-010, AC-011). Only Remove in the dialog removes.
export function RuleBlocks({ rules, onAdd, onRemove, onUpdate }: RuleBlocksProps) {
  const [pending, setPending] = useState<number | null>(null);
  const pendingRule = pending === null ? undefined : rules[pending];
  return (
    <>
      <RuleBlockList rules={rules} onAdd={onAdd} onAskRemove={setPending} onUpdate={onUpdate} />
      {pending !== null && pendingRule !== undefined ? (
        <RemoveRuleDialog
          index={pending}
          rule={pendingRule}
          hasNext={pending + 1 < rules.length}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            onRemove(pending);
            setPending(null);
          }}
        />
      ) : null}
    </>
  );
}

export interface RemoveRuleDialogProps {
  readonly index: number;
  readonly rule: RuleBlock;
  readonly hasNext: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

// The confirmation before a rule block is removed (F-10 AC-011, ui.md §5). Shown
// open; the caller mounts it only while a removal is pending. Hook-free, so its
// content can be read without rendering.
export function RemoveRuleDialog({ index, rule, hasNext, onCancel, onConfirm }: RemoveRuleDialogProps) {
  const number = index + 1;
  const named = rule.name.trim() !== '';
  const id = hasLetterOrDigit(rule.name) ? ruleIdFromName(rule.name) : null;
  return (
    <Dialog open onClose={onCancel} slotProps={{ paper: { sx: DIALOG_PAPER_SX } }}>
      <DialogTitle>{`Remove rule block ${number}?`}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: '#334155' }}>
          {named ? `Rule block ${number}, “${rule.name}”, is removed.` : `Rule block ${number} is removed.`}
          {id !== null ? ` Its file .claude/rules/${id}.md is not written.` : ''}
        </Typography>
        {hasNext ? (
          <Typography sx={{ fontSize: 13, color: '#334155' }}>{`Rule block ${number + 1} keeps its place in the list.`}</Typography>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onCancel}>
          {CANCEL_LABEL}
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          {REMOVE_LABEL}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
