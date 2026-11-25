import { useState } from 'react';
import { Box, Button, TextField, Typography, useTheme } from '@mui/material';
import type { pipeline as core } from '@sddbuilder/core';
import { codePointCount } from '../wizard/project.js';
import { bodyCounterText } from './FlowPanel.js';
import { AgentToolRows } from './AgentRows.js';
import { blockName, type Block } from './blockArrows.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import {
  editConditionDescription,
  falseRouteOf,
  falseRouteText,
  setConditionRoundLimit,
  trueRouteText,
  type ConditionBlock,
  type ConditionFieldResult,
} from './blockCondition.js';
import { setAgentModel } from './blockAgentFields.js';
import {
  editEndArtifact,
  editEndOutcome,
  END_OUTCOMES,
  producedArtifactChoices,
  producedArtifactNote,
  type EndBlock,
  type EndField,
  type EndFieldResult,
  type EndOutcome,
} from './blockEnd.js';
import { editAgentField, type AgentBlock, type AgentField } from './blockFields.js';
import { arrowsRemovedBy, deleteBlock, deleteRefusal } from './deleteBlock.js';
import { getBlockPanelStyles } from './blockPanelStyles.js';
import type { Model, Pipeline, Rule } from './fields.js';
import type { Flow } from './model.js';
import type { PlacedFinding } from './marks.js';
import { getMarkViewsStyles } from './markViewsStyles.js';
import { ArgumentRows, endOnEnter, RuleTagRows } from './RowEditors.js';
import { emptyReasonOf, isEmptyText, keyUpText, refusalOf } from './requiredText.js';

type StartBlock = core.StartBlock;

// The block panels of the flow tab (F-12 AC-022 to AC-034). This file holds the Agent panel, as screen 02
// draws it: a title "Agent: <name>", the subtitle "Agent block in the <flow> flow", then Name, Description,
// Arguments, Model, Tools, Reads, Writes, Rule tags and Body with its counter, in the order of AC-022. It also
// holds the Condition panel (`ConditionPanel`), as screens 03 and 04 draw it, the End panel (`EndPanel`), as screen
// 01 draws it, and the Start panel (`StartPanel`), built as the Agent panel. Every block panel ends with the Delete
// block control (`DeleteBlockFooter`), as screen 05 shows it.
//
// Each edit goes through the parser (blockFields.ts and blockAgentFields.ts). An accepted edit is reported to
// the caller as the new pipeline. A refused edit keeps the saved value in the field and shows its reason
// beneath the field. Every text field of the Agent is required (device fix 2026-11-24): a refusal shows only while
// the text is empty, and a refused text with content is shown as the saved value again, with no error. The drafts
// belong to the flow and block they were typed for (`target`); another block starts with none.
// Only the edited Agent changes (AC-029).

// The models offered by the model field (AC-025). The blank option unsets the model.
const MODELS: readonly Model[] = ['haiku', 'sonnet', 'opus', 'inherit'];

// The findings of a block when the caller gives none: the list of a block without a mark is empty.
const noFindings: readonly PlacedFinding[] = [];

