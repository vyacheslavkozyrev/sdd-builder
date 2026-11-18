import { useState } from 'react';
import { Box, Button, Menu, MenuItem, TextField, Typography } from '@mui/material';
import type { pipeline } from '@sddbuilder/core';
import {
  connectFlows,
  connectionConfirmation,
  removeConnection,
  repointConnection,
} from './connect.js';
import { deleteFlow } from './delete.js';
import { addGate, removeGate, type GateResult } from './gates.js';
import { gateRequestFor, type GateFields, type GateTool } from './drawing.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import { GateForm } from './GateForm.js';
import { connections, type Connection } from './model.js';
import type { Selection } from './panel.js';

type Pipeline = pipeline.Pipeline;
type Gate = pipeline.Gate;

// The buttons of the properties panel: an arrow's source and target pickers, its gate, Delete connection, and a
// flow's Connect to next flow and Delete flow (F-11 AC-014 to AC-019, AC-021, AC-031). A refused action keeps the
// pipeline as it was and shows its reason; the buttons stay enabled (screen 02). Every delete asks first (screens 02
// and 05), and the pipeline changes only on Confirm. Layout and wording follow spec/design/features/F-11-pipeline-builder/
// (02, 03, 04 and 05).

const REFUSED_PREFIX = 'Refused: ';
const ALERT_SX = { fontSize: 12, color: '#b91c1c' } as const;
const LABEL_SX = { fontSize: 12, fontWeight: 600, color: '#334155' } as const;
const ACTIONS_SX = { display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-start' } as const;
const ROW_SX = { display: 'flex', gap: 1, flexWrap: 'wrap' } as const;
const LIST_SX = { display: 'flex', flexDirection: 'column', gap: 0.5 } as const;
const LINE_SX = { fontSize: 12, color: '#334155' } as const;
const EMPTY_FIELDS: GateFields = { description: '', type: 'checks', threshold: '' };

function refusalText(reason: string | undefined): string | undefined {
  return reason === undefined ? undefined : `${REFUSED_PREFIX}${reason}`;
}

function Refusal({ reason }: { readonly reason: string | undefined }) {
  return reason === undefined ? null : (
    <Typography role="alert" sx={ALERT_SX}>
      {refusalText(reason)}
    </Typography>
  );
}

export interface ArrowEndPickerProps {
  readonly end: 'source' | 'target';
  // The source flow of the arrow: the arrow is named by it.
  readonly arrow: string;
  // The flow the end is on now, as the panel reads it from the pipeline.
  readonly value: string;
  readonly pipeline: Pipeline;
  readonly onChange: (next: Pipeline) => void;
  readonly onSelect: (selection: Selection | undefined) => void;
}

// The Source flow and Target flow pickers (AC-015). Moving the target keeps the arrow on its source; moving the source
// moves the arrow, label and gate, to another flow, so the selection follows it. A refusal keeps the saved flow.
export function ArrowEndPicker({ end, arrow, value, pipeline: config, onChange, onSelect }: ArrowEndPickerProps) {
  const [reason, setReason] = useState<string | undefined>(undefined);
  const choose = (flow: string): void => {
    const result = repointConnection(config, arrow, { end, flow });
    setReason(result.ok ? undefined : result.reason);
    if (result.ok) {
      onChange(result.pipeline);
      if (end === 'source') {
        onSelect({ kind: 'arrow', source: flow });
      }
    }
  };
  return (
    <TextField
      select
      id={`field-${end}`}
      label={end === 'source' ? 'Source flow' : 'Target flow'}
      size="small"
      fullWidth
      value={value}
      onChange={(event) => choose(event.target.value)}
      error={reason !== undefined}
      helperText={refusalText(reason)}
    >
      {config.flows.map((flow) => (
        <MenuItem key={flow.id} value={flow.id}>
          {flow.id}
        </MenuItem>
      ))}
    </TextField>
  );
}

export interface ArrowActionsProps {
  readonly pipeline: Pipeline;
  readonly source: string;
  readonly onChange: (next: Pipeline) => void;
  readonly onSelect: (selection: Selection | undefined) => void;
}

// The arrow's gate and its delete. With no gate, the gate form is shown with Add approval and Add check; with a gate,
// Remove gate is shown and the two add buttons are refused with the reason (AC-017 to AC-019, AC-021). Delete connection
// asks first and removes the arrow with its gate; the flows stay (AC-016).
export function ArrowActions({ pipeline: config, source, onChange, onSelect }: ArrowActionsProps) {
  const [fields, setFields] = useState<GateFields>(EMPTY_FIELDS);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const connection = connections(config).find((candidate) => candidate.source === source);
  if (connection === undefined) {
    throw new Error(`F-11: the flow ${source} has no arrow.`);
  }

  const applyGate = (result: GateResult): void => {
    setReason(result.ok ? undefined : result.reason);
    if (result.ok) {
      setFields(EMPTY_FIELDS);
      onChange(result.pipeline);
    }
  };
  const addFor = (tool: GateTool): void => applyGate(addGate(config, source, gateRequestFor(tool, fields)));

  return (
    <Box sx={ACTIONS_SX}>
      {connection.gate === undefined ? (
        <>
          <Typography sx={LABEL_SX}>Gate on this arrow</Typography>
          <GateForm tool="Check" fields={fields} onChange={setFields} />
        </>
      ) : null}
      <Box sx={ROW_SX}>
        <Button variant="outlined" onClick={() => addFor('Approval')}>
          Add approval
        </Button>
        <Button variant="outlined" onClick={() => addFor('Check')}>
          Add check
        </Button>
      </Box>
      <Refusal reason={reason} />
      {connection.gate === undefined ? null : (
        <Button variant="outlined" onClick={() => applyGate(removeGate(config, source))}>
          Remove gate
        </Button>
      )}
      <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>
        Delete connection
      </Button>
      {confirming ? (
        <DeleteConnectionConfirm
          connection={connection}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            const result = removeConnection(config, source);
            setConfirming(false);
            if (result.ok) {
              onChange(result.pipeline);
              onSelect(undefined);
            } else {
              setReason(result.reason);
            }
          }}
        />
      ) : null}
    </Box>
  );
}

