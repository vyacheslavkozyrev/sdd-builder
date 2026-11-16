// Settings of a generated agent or command file (F-06 AC-031): the frontmatter, then the generated text, then the body
// after it. An agent file always has its name and description in the frontmatter; the model and tools are written only
// when set. A pipeline command takes only the settings that are set. Pure: the text is returned, never written.
import type { AgentBlock, AgentSettings } from '../model.js';

/** The frontmatter lines of the settings that are set: `model`, then `tools` joined by commas. */
function settingLines(settings: AgentSettings): string[] {
  const lines: string[] = [];
  if (settings.model !== undefined) lines.push(`model: ${settings.model}`);
  if (settings.tools !== undefined && settings.tools.length > 0) lines.push(`tools: ${settings.tools.join(', ')}`);
  return lines;
}

/** The `---` lines around the frontmatter lines, or nothing when there are none. */
function frontmatter(lines: string[]): string[] {
  return lines.length === 0 ? [] : ['---', ...lines, '---'];
}

/** The generated text, then the body after it when the body is not blank. */
function textWithBody(settings: AgentSettings, generated: string): string {
  const body = settings.body ?? '';
  return body.trim() === '' ? generated.trimEnd() : `${generated.trimEnd()}\n\n${body.trimEnd()}`;
}

/**
 * A pipeline command or another generated file: the set model and tools in the frontmatter, then the generated text,
 * then the body. Ends with exactly one newline. Deterministic for the same settings and text.
 */
export function settingsFile(settings: AgentSettings, generated: string): string {
  return `${[...frontmatter(settingLines(settings)), textWithBody(settings, generated)].join('\n')}\n`;
}

/**
 * An agent file: `name` and `description` always in the frontmatter, then the set model and tools, then the stub text and
 * the body. The name and description are written as JSON strings, which are valid YAML, so a colon or a line break in the
 * description cannot break the frontmatter. Ends with exactly one newline.
 */
export function agentFileText(block: AgentBlock, stub: string): string {
  const header = [`name: ${JSON.stringify(block.name)}`, `description: ${JSON.stringify(block.description)}`];
  return `${[...frontmatter([...header, ...settingLines(block)]), textWithBody(block, stub)].join('\n')}\n`;
}
