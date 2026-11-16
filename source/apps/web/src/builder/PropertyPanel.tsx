// The property panel of the selected block of a flow, or of the flow when no block is selected: the properties of its kind,
// the file it generates, its rule tags, and the footer with Switch off and Delete (F-06 AC-023 to AC-035). The read model
// is `flowTabView` (its `panel`); the rules are the edit functions of block-edit, agent-edit, flow-edit and pipeline-edit.
// This view binds them and shows what they refuse. A property with no edit function is shown as text, not as a control.
// The caller keys this panel by the selected item, so a draft never outlives the item it was typed for.
import { useState } from 'react';
import type { pipeline } from '@sddbuilder/core';
import { AGENT_BODY_CAP, checkRoundLimit, unboundedRetryWarning } from './entry-checks.js';
import { agentIterationWarning, editAgent } from './agent-edit.js';
import type { AgentChange } from './agent-edit.js';
import { backRouteTargets, deleteBlock, deleteBlockQuestion, setBlockEnabled, setConditionRoutes } from './block-edit.js';
import { ConfirmDelete } from './ConfirmDelete.js';
import {
  commit,
  MODEL_OPTIONS,
  MODELS,
  Notice,
  routeFromValue,
  routeOptions,
  routeValue,
  Select,
  splitLines,
  TextDraft,
} from './FormFields.js';
import type { SelectOption } from './FormFields.js';
import { deleteFlow, deleteFlowQuestion, renameFlow, setFlowEnabled } from './flow-edit.js';
import { setRuleTags } from './pipeline-edit.js';
import type { BlockPanel } from './tab-view.js';

type ProjectConfig = pipeline.ProjectConfig;
type Scope = pipeline.Scope;
type Route = pipeline.Route;
type ConditionBlock = pipeline.ConditionBlock;

type AgentPanel = Extract<BlockPanel, { kind: 'agent' }>;
type ConditionPanel = Extract<BlockPanel, { kind: 'condition' }>;
type FlowPanel = Extract<BlockPanel, { kind: 'flow' }>;

const SCOPES: readonly Scope[] = ['project', 'feature', 'task'];
const SCOPE_OPTIONS: SelectOption[] = SCOPES.map((scope) => ({ value: scope, label: scope }));

export interface PropertyPanelProps {
  config: ProjectConfig;
  flowId: string;
  panel: BlockPanel;
  onChange: (config: ProjectConfig) => void;
  /** Called after the flow itself is deleted, so the host leaves the flow's tab. */
  onFlowDeleted: () => void;
}

export function PropertyPanel({ config, flowId, panel, onChange, onFlowDeleted }: PropertyPanelProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function toggle() {
    setNotice(null);
    if (panel.kind === 'flow') {
      onChange(setFlowEnabled(config, panel.id, !panel.enabled));
    } else {
      onChange(setBlockEnabled(config, flowId, panel.id, !panel.enabled));
    }
  }

  function remove() {
    setConfirming(false);
    if (panel.kind === 'flow') {
      onChange(deleteFlow(config, panel.id));
      onFlowDeleted();
      return;
    }
    setNotice(commit(deleteBlock(config, flowId, panel.id), onChange));
  }

  return (
    <section aria-label="Property panel">
      <h2>
        {heading(panel)}
        {panel.enabled ? '' : ' (off)'}
      </h2>
      <Fields config={config} flowId={flowId} panel={panel} onChange={onChange} setNotice={setNotice} />
      <p>Generates {panel.generatedFile}</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={toggle}>
          {panel.enabled ? 'Switch off' : 'Switch on'}
        </button>
        <button type="button" onClick={() => setConfirming(true)}>
          Delete
        </button>
      </div>
      {confirming && (
        <ConfirmDelete
          question={panel.kind === 'flow' ? deleteFlowQuestion(config, panel.id) : deleteBlockQuestion(config, flowId, panel.id)}
          onConfirm={remove}
          onCancel={() => setConfirming(false)}
        />
      )}
      <Notice message={notice} />
    </section>
  );
}

interface FieldsProps {
  config: ProjectConfig;
  flowId: string;
  panel: BlockPanel;
  onChange: (config: ProjectConfig) => void;
  setNotice: (message: string | null) => void;
}

function Fields(props: FieldsProps) {
  const { panel } = props;
  switch (panel.kind) {
    case 'start':
      return <p>The entry of the flow. It stays first.</p>;
    case 'agent':
      return <AgentFields {...props} panel={panel} />;
    case 'condition':
      return <ConditionFields {...props} panel={panel} />;
    case 'connection':
      return (
        <>
          <Row label="Runs after" value={panel.from} />
          <Row label="Then" value={panel.to} />
          <Row label="Artifact handed over" value={panel.artifact} />
        </>
      );
    case 'end':
      return (
        <>
          <Row label="Outcome" value={panel.outcome} />
          <Row label="Produces" value={panel.produced ?? 'nothing'} />
        </>
      );
    case 'flow':
      return <FlowFields {...props} panel={panel} />;
  }
}