// The read-only list of a block's structure marks (F-12 AC-045, AC-048): each finding with its kind and its
// message, in the analyzer's order. It holds no control. Nothing is drawn when the block has no finding.
function BlockFindings({ findings }: { readonly findings: readonly PlacedFinding[] }) {
  const styles = getMarkViewsStyles(useTheme());
  if (findings.length === 0) {
    return null;
  }
  return (
    <Box component="section" aria-label="Structure marks" sx={styles.findings}>
      <Box component="h3" sx={styles.findingsTitle}>
        Structure marks
      </Box>
      <Box component="ul" sx={styles.findingsList}>
        {findings.map((entry, index) => (
          <Box component="li" key={`${entry.finding.path}-${index}`} sx={styles.findingItem}>
            <Box component="span" sx={styles.findingKind[entry.finding.severity]}>
              {entry.finding.severity === 'blocker' ? 'Blocker' : 'Warning'}
            </Box>
            <Box component="span" sx={styles.findingMessage}>
              {entry.label.message}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

type TextFieldName = AgentField;
type FieldName = TextFieldName | 'model';

// The result of one edit as the panel settles it: the new pipeline, or the reason for the field refused.
type PanelResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly reason: string };

// What the panel holds beyond the saved pipeline: the text as typed for the text fields, and the reason of
// each refused value. The state belongs to one block; another block starts with none.
interface EditState {
  readonly target: string;
  readonly drafts: Partial<Record<TextFieldName, string | undefined>>;
  readonly refusals: Partial<Record<FieldName, string | undefined>>;
}

export interface AgentPanelProps {
  readonly pipelineState: Pipeline;
  readonly rules: readonly Rule[];
  readonly flow: Flow;
  readonly block: AgentBlock;
  readonly onChange: (pipelineState: Pipeline) => void;
  // The structure marks of this block and its arrows, listed read-only (F-12 AC-045). None when not given.
  readonly findings?: readonly PlacedFinding[];
}

function emptyState(target: string): EditState {
  return { target, drafts: {}, refusals: {} };
}

function isTextField(field: FieldName): field is TextFieldName {
  return field === 'name' || field === 'description' || field === 'body';
}

export function AgentPanel({ pipelineState, rules, flow, block, onChange, findings = noFindings }: AgentPanelProps) {
  const styles = getBlockPanelStyles(useTheme());
  const target = `${flow.id}/${block.id}`;
  const [edits, setEdits] = useState<EditState>(() => emptyState(target));
  const state = edits.target === target ? edits : emptyState(target);

  const shownText = (field: TextFieldName): string => state.drafts[field] ?? block[field] ?? '';

  // Settles one edit of `field`. An accepted edit reports the new pipeline and clears the field's refusal. A refused
  // empty required text keeps its draft under the reason; any other refused text drops the draft, so the saved value shows again.
  function settle(field: FieldName, result: PanelResult, typed?: string) {
    const emptyTyped = typed !== undefined && isEmptyText(typed);
    const drafts = { ...state.drafts };
    if (isTextField(field)) {
      drafts[field] = result.ok || emptyTyped ? typed : undefined;
    }
    // Every text field of the Agent is required: a refused text with content shows no error and reverts to the saved
    // value, and a refused empty text keeps its draft under the parser's reason (device fix 2026-11-24).
    const refusals = { ...state.refusals };
    const hidden = isTextField(field) && typed !== undefined && !emptyTyped;
    refusals[field] = result.ok || hidden ? undefined : result.reason;
    if (result.ok) {
      onChange(result.pipeline);
    }
    setEdits({ target, drafts, refusals });
  }

  function editText(field: TextFieldName, value: string) {
    settle(field, editAgentField(pipelineState, rules, flow.id, block.id, { field, value }), value);
  }

  // The name is checked only when it is committed (focus leaves the field, or Enter). A typed name is held as a
  // draft until then, and typing clears the field's refusal at once, so a refusal shows only for the value that
  // was committed.
  function editName(value: string) {
    setEdits({
      target,
      drafts: { ...state.drafts, name: value },
      refusals: { ...state.refusals, name: undefined },
    });
  }

  // Commits the held name: the parser accepts it or refuses it with its reason, and a refusal keeps the saved
  // name showing. A held name equal to the saved one is not sent again.
  function commitName() {
    const held = state.drafts.name;
    if (held === undefined || held === block.name) return;
    settle('name', editAgentField(pipelineState, rules, flow.id, block.id, { field: 'name', value: held }), held);
  }

  // The key press check of a required text (device fix 2026-11-24): its error is the parser's reason for an empty value
  // while the text is empty, and nothing once text is typed.
  function checkText(field: TextFieldName, text: string) {
    const refusals = { ...state.refusals };
    refusals[field] = emptyReasonOf(text, () =>
      refusalOf(editAgentField(pipelineState, rules, flow.id, block.id, { field, value: '' })),
    );
    setEdits({ target, drafts: state.drafts, refusals });
  }

  function editModel(value: string) {
    settle('model', setAgentModel(pipelineState, rules, flow.id, block.id, value === '' ? undefined : value));
  }

  // The ids a field's input is described by: its refusal's id while a refusal shows, plus any extra ids.
  // Left unset when neither applies, so no attribute names an element that is not drawn.
  const describedBy = (field: FieldName, ...extra: string[]): string | undefined => {
    const ids = state.refusals[field] === undefined ? extra : [...extra, `block-agent-${field}-refusal`];
    return ids.length === 0 ? undefined : ids.join(' ');
  };

  // Every Agent field's refusal sits in its field's control box, 4 px under the field (device fix 2026-11-24).
  const refusal = (field: FieldName) => {
    const reason = state.refusals[field];
    return reason === undefined ? null : (
      <Typography id={`block-agent-${field}-refusal`} component="p" sx={styles.controlRefusal}>
        {reason}
      </Typography>
    );
  };

  const body = shownText('body');

  return (
    <Box sx={styles.root}>
      <Box sx={styles.header}>
        <Typography component="h2" sx={styles.title}>
          {`Agent: ${block.name}`}
        </Typography>
        <Typography component="p" sx={styles.subtitle}>
          {`Agent block in the ${flow.name} flow`}
        </Typography>
      </Box>

      <Box sx={styles.scroll}>
        <Box sx={styles.agentGroup}>
          <Typography component="label" htmlFor="block-agent-name" sx={styles.fieldLabel}>
            Name
          </Typography>
          <Box sx={styles.control}>
            <TextField
              id="block-agent-name"
              value={shownText('name')}
              onChange={(event) => {
                editName(event.target.value);
              }}
              onBlur={commitName}
              sx={styles.field}
              slotProps={{
                htmlInput: {
                  'aria-describedby': describedBy('name'),
                  onKeyDown: endOnEnter,
                  onKeyUp: keyUpText((text) => {
                    checkText('name', text);
                  }),
                },
              }}
            />
            {refusal('name')}
          </Box>
        </Box>

        <Box sx={styles.agentGroup}>
          <Typography component="label" htmlFor="block-agent-description" sx={styles.fieldLabel}>
            Description
          </Typography>
          <Box sx={styles.control}>
            <TextField
              id="block-agent-description"
              value={shownText('description')}
              onChange={(event) => {
                editText('description', event.target.value);
              }}
              sx={styles.field}
              slotProps={{
                htmlInput: {
                  'aria-describedby': describedBy('description'),
                  onKeyUp: keyUpText((text) => {
                    checkText('description', text);
                  }),
                },
              }}
            />
            {refusal('description')}
          </Box>
        </Box>

        <ArgumentRows
          key={`${target}-arguments`}
          target={{ kind: 'agent', flowId: flow.id, blockId: block.id }}
          pipelineState={pipelineState}
          rules={rules}
          onChange={onChange}
        />

        <Box sx={styles.group}>
          <Typography component="label" htmlFor="block-agent-model" sx={styles.fieldLabel}>
            Model
          </Typography>
          <Box sx={styles.control}>
            <TextField
              id="block-agent-model"
              select
              value={block.model ?? ''}
              onChange={(event) => {
                editModel(event.target.value);
              }}
              sx={styles.select}
              slotProps={{ select: { native: true }, htmlInput: { 'aria-describedby': describedBy('model') } }}
            >
              <option value="" />
              {MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </TextField>
            {refusal('model')}
          </Box>
        </Box>

        <AgentToolRows
          key={`${target}-tools`}
          flowId={flow.id}
          blockId={block.id}
          pipelineState={pipelineState}
          rules={rules}
          onChange={onChange}
        />

        <RuleTagRows
          key={`${target}-rule-tags`}
          target={{ kind: 'agent', flowId: flow.id, blockId: block.id }}
          pipelineState={pipelineState}
          rules={rules}
          onChange={onChange}
        />

        <Box sx={styles.group}>
          <Typography component="label" htmlFor="block-agent-body" sx={styles.fieldLabel}>
            Body · required
          </Typography>
          <Box sx={styles.control}>
            <TextField
              id="block-agent-body"
              multiline
              minRows={3}
              value={body}
              onChange={(event) => {
                editText('body', event.target.value);
              }}
              sx={styles.multilineField}
              slotProps={{
                htmlInput: {
                  'aria-describedby': describedBy('body', 'block-agent-body-counter'),
                  onKeyUp: keyUpText((text) => {
                    checkText('body', text);
                  }),
                },
              }}
            />
            {refusal('body')}
          </Box>
          <Typography id="block-agent-body-counter" component="p" sx={styles.counter}>
            {bodyCounterText(body)}
          </Typography>
        </Box>
        <BlockFindings findings={findings} />
      </Box>

      <DeleteBlockFooter pipelineState={pipelineState} flow={flow} block={block} onChange={onChange} />
    </Box>
  );
}

// The description limit of a Condition, in characters (AC-030).
const DESCRIPTION_LIMIT = 1000;

type ConditionTextField = 'description' | 'roundLimit';

// What the Condition panel holds beyond the saved pipeline: the text as typed, and the refusal of each field.
// The state belongs to one block; another block starts with none.
interface ConditionEdits {
  readonly target: string;
  readonly drafts: Partial<Record<ConditionTextField, string | undefined>>;
  readonly refusals: Partial<Record<ConditionTextField, string | undefined>>;
}

export interface ConditionPanelProps {
  readonly pipelineState: Pipeline;
  readonly rules: readonly Rule[];
  readonly flow: Flow;
  readonly block: ConditionBlock;
  readonly onChange: (pipelineState: Pipeline) => void;
  // The structure marks of this block and its arrows, listed read-only (F-12 AC-045). None when not given.
  readonly findings?: readonly PlacedFinding[];
}

function emptyConditionEdits(target: string): ConditionEdits {
  return { target, drafts: {}, refusals: {} };
}

// The Condition panel (AC-030 to AC-034). Its title names the check: an end check when its true route goes
// to End, otherwise a pre-check. The subtitle names the block its true route leads to. The false route is
// text set by its arrow (AC-032); the round limit is a field only for a return (AC-034).
export function ConditionPanel({
  pipelineState,
  rules,
  flow,
  block,
  onChange,
  findings = noFindings,
}: ConditionPanelProps) {
  const styles = getBlockPanelStyles(useTheme());
  const target = `${flow.id}/${block.id}`;
  const [edits, setEdits] = useState<ConditionEdits>(() => emptyConditionEdits(target));
  const state = edits.target === target ? edits : emptyConditionEdits(target);

  const trueTo = 'stop' in block.true ? undefined : block.true.to;
  const trueTarget = trueTo === undefined ? undefined : flow.blocks.find((item) => item.id === trueTo);
  const kind = trueTarget?.kind === 'end' ? 'end check' : 'pre-check';
  const route = falseRouteOf(flow, block);
  const shownDescription = state.drafts.description ?? block.description;
  const shownRoundLimit =
    state.drafts.roundLimit ?? (route.kind === 'return' && route.roundLimit !== null ? String(route.roundLimit) : '');

  // Settles one edit: an accepted edit reports the new pipeline; a refused one records its reason and drops
  // the draft, so the saved value shows again.
  function settle(field: ConditionTextField, result: ConditionFieldResult, typed: string) {
    // The description is required (device fix 2026-11-24): an empty one keeps its draft under the error, and a refused
    // text with content reverts with no error. The round limit keeps its own draft rule.
    const emptyTyped = field === 'description' && isEmptyText(typed);
    const drafts = { ...state.drafts };
    drafts[field] = result.ok || emptyTyped ? typed : undefined;
    const refusals = { ...state.refusals };
    const hidden = field === 'description' && !isEmptyText(typed);
    refusals[field] = result.ok || hidden ? undefined : result.reason;
    if (result.ok) {
      onChange(result.pipeline);
    }
    setEdits({ target, drafts, refusals });
  }

  // The key press check of the description (device fix 2026-11-24): its error is the parser's reason for an empty value
  // while the text is empty, and nothing once text is typed.
  function checkDescription(text: string) {
    const refusals = { ...state.refusals };
    refusals.description = emptyReasonOf(text, () =>
      refusalOf(editConditionDescription(pipelineState, rules, flow.id, block.id, '')),
    );
    setEdits({ target, drafts: state.drafts, refusals });
  }

  // The refusal of a Condition field sits in its field's control box, 4 px under the field (device fix 2026-11-24).
  const refusal = (field: ConditionTextField) => {
    const reason = state.refusals[field];
    return reason === undefined ? null : (
      <Typography id={`block-condition-${field}-refusal`} component="p" sx={styles.controlRefusal}>
        {reason}
      </Typography>
    );
  };

  const describedBy = (field: ConditionTextField, ...extra: string[]): string | undefined => {
    const ids = state.refusals[field] === undefined ? extra : [...extra, `block-condition-${field}-refusal`];
    return ids.length === 0 ? undefined : ids.join(' ');
  };

  return (
    <Box sx={styles.root}>
      <Box sx={styles.header}>
        <Typography component="h2" sx={styles.title}>
          {`Condition: ${kind}`}
        </Typography>
        <Typography component="p" sx={styles.subtitle}>
          {trueTarget === undefined ? 'Check on the arrow' : `Check on the arrow before ${blockName(trueTarget)}`}
        </Typography>
      </Box>

      <Box sx={styles.scroll}>
        <Box sx={styles.group}>
          <Typography component="label" htmlFor="block-condition-description" sx={styles.fieldLabel}>
            What it checks
          </Typography>
          <Box sx={styles.control}>
            <TextField
              id="block-condition-description"
              value={shownDescription}
              onChange={(event) => {
                const value = event.target.value;
                settle(
                  'description',
                  editConditionDescription(pipelineState, rules, flow.id, block.id, value),
                  value,
                );
              }}
              sx={styles.field}
              slotProps={{
                htmlInput: {
                  'aria-describedby': describedBy('description', 'block-condition-description-counter'),
                  onKeyUp: keyUpText((text) => {
                    checkDescription(text);
                  }),
                },
              }}
            />
            {refusal('description')}
          </Box>
          <Typography id="block-condition-description-counter" component="p" sx={styles.counter}>
            {`${codePointCount(shownDescription)} / ${DESCRIPTION_LIMIT} characters`}
          </Typography>
        </Box>

        <Box sx={styles.group}>
          <Typography component="p" sx={styles.fieldLabel}>
            True goes to
          </Typography>
          <Typography component="p" sx={styles.routeText}>
            {trueRouteText(flow, block)}
          </Typography>
        </Box>

        <Box sx={styles.group}>
          <Typography component="p" sx={styles.fieldLabel}>
            False goes to
          </Typography>
          <Typography component="p" sx={styles.routeText}>
            {falseRouteText(flow, block)}
          </Typography>
        </Box>

        {route.kind === 'return' ? (
          <Box sx={styles.group}>
            <Typography component="label" htmlFor="block-condition-round-limit" sx={styles.fieldLabel}>
              Round limit
            </Typography>
            <Box sx={styles.control}>
              <Box sx={styles.roundRow}>
                <TextField
                  id="block-condition-round-limit"
                  value={shownRoundLimit}
                  onChange={(event) => {
                    const value = event.target.value;
                    settle(
                      'roundLimit',
                      setConditionRoundLimit(pipelineState, rules, flow.id, block.id, value),
                      value,
                    );
                  }}
                  sx={styles.roundField}
                  slotProps={{ htmlInput: { 'aria-describedby': describedBy('roundLimit') } }}
                />
                <Typography component="span" sx={styles.roundUnit}>
                  rounds
                </Typography>
              </Box>
              {refusal('roundLimit')}
            </Box>
          </Box>
        ) : null}
        <BlockFindings findings={findings} />
      </Box>

      <DeleteBlockFooter pipelineState={pipelineState} flow={flow} block={block} onChange={onChange} />
    </Box>
  );
}

export interface StartPanelProps {
  readonly pipelineState: Pipeline;
  readonly flow: Flow;
  readonly block: StartBlock;
  readonly onChange: (pipelineState: Pipeline) => void;
  // The structure marks of this block and its arrows, listed read-only (F-12 AC-045). None when not given.
  readonly findings?: readonly PlacedFinding[];
}

// The Start panel (F-12 AC-011, AC-042). It has no field: the title, the subtitle, and the Delete block control,
// disabled with "A flow keeps its Start block." because a flow keeps its Start. The empty scroll area pushes the
// footer to the foot of the panel.
export function StartPanel({ pipelineState, flow, block, onChange, findings = noFindings }: StartPanelProps) {
  const styles = getBlockPanelStyles(useTheme());

  return (
    <Box sx={styles.root}>
      <Box sx={styles.header}>
        <Typography component="h2" sx={styles.title}>
          Start
        </Typography>
        <Typography component="p" sx={styles.subtitle}>
          {`Start block in the ${flow.name} flow`}
        </Typography>
      </Box>

      <Box sx={styles.scroll}>
        <BlockFindings findings={findings} />
      </Box>

      <DeleteBlockFooter pipelineState={pipelineState} flow={flow} block={block} onChange={onChange} />
    </Box>
  );
}

export interface EndPanelProps {
  readonly pipelineState: Pipeline;
  readonly rules: readonly Rule[];
  readonly flow: Flow;
  readonly block: EndBlock;
  readonly onChange: (pipelineState: Pipeline) => void;
  // The structure marks of this block and its arrows, listed read-only (F-12 AC-045). None when not given.
  readonly findings?: readonly PlacedFinding[];
}

// What the End panel holds beyond the saved pipeline: the reason of each refused field. The state belongs to
// one block; another block starts with none.
interface EndEdits {
  readonly target: string;
  readonly refusals: Partial<Record<EndField, string | undefined>>;
}

function emptyEndEdits(target: string): EndEdits {
  return { target, refusals: {} };
}

// The End panel (AC-035, AC-036, AC-043), as screen 01 draws it: the title "End", the subtitle, Outcome and
// Produced artifact, then the Delete block control at the foot. Delete is disabled on the flow's last End, with
// its reason shown under it.
export function EndPanel({ pipelineState, rules, flow, block, onChange, findings = noFindings }: EndPanelProps) {
  const styles = getBlockPanelStyles(useTheme());
  const target = `${flow.id}/${block.id}`;
  const [edits, setEdits] = useState<EndEdits>(() => emptyEndEdits(target));
  const state = edits.target === target ? edits : emptyEndEdits(target);

  const choices = producedArtifactChoices(flow);
  const artifactNote = producedArtifactNote(flow);

  // Settles one edit: an accepted edit reports the new pipeline and clears the field's refusal; a refused one
  // records its reason, and the saved value stays in the select.
  function settle(field: EndField, result: EndFieldResult) {
    const refusals = { ...state.refusals };
    refusals[field] = result.ok ? undefined : result.reason;
    if (result.ok) {
      onChange(result.pipeline);
    }
    setEdits({ target, refusals });
  }

  const refusal = (field: EndField) => {
    const reason = state.refusals[field];
    return reason === undefined ? null : (
      <Typography id={`block-end-${field}-refusal`} component="p" sx={styles.refusal}>
        {reason}
      </Typography>
    );
  };

  const describedBy = (field: EndField): string | undefined =>
    state.refusals[field] === undefined ? undefined : `block-end-${field}-refusal`;

  return (
    <Box sx={styles.root}>
      <Box sx={styles.header}>
        <Typography component="h2" sx={styles.title}>
          End
        </Typography>
        <Typography component="p" sx={styles.subtitle}>
          The flow's exit, last on the canvas
        </Typography>
      </Box>

      <Box sx={styles.scroll}>
        <Box sx={styles.group}>
          <Typography component="label" htmlFor="block-end-outcome" sx={styles.fieldLabel}>
            Outcome
          </Typography>
          <TextField
            id="block-end-outcome"
            select
            value={block.outcome}
            onChange={(event) => {
              const outcome = END_OUTCOMES.find((item) => item === event.target.value);
              if (outcome !== undefined) {
                settle('outcome', editEndOutcome(pipelineState, rules, flow.id, block.id, outcome));
              }
            }}
            sx={styles.select}
            slotProps={{ select: { native: true }, htmlInput: { 'aria-describedby': describedBy('outcome') } }}
          >
            {END_OUTCOMES.map((outcome: EndOutcome) => (
              <option key={outcome} value={outcome}>
                {outcome}
              </option>
            ))}
          </TextField>
        </Box>
        {refusal('outcome')}

        <Box sx={styles.group}>
          <Typography
            component={artifactNote === undefined ? 'label' : 'p'}
            htmlFor={artifactNote === undefined ? 'block-end-artifact' : undefined}
            sx={styles.fieldLabel}
          >
            Produced artifact
          </Typography>
          {artifactNote === undefined ? (
            <TextField
              id="block-end-artifact"
              select
              value={block.producedArtifact}
              onChange={(event) => {
                settle('producedArtifact', editEndArtifact(pipelineState, rules, flow.id, block.id, event.target.value));
              }}
              sx={styles.select}
              slotProps={{
                select: { native: true },
                htmlInput: { 'aria-describedby': describedBy('producedArtifact') },
              }}
            >
              {choices.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </TextField>
          ) : (
            <Typography component="p" sx={styles.routeText}>
              {artifactNote}
            </Typography>
          )}
        </Box>
        {refusal('producedArtifact')}
        <BlockFindings findings={findings} />
      </Box>

      <DeleteBlockFooter pipelineState={pipelineState} flow={flow} block={block} onChange={onChange} />
    </Box>
  );
}

// The number of arrows as the confirmation names them (AC-039).
function arrowCountText(count: number): string {
  return count === 1 ? '1 arrow' : `${count} arrows`;
}

// The pipeline with the flow of the same id replaced by `flow`; every other flow is kept.
function withFlow(pipelineState: Pipeline, flow: Flow): Pipeline {
  return { ...pipelineState, flows: pipelineState.flows.map((item) => (item.id === flow.id ? flow : item)) };
}

interface DeleteBlockFooterProps {
  readonly pipelineState: Pipeline;
  readonly flow: Flow;
  readonly block: Block;
  readonly onChange: (pipelineState: Pipeline) => void;
}

// The Delete block control at the foot of a block panel (F-12 AC-039 to AC-043), as screen 05 draws it. It is
// disabled with its reason when the block is the flow's Start or its last End. Pressing it asks first: the
// confirmation names the block and the arrows that go with it. Cancel changes nothing; Delete removes the block and
// its arrows through deleteBlock, and the other blocks keep their properties.
function DeleteBlockFooter({ pipelineState, flow, block, onChange }: DeleteBlockFooterProps) {
  const styles = getBlockPanelStyles(useTheme());
  const [confirming, setConfirming] = useState(false);
  const reason = deleteRefusal(flow, block.id);
  const arrows = arrowCountText(arrowsRemovedBy(flow, block.id));

  const deleteButton = (
    <Button
      variant="contained"
      disabled={reason !== null}
      aria-describedby={reason === null ? undefined : 'block-delete-refusal'}
      onClick={() => {
        setConfirming(true);
      }}
      sx={styles.deleteButton}
    >
      Delete block
    </Button>
  );

  return (
    <>
      {reason === null ? (
        <Box sx={styles.footer}>
          {deleteButton}
          <Typography component="p" sx={styles.footerNote}>
            Asks first
          </Typography>
        </Box>
      ) : (
        <Box sx={styles.stackedFooter}>
          {deleteButton}
          <Typography id="block-delete-refusal" component="p" sx={styles.footerNote}>
            {reason}
          </Typography>
        </Box>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Delete block '${blockName(block)}'?`}
        text={`${arrows} will be removed. Routes that pointed to this block are cleared, not rewired.`}
        confirmLabel="Delete"
        onCancel={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          setConfirming(false);
          const result = deleteBlock(flow, block.id);
          if (!result.ok) {
            // The control is disabled for a refused block, so a refusal here is a programmer error.
            throw new Error(`F-12: ${result.reason}`);
          }
          onChange(withFlow(pipelineState, result.flow));
        }}
      />
    </>
  );
}
