// Entry checks on the gate settings (F-06 AC-013, AC-014, AC-015, AC-016). Pure: no DOM, no storage, no network. A check
// refuses a value the model cannot hold, and gives the reason; the settings edit is then not applied. The unbounded-retry
// warning is not a refusal: the panel shows it beside a retry that has no round limit (building-blocks §12).
import { pipeline } from '@sddbuilder/core';

type PipelineConditionBlock = pipeline.PipelineConditionBlock;

/** A value that passed its entry check, or the reason it was refused. */
export type EntryCheck<T> = { ok: true; value: T } | { ok: false; message: string };

/** A diff-size threshold is a positive whole number of lines (F-06 AC-013). */
export function checkThreshold(value: number): EntryCheck<number> {
  if (Number.isInteger(value) && value > 0) return { ok: true, value };
  return { ok: false, message: 'A diff-size threshold is a positive whole number of lines.' };
}

/**
 * A round limit as the panel's text. Empty means no limit (`undefined`); otherwise it is a positive whole number
 * (F-06 AC-015). Surrounding spaces are ignored; a sign, a decimal point or an exponent is refused.
 */
export function checkRoundLimit(text: string): EntryCheck<number | undefined> {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, value: undefined };
  const value = /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
  if (Number.isSafeInteger(value) && value >= 1) return { ok: true, value };
  return { ok: false, message: 'A round limit is a positive whole number, or empty for no limit.' };
}

/** A gate's description is what passing means: required, and not blank (F-06 AC-016). It is stored trimmed. */
export function checkDescription(text: string): EntryCheck<string> {
  const trimmed = text.trim();
  if (trimmed !== '') return { ok: true, value: trimmed };
  return { ok: false, message: 'A gate needs a description: what passing means.' };
}

/**
 * The warning the panel shows for a gate whose pass or fail route goes back with no round limit (building-blocks §12).
 * Null when no route is a retry, or when the retry has a limit.
 */
export function unboundedRetryWarning(gate: PipelineConditionBlock): string | null {
  const retries = gate.passRoute.kind === 'back' || gate.failRoute.kind === 'back';
  if (!retries || gate.roundLimit !== undefined) return null;
  return `The retry of "${gate.id}" is unbounded: it has no round limit.`;
}
