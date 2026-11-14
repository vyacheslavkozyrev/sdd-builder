/**
 * The id rule for block, flow, argument and agent ids and names: lowercase letters,
 * digits and hyphens, starting with a letter. The rule keeps every id file-safe, since
 * ids and names become file and folder names in the generated output.
 */
export const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/** The refusal text for a value that breaks the id rule. */
export const ID_MESSAGE = 'must be lowercase letters, digits and hyphens, starting with a letter';

/** True when the value follows the id rule. */
export function isValidId(value: string): boolean {
  return ID_PATTERN.test(value);
}
