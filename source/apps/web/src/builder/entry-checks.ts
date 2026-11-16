// Entry checks on the gate settings (F-06 AC-013, AC-014, AC-015, AC-016) and on the custom agent fields (F-06 AC-026,
// AC-027, AC-030). Pure: no DOM, no storage, no network. A check refuses a value the model cannot hold, and gives the
// reason; the settings edit is then not applied. The unbounded-retry warning is not a refusal: the panel shows it beside
// a retry that has no round limit (building-blocks §12).
import { pipeline } from '@sddbuilder/core';

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

/** The fields of a Condition the retry rule reads: a flow's Condition or a pipeline gate. */
type RetryFields = Pick<pipeline.ConditionBlock, 'id' | 'passRoute' | 'failRoute' | 'roundLimit'>;

/**
 * The warning the panel shows for a gate whose pass or fail route goes back with no round limit (building-blocks §12).
 * Null when no route is a retry, or when the retry has a limit.
 */
export function unboundedRetryWarning(gate: RetryFields): string | null {
  const retries = gate.passRoute.kind === 'back' || gate.failRoute.kind === 'back';
  if (!retries || gate.roundLimit !== undefined) return null;
  return `The retry of "${gate.id}" is unbounded: it has no round limit.`;
}

/** The longest body an agent takes, in characters (F-06 AC-030). The model holds no cap; the builder refuses above it. */
export const AGENT_BODY_CAP = 4000;

/** A tool name cannot hold a space, a comma or a control character (the core parser's rule, F-06 AC-026). */
const UNSAFE_TOOL_CHARACTER = /[\s,\p{Cc}]/u;

/** An agent name is file-safe: it becomes `.claude/agents/<name>.md`, so it follows the id rule (F-06 AC-027). */
export function checkAgentName(name: string): EntryCheck<string> {
  if (pipeline.isValidId(name)) return { ok: true, value: name };
  return { ok: false, message: `Name: ${pipeline.ID_MESSAGE}.` };
}

/** An agent's description says when Claude should use it: required, and not blank (F-06 AC-026). It is stored trimmed. */
export function checkAgentDescription(text: string): EntryCheck<string> {
  const trimmed = text.trim();
  if (trimmed !== '') return { ok: true, value: trimmed };
  return { ok: false, message: 'Description: required. Say when Claude should use this agent.' };
}

/** A tool name, trimmed: not blank, and no space, comma or control character (F-06 AC-026). */
export function checkToolName(name: string): EntryCheck<string> {
  const trimmed = name.trim();
  if (trimmed !== '' && !UNSAFE_TOOL_CHARACTER.test(trimmed)) return { ok: true, value: trimmed };
  return { ok: false, message: `Tool "${name}": a tool name has no space, comma or control character.` };
}

/** A rule tag names a rule file: file-safe, without the folder, so it follows the id rule (F-06 AC-025). It is stored trimmed. */
export function checkRuleTag(tag: string): EntryCheck<string> {
  const trimmed = tag.trim();
  if (pipeline.isValidId(trimmed)) return { ok: true, value: trimmed };
  return { ok: false, message: `Rule tag "${tag}": the rule's file name, without the folder, ${pipeline.ID_MESSAGE}.` };
}

/** An agent body of at most `AGENT_BODY_CAP` characters, counted as JavaScript string length (F-06 AC-030). */
export function checkAgentBody(text: string): EntryCheck<string> {
  if (text.length <= AGENT_BODY_CAP) return { ok: true, value: text };
  const over = text.length - AGENT_BODY_CAP;
  return { ok: false, message: `Body: ${text.length} / ${AGENT_BODY_CAP}. Cut ${over} characters.` };
}
