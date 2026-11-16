// Form controls shared by the property panels: a text field that applies each change and shows its refusal, a select, a
// notice, and the route values a Condition or a gate offers. The controls hold no rules of their own; the edit functions
// decide what is accepted, and a refused edit leaves the configuration as it was (F-06 AC-025 to AC-030).
import { useId, useState } from 'react';
import type { pipeline } from '@sddbuilder/core';

type ProjectConfig = pipeline.ProjectConfig;
type Route = pipeline.Route;
type AgentModel = pipeline.AgentModel;

/** The result of an edit as the panels see it: applied with the new configuration, or refused with the reason. */
export type EditResult = { ok: true; config: ProjectConfig } | { ok: false; message: string };

/** Hands an applied configuration to the host, or returns the refusal for the panel to show. */
export function commit(result: EditResult, onChange: (config: ProjectConfig) => void): string | null {
  if (result.ok) {
    onChange(result.config);
    return null;
  }
  return result.message;
}

export const MODELS: readonly AgentModel[] = ['haiku', 'sonnet', 'opus', 'inherit'];

/** The model select: not set, or one of the four models (F-06 AC-026, AC-042). */
export const MODEL_OPTIONS: SelectOption[] = [
  { value: '', label: 'not set' },
  ...MODELS.map((model) => ({ value: model, label: model })),
];

/**
 * A whole-number field's text as a number: digits only, surrounding spaces ignored. Anything else is NaN, which the
 * threshold check refuses (F-06 AC-013).
 */
export function wholeNumberText(text: string): number {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/** Splits a list field into its entries: one per line, trimmed, blank lines dropped. */
export function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

export interface TextDraftProps {
  label: string;
  value: string;
  multiline?: boolean;
  /** Shows "length / cap" under the field, for a capped text such as an agent body (F-06 AC-030). */
  cap?: number;
  onApply: (text: string) => string | null;
}

/**
 * A text field that keeps what the user typed, even when the edit is refused, and shows the refusal under it. Each edit
 * is applied as it is typed. The field is re-created by its panel's key when the selection changes, so the draft never
 * outlives its item.
 */
export function TextDraft({ label, value, multiline = false, cap, onApply }: TextDraftProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [refusal, setRefusal] = useState<string | null>(null);
  const common = {
    id,
    value: draft,
    onChange: (event: { target: { value: string } }) => {
      setDraft(event.target.value);
      setRefusal(onApply(event.target.value));
    },
  };
  return (
    <div style={fieldStyle}>
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea {...common} rows={3} style={controlStyle} /> : <input type="text" {...common} style={controlStyle} />}
      {cap !== undefined && (
        <div style={hintStyle}>
          {draft.length} / {cap}
        </div>
      )}
      {refusal !== null && <div role="alert">{refusal}</div>}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onSelect: (value: string) => void;
}

export function Select({ label, value, options, onSelect }: SelectProps) {
  const id = useId();
  return (
    <div style={fieldStyle}>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onSelect(event.target.value)} style={controlStyle}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A refusal or a note the panel shows; nothing when there is none. */
export function Notice({ message }: { message: string | null }) {
  return message === null ? null : <p role="alert">{message}</p>;
}

/** The value a route has in a select: `next`, `stop`, or `back:<block id>`. */
export function routeValue(route: Route): string {
  switch (route.kind) {
    case 'next':
      return 'next';
    case 'stop':
      return 'stop';
    case 'back':
      return `back:${route.blockId}`;
  }
}

/** The route a select value stands for. Only values made by `routeValue` and `routeOptions` reach it. */
export function routeFromValue(value: string): Route {
  if (value === 'next') return { kind: 'next' };
  if (value === 'stop') return { kind: 'stop' };
  return { kind: 'back', blockId: value.slice('back:'.length) };
}

/**
 * The options of a route select: next and stop when offered, then a back route to each block offered. A route that is
 * set but not offered any more (its target was deleted) stays in the list, so the select still shows the saved value.
 */
export function routeOptions(offered: readonly Route[], current: Route, withNext: boolean): SelectOption[] {
  const routes: Route[] = [...(withNext ? [{ kind: 'next' as const }] : []), { kind: 'stop' }, ...offered];
  const listed = routes.some((route) => routeValue(route) === routeValue(current));
  const options = routes.map((route) => ({ value: routeValue(route), label: routeLabel(route) }));
  if (!listed) options.push({ value: routeValue(current), label: `${routeLabel(current)} (missing)` });
  return options;
}

function routeLabel(route: Route): string {
  switch (route.kind) {
    case 'next':
      return 'next';
    case 'stop':
      return 'stop';
    case 'back':
      return `back to ${route.blockId}`;
  }
}

const fieldStyle = { marginBottom: 8 } as const;

const controlStyle = { display: 'block', width: '100%', boxSizing: 'border-box' } as const;

const hintStyle = { fontSize: 12, color: '#52525b' } as const;
