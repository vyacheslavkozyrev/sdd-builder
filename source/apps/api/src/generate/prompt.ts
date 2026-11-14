import type { GenerationPlan, ProjectConfig } from '@sddbuilder/core';
import { oneLine, pickProject } from '../review/prompt.js';

/** The fixed generation task and reply format. Only the brief, the plan and the findings follow it. */
const GENERATION_INSTRUCTIONS = [
  'You are writing the files of a Claude Code project framework for the project described below.',
  'For each planned file, write its full content. The layout shows the structure the file must have; the description and rule tags say what the file is for and which rules apply to it.',
  'Write for this project only. Do not mention the tool that produced these files. Leave no placeholders, such as braces around a name, and no TODO markers.',
  'Reply with ONLY one JSON object that maps each planned path to its text, with no prose and no code fence. Use exactly the planned paths as keys, and no other keys. Every value is a string.',
].join('\n');

const BRIEF_HEADING = 'Brief and process (JSON):';
const PLAN_HEADING = 'Planned files, in order:';
const FINDINGS_HEADING = 'Findings of the previous reply. Fix each of them in this reply:';

/** Lists each planned file with its path, description, rule tags and layout, in plan order. */
function plannedSection(plan: GenerationPlan): string {
  if (plan.length === 0) {
    return 'No files are planned.';
  }
  return plan
    .map((entry, index) =>
      [
        `File ${index + 1} of ${plan.length}: ${entry.path}`,
        `Description: ${oneLine(entry.description) || '(none)'}`,
        `Rule tags: ${entry.ruleTags.length === 0 ? '(none)' : entry.ruleTags.join(', ')}`,
        'Layout:',
        entry.layout,
      ].join('\n'),
    )
    .join('\n\n');
}

/** The findings of the previous reply, one per line in the order given. */
function findingsSection(findings: readonly string[]): string {
  return [FINDINGS_HEADING, ...findings.map((finding) => `- ${oneLine(finding)}`)].join('\n');
}

/**
 * Builds the generation prompt: the fixed task, the brief and the process as
 * JSON, each planned file in plan order, and, for a retry, the findings of the
 * previous reply. A pure function of its inputs: it reads no environment,
 * clock or file, so the same input gives the same text.
 */
export function buildGenerationPrompt(
  config: ProjectConfig,
  plan: GenerationPlan,
  findings?: readonly string[],
): string {
  const json = JSON.stringify(pickProject(config), null, 2);
  const parts = [GENERATION_INSTRUCTIONS, '', BRIEF_HEADING, json, '', PLAN_HEADING, plannedSection(plan)];
  if (findings !== undefined && findings.length > 0) {
    parts.push('', findingsSection(findings));
  }
  return parts.join('\n');
}