function DeleteConnectionConfirm({
  connection,
  onCancel,
  onConfirm,
}: {
  readonly connection: Connection;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const text = connectionConfirmation(connection);
  return (
    <ConfirmDialog title={text.title} confirmLabel="Delete connection" onCancel={onCancel} onConfirm={onConfirm}>
      <Typography>{text.detail}</Typography>
    </ConfirmDialog>
  );
}

export interface FlowActionsProps {
  readonly pipeline: Pipeline;
  readonly flowId: string;
  readonly onChange: (next: Pipeline) => void;
  // Called with the flow's id after the user confirms the delete; the caller removes the flow (AC-031 to AC-033).
  readonly onDelete: (flowId: string) => void;
}

// The flow's Connect to next flow picker, with its artifact label (AC-014), and its footer Delete flow (AC-031).
// The label is asked before the connection is made: a blank label is refused under the field (screen 04).
export function FlowActions({ pipeline: config, flowId, onChange, onDelete }: FlowActionsProps) {
  const [label, setLabel] = useState('');
  const [reason, setReason] = useState<string | undefined>(undefined);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [confirming, setConfirming] = useState(false);

  const connectTo = (target: string): void => {
    const result = connectFlows(config, { source: flowId, target, label });
    setAnchor(null);
    setReason(result.ok ? undefined : result.reason);
    if (result.ok) {
      setLabel('');
      onChange(result.pipeline);
    }
  };

  return (
    <Box sx={ACTIONS_SX}>
      <TextField
        label="Artifact label · required"
        size="small"
        fullWidth
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        error={reason !== undefined}
        helperText={reason === undefined ? 'what is handed over' : refusalText(reason)}
      />
      <Button variant="outlined" aria-haspopup="menu" onClick={(event) => setAnchor(event.currentTarget)}>
        Connect to next flow ▾
      </Button>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        {config.flows
          .filter((flow) => flow.id !== flowId)
          .map((flow) => (
            <MenuItem key={flow.id} onClick={() => connectTo(flow.id)}>
              {flow.id}
            </MenuItem>
          ))}
      </Menu>
      <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>
        Delete flow
      </Button>
      {confirming ? (
        <DeleteFlowConfirm
          pipeline={config}
          flowId={flowId}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            onDelete(flowId);
          }}
        />
      ) : null}
    </Box>
  );
}

// What a flow's gate is called in the confirmation: its kind, or no gate.
function gateName(gate: Gate | undefined): string {
  if (gate === undefined) {
    return 'no gate';
  }
  return gate.kind === 'approval' ? 'approval' : 'check';
}

// The confirmation for Delete flow. It names every arrow the flow has, in or out, with its gate, from deleteFlow's
// `removed` list (screen 05, AC-031).
function DeleteFlowConfirm({
  pipeline: config,
  flowId,
  onCancel,
  onConfirm,
}: {
  readonly pipeline: Pipeline;
  readonly flowId: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const result = deleteFlow(config, flowId);
  if (!result.ok) {
    throw new Error(`F-11: ${result.reason}`);
  }
  const blocks = config.flows.find((flow) => flow.id === flowId)?.blocks.length ?? 0;
  const removed = result.removed;
  const blockText = blocks === 1 ? '1 block' : `${blocks} blocks`;
  return (
    <ConfirmDialog title={`Delete flow ${flowId}?`} confirmLabel="Delete flow" onCancel={onCancel} onConfirm={onConfirm}>
      <Box sx={LIST_SX}>
        <Typography sx={LINE_SX}>
          {removed.length === 0
            ? `This removes the flow and its ${blockText}. It has no connections.`
            : `This removes the flow, its ${blockText}, and these connections and their gates:`}
        </Typography>
        {removed.map((arrow) => (
          <Typography key={`${arrow.source}>${arrow.target}`} sx={LINE_SX}>
            {`• ${arrow.source} → ${arrow.target} · ${arrow.label} · ${gateName(arrow.gate)}`}
          </Typography>
        ))}
        <Typography sx={LINE_SX}>Other flows and connections stay.</Typography>
      </Box>
    </ConfirmDialog>
  );
}
