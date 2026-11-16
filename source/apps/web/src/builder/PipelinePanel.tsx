// The Map tab's property panels: the pipeline (its properties, rule tags and arguments, shown when nothing is selected)
// and a gate or check on a connection (its description, threshold, fail route and round limit) (F-06 AC-013 to AC-016,
// AC-025, AC-042). The rules are the edit functions of map-edit, pipeline-edit and entry-checks; this view binds them.
import { useState } from 'react';
import type { pipeline } from '@sddbuilder/core';
import { addArgument, editArgument, editPipeline, removeArgument, setRuleTags } from './pipeline-edit.js';
import type { PipelineChange } from './pipeline-edit.js';
import { failRouteOptions, setGateSettings } from './map-edit.js';
import type { GateSettings } from './map-edit.js';
import { AGENT_BODY_CAP, unboundedRetryWarning } from './entry-checks.js';
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
  wholeNumberText,
} from './FormFields.js';

type ProjectConfig = pipeline.ProjectConfig;
type PipelineConditionBlock = pipeline.PipelineConditionBlock;
type PipelineStartBlock = pipeline.PipelineStartBlock;

export interface PipelinePanelProps {
  config: ProjectConfig;
  onChange: (config: ProjectConfig) => void;
}

/** The pipeline's panel: its name, description, model, tools, body, rule tags and arguments (F-06 AC-042, AC-025). */
export function PipelinePanel({ config, onChange }: PipelinePanelProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const { pipeline: current } = config;
  const start = current.blocks.find((block): block is PipelineStartBlock => block.kind === 'start');
  const edit = (change: PipelineChange) => commit(editPipeline(config, change), onChange);

  return (
    <section aria-label="Pipeline panel">
      <h2>Pipeline: {current.name}</h2>
      <TextDraft label="Name" value={current.name} onApply={(text) => edit({ field: 'name', value: text })} />
      <TextDraft
        label="Description"
        value={current.description ?? ''}
        multiline
        onApply={(text) => edit({ field: 'description', value: text })}
      />
      <Select
        label="Model"
        value={current.model ?? ''}
        options={MODEL_OPTIONS}
        onSelect={(value) => setNotice(edit({ field: 'model', value: MODELS.find((model) => model === value) }))}
      />
      <TextDraft
        label="Allowed tools (one per line)"
        value={(current.tools ?? []).join('\n')}
        multiline
        onApply={(text) => edit({ field: 'tools', value: splitLines(text) })}
      />
      <TextDraft
        label="Body"
        value={current.body ?? ''}
        multiline
        cap={AGENT_BODY_CAP}
        onApply={(text) => edit({ field: 'body', value: text })}
      />
      <TextDraft
        label="Rule tags (one per line)"
        value={(current.ruleTags ?? []).join('\n')}
        multiline
        onApply={(text) => commit(setRuleTags(config, { kind: 'pipeline' }, splitLines(text)), onChange)}
      />

      <section aria-label="Pipeline arguments">
        <h3>Arguments</h3>
        {start === undefined || start.arguments.length === 0 ? (
          <p>No argument yet.</p>
        ) : (
          start.arguments.map((argument, row) => (
            // The generation counter re-creates the rows after a removal, so a draft stays with the row it was typed in.
            <fieldset key={`${generation}-${row}`} style={rowStyle}>
              <legend>Row {row + 1}</legend>
              <TextDraft
                label="Name"
                value={argument.name}
                onApply={(text) => commit(editArgument(config, row, { field: 'name', value: text }), onChange)}
              />
              <label>
                <input
                  type="checkbox"
                  checked={argument.required}
                  onChange={(event) =>
                    setNotice(commit(editArgument(config, row, { field: 'required', value: event.target.checked }), onChange))
                  }
                />{' '}
                Required
              </label>
              <TextDraft
                label="Hint"
                value={argument.hint}
                onApply={(text) => commit(editArgument(config, row, { field: 'hint', value: text }), onChange)}
              />
              <button
                type="button"
                onClick={() => {
                  setGeneration((value) => value + 1);
                  setNotice(commit(removeArgument(config, row), onChange));
                }}
              >
                Remove argument
              </button>
            </fieldset>
          ))
        )}
        <button type="button" onClick={() => setNotice(commit(addArgument(config), onChange))}>
          Add argument
        </button>
      </section>
      <Notice message={notice} />
    </section>
  );
}

export interface GatePanelProps {
  config: ProjectConfig;
  gateId: string;
  onChange: (config: ProjectConfig) => void;
}

/** The panel of a gate or check on a connection between two flows (F-06 AC-013 to AC-016). */
export function GatePanel({ config, gateId, onChange }: GatePanelProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const gate = config.pipeline.blocks.find(
    (block): block is PipelineConditionBlock => block.kind === 'condition' && block.id === gateId,
  );
  if (gate === undefined) return null;

  const settings = (change: Partial<GateSettings>): GateSettings => {
    const threshold = gate.checkType === 'diff-size' ? gate.threshold : undefined;
    const base: GateSettings = {
      description: gate.description,
      failRoute: gate.failRoute,
      roundLimit: gate.roundLimit === undefined ? '' : String(gate.roundLimit),
      ...(threshold === undefined ? {} : { threshold }),
    };
    return { ...base, ...change };
  };
  const save = (change: Partial<GateSettings>) => commit(setGateSettings(config, gateId, settings(change)), onChange);
  const offered = failRouteOptions(config, gateId).filter((route) => route.kind === 'back');
  const warning = unboundedRetryWarning(gate);

  return (
    <section aria-label="Gate panel">
      <h2>{gate.checkType === 'approval' ? 'Approval' : `Check: ${gate.checkType}`}</h2>
      <p>
        <strong>Decided by:</strong> {gate.decidedBy}
      </p>
      <p>
        <strong>Pass goes to:</strong> next
      </p>
      <TextDraft
        label="Passes when (description)"
        value={gate.description}
        multiline
        onApply={(text) => save({ description: text })}
      />
      {gate.checkType === 'diff-size' && (
        <TextDraft
          label="Threshold (lines)"
          value={String(gate.threshold)}
          onApply={(text) => save({ threshold: wholeNumberText(text) })}
        />
      )}
      <Select
        label="Fail goes to"
        value={routeValue(gate.failRoute)}
        options={routeOptions(offered, gate.failRoute, false)}
        onSelect={(value) => setNotice(save({ failRoute: routeFromValue(value) }))}
      />
      {/* Keyed by the route: a route change can drop the round limit (AC-015), and the field must show the saved value. */}
      <TextDraft
        key={routeValue(gate.failRoute)}
        label="Round limit (empty for no limit)"
        value={gate.roundLimit === undefined ? '' : String(gate.roundLimit)}
        onApply={(text) => save({ roundLimit: text })}
      />
      {warning !== null && <p role="note">{warning}</p>}
      <Notice message={notice} />
    </section>
  );
}

const rowStyle = { border: '1px solid #d4d4d8', borderRadius: 6, padding: '6px 8px', marginBottom: 8 } as const;