function AgentFields({ config, flowId, panel, onChange, setNotice }: FieldsProps & { panel: AgentPanel }) {
  const edit = (change: AgentChange) => commit(editAgent(config, flowId, panel.id, change), onChange);
  const warning = agentIterationWarning(config, flowId, panel.id);
  return (
    <>
      <TextDraft label="Name" value={panel.name} onApply={(text) => edit({ field: 'name', value: text })} />
      <TextDraft
        label="Description: when Claude should use it"
        value={panel.description}
        multiline
        onApply={(text) => edit({ field: 'description', value: text })}
      />
      <Select
        label="Scope"
        value={panel.scope}
        options={SCOPE_OPTIONS}
        onSelect={(value) => {
          const scope = SCOPES.find((item) => item === value);
          if (scope !== undefined) setNotice(edit({ field: 'scope', value: scope }));
        }}
      />
      {warning !== null && <p role="note">{warning}</p>}
      <Select
        label="Model"
        value={panel.model ?? ''}
        options={MODEL_OPTIONS}
        onSelect={(value) => setNotice(edit({ field: 'model', value: MODELS.find((model) => model === value) }))}
      />
      <TextDraft
        label="Allowed tools (one per line)"
        value={panel.tools.join('\n')}
        multiline
        onApply={(text) => edit({ field: 'tools', value: splitLines(text) })}
      />
      <TextDraft
        label="Body"
        value={panel.body}
        multiline
        cap={AGENT_BODY_CAP}
        onApply={(text) => edit({ field: 'body', value: text })}
      />
      <Row label="Reads" value={listText(panel.reads)} />
      <Row label="Writes" value={listText(panel.writes)} />
      <TextDraft
        label="Rule tags (one per line)"
        value={panel.ruleTags.join('\n')}
        multiline
        onApply={(text) =>
          commit(setRuleTags(config, { kind: 'agent', flowId, agentId: panel.id }, splitLines(text)), onChange)
        }
      />
    </>
  );
}

function ConditionFields({ config, flowId, panel, onChange, setNotice }: FieldsProps & { panel: ConditionPanel }) {
  const block = conditionBlock(config, flowId, panel.id);
  const offered: Route[] = backRouteTargets(config, flowId, panel.id).map((blockId): Route => ({ kind: 'back', blockId }));
  const save = (pass: Route, fail: Route, roundLimit: number | undefined) =>
    commit(setConditionRoutes(config, flowId, panel.id, { pass, fail, roundLimit }), onChange);
  const warning = unboundedRetryWarning(block);
  const threshold = panel.checkType === 'diff-size' && panel.threshold !== null ? ` (${panel.threshold} lines)` : '';
  return (
    <>
      <Row label="Checks" value={`${panel.checkType}${threshold}`} />
      <Row label="Decided by" value={panel.decidedBy} />
      <Row label="Passes when" value={panel.description} />
      <Select
        label="Pass goes to"
        value={routeValue(block.passRoute)}
        options={routeOptions(offered, block.passRoute, true)}
        onSelect={(value) => setNotice(save(routeFromValue(value), block.failRoute, block.roundLimit))}
      />
      <Select
        label="Fail goes to"
        value={routeValue(block.failRoute)}
        options={routeOptions(offered, block.failRoute, true)}
        onSelect={(value) => setNotice(save(block.passRoute, routeFromValue(value), block.roundLimit))}
      />
      {/* Keyed by both routes: a route change can drop the round limit (AC-015, AC-021), so the field shows the saved value. */}
      <TextDraft
        key={`${routeValue(block.passRoute)}|${routeValue(block.failRoute)}`}
        label="Round limit (empty for no limit)"
        value={block.roundLimit === undefined ? '' : String(block.roundLimit)}
        onApply={(text) => {
          const check = checkRoundLimit(text);
          if (!check.ok) return check.message;
          return save(block.passRoute, block.failRoute, check.value);
        }}
      />
      {warning !== null && <p role="note">{warning}</p>}
    </>
  );
}

function FlowFields({ config, panel, onChange }: FieldsProps & { panel: FlowPanel }) {
  return (
    <>
      <TextDraft label="Name" value={panel.name} onApply={(text) => commit(renameFlow(config, panel.id, text), onChange)} />
      <Row label="Description" value={panel.description} />
      <Row label="Scope" value={panel.scope} />
      <Row label="Blocks" value={String(panel.blockCount)} />
      <TextDraft
        label="Rule tags (one per line)"
        value={panel.ruleTags.join('\n')}
        multiline
        onApply={(text) => commit(setRuleTags(config, { kind: 'flow', flowId: panel.id }, splitLines(text)), onChange)}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <strong>{label}:</strong> {value}
    </p>
  );
}

function heading(panel: BlockPanel): string {
  switch (panel.kind) {
    case 'start':
      return 'Start';
    case 'agent':
      return `Agent: ${panel.name}`;
    case 'condition':
      return `Condition: ${panel.checkType}`;
    case 'connection':
      return `Connection: ${panel.from} → ${panel.to}`;
    case 'end':
      return 'End';
    case 'flow':
      return `Flow: ${panel.name}`;
  }
}

function listText(items: readonly string[]): string {
  return items.length === 0 ? 'none' : items.join(', ');
}

/** The raw Condition of the flow, for its routes and round limit. An id that is not a Condition here is a programmer error. */
function conditionBlock(config: ProjectConfig, flowId: string, blockId: string): ConditionBlock {
  const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === flowId);
  const block = flow?.kind === 'flow' ? flow.blocks.find((child) => child.id === blockId) : undefined;
  if (block?.kind !== 'condition') {
    throw new Error(`Block ${blockId} is not a Condition of flow ${flowId}`);
  }
  return block;
}
