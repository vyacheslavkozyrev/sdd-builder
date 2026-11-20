import { useState } from 'react';
import { Box, Button, Dialog, Typography, useTheme } from '@mui/material';
import { RuleBlock } from './RuleBlock.js';
import { RULE_LIMIT, canAddRule, duplicateRuleNumbers } from './technical.js';
import { getRuleListStyles } from './ruleListStyles.js';
import type { RuleValues, RulePatch } from './state.js';

// The rule list of the technical details step (F-10, screens 01, 02, 04 and 05): the title, the add
// control, the rule blocks in order and the confirmation before a block is removed. The add control is
// disabled at 60 blocks, and its reason is shown beside it (AC-012). Remove asks first; Cancel keeps the
// block, Remove deletes it (AC-011). The list is its own scroll region. Nothing is stored or logged.

export const RULE_LIST_TITLE = 'Rule blocks';
export const RULE_LIST_HELP_LINE = 'Each block becomes one file in .claude/rules/. The list starts empty.';
export const EMPTY_LIST_LINES = {
  title: 'No rule blocks yet.',
  add: 'Add rule block adds one empty block after the last one.',
  nothing: 'Nothing is added until you add one.',
} as const;
export const LIMIT_REASON = `Limit reached: ${RULE_LIMIT} of ${RULE_LIMIT} rule blocks. Remove a block to add one.`;
export const REMOVE_CONFIRM_TEXT = 'Are you sure you want to remove this rule block?';

// The actions the list sends to the wizard. The list keeps only the open confirmation.
export interface RuleActions {
  readonly onAdd: () => void;
  readonly onRemove: (index: number) => void;
  readonly onUpdate: (index: number, patch: RulePatch) => void;
}

export interface RuleListProps {
  readonly rules: readonly RuleValues[];
  readonly actions: RuleActions;
}

export function RuleList({ rules, actions }: RuleListProps) {
  const styles = getRuleListStyles(useTheme());
  const [pendingRemove, setPendingRemove] = useState<number | undefined>(undefined);
  const addAllowed = canAddRule(rules.length);
  const duplicates = duplicateRuleNumbers(rules.map((rule) => rule.name));

  return (
    <Box sx={styles.root}>
      <Box sx={styles.header}>
        <Typography component="h2" sx={styles.title}>
          {RULE_LIST_TITLE}
        </Typography>
        <Box sx={styles.headerActions}>
          {addAllowed ? null : (
            <Box sx={styles.limitNote}>
              <Typography id="rule-limit-reason" component="p" sx={styles.limitText}>
                {LIMIT_REASON}
              </Typography>
            </Box>
          )}
          <Button
            variant="outlined"
            aria-label="Add rule block"
            disabled={!addAllowed}
            aria-describedby={addAllowed ? undefined : 'rule-limit-reason'}
            onClick={actions.onAdd}
            sx={styles.addButton}
          >
            +
          </Button>
        </Box>
      </Box>
      <Typography component="p" sx={styles.helpLine}>
        {RULE_LIST_HELP_LINE}
      </Typography>

      <Box sx={styles.list}>
        {rules.length === 0 ? (
          <Box>
            <Typography component="p" sx={styles.emptyTitle}>
              {EMPTY_LIST_LINES.title}
            </Typography>
            <Typography component="p" sx={styles.emptyText}>
              {EMPTY_LIST_LINES.add}
            </Typography>
            <Typography component="p" sx={styles.emptyText}>
              {EMPTY_LIST_LINES.nothing}
            </Typography>
          </Box>
        ) : (
          rules.map((rule, index) => (
            <RuleBlock
              key={index}
              blockNumber={index + 1}
              rule={rule}
              duplicateOf={duplicates[index]}
              onChange={(patch) => {
                actions.onUpdate(index, patch);
              }}
              onRemove={() => {
                setPendingRemove(index);
              }}
            />
          ))
        )}
      </Box>

      <Dialog
        open={pendingRemove !== undefined}
        onClose={() => {
          setPendingRemove(undefined);
        }}
        aria-labelledby="rule-remove-title"
        slotProps={{ paper: { sx: styles.dialogPaper } }}
      >
        <Typography id="rule-remove-title" component="h3" sx={styles.dialogTitle}>
          {pendingRemove === undefined ? '' : `Remove rule block ${pendingRemove + 1}?`}
        </Typography>
        <Typography component="p" sx={styles.dialogText}>
          {REMOVE_CONFIRM_TEXT}
        </Typography>
        <Box sx={styles.dialogActions}>
          <Button
            variant="outlined"
            onClick={() => {
              setPendingRemove(undefined);
            }}
            sx={styles.dialogCancel}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (pendingRemove !== undefined) actions.onRemove(pendingRemove);
              setPendingRemove(undefined);
            }}
            sx={styles.dialogRemove}
          >
            Remove
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}
