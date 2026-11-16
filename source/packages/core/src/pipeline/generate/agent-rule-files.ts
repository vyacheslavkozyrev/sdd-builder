// Agent and rule files (F-02 AC-027, AC-028): one `.claude/agents/<name>.md` per enabled Agent block in an enabled flow,
// holding the block's description as stub text, and one `.claude/rules/<id>.md` per entry of the config's rules. The
// rules come from the config, not from the selection. Pure: the files are returned, never written. The stub text is
// replaced by LLM-written content in F-07 (AC-027). The frontmatter of an agent file carries its name and description,
// and its model, tools and body when set (F-06 AC-031, see settings-file.ts).
import type { GeneratedFile } from '../../model.js';
import { ID_MESSAGE, isValidId } from '../ids.js';
import type { AgentBlock, ProjectConfig } from '../model.js';
import { selectBlocks } from './select.js';
import { agentFileText } from './settings-file.js';

const AGENTS_DIR = '.claude/agents/';
const RULES_DIR = '.claude/rules/';

/** The agent file of one Agent block: its frontmatter, then its name as the heading and its description as the stub text. */
function agentFile(block: AgentBlock): GeneratedFile {
  return {
    path: `${AGENTS_DIR}${block.name}.md`,
    content: agentFileText(block, `# ${block.name}\n\n${block.description}\n`),
  };
}

/** The rule file of one entry of the config's rules: its title as the heading, then its text. */
function ruleFile(id: string, title: string, text: string): GeneratedFile {
  return { path: `${RULES_DIR}${id}.md`, content: `# ${title}\n\n${text}\n` };
}

/** Throws when a name or id is not file-safe: the refusal checks keep such a config out, so this is a programmer error. */
function requireFileSafe(kind: string, value: string): void {
  if (!isValidId(value)) throw new Error(`${kind} "${value}" cannot be a file name: ${ID_MESSAGE}`);
}

/**
 * Renders the agent files of the enabled Agent blocks in enabled flows and the rule files of the config, sorted by path
 * (F-02 AC-027, AC-028). A disabled Agent, or an Agent in a disabled flow, gives no file. Deterministic for the same config.
 * Throws when an agent name or a rule id is not file-safe, so no file is written outside `.claude/`.
 */
export function renderAgentAndRuleFiles(config: ProjectConfig): GeneratedFile[] {
  const agents = selectBlocks(config).flows.flatMap((entry) =>
    entry.blocks.flatMap((block) => {
      if (block.kind !== 'agent') return [];
      requireFileSafe('Agent name', block.name);
      return [agentFile(block)];
    }),
  );
  const rules = config.rules.map((rule) => {
    requireFileSafe('Rule id', rule.id);
    return ruleFile(rule.id, rule.title, rule.text);
  });
  return [...agents, ...rules].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
