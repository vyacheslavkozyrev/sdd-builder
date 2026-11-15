import type { pipeline } from '@sddbuilder/core';

type PipelinePlanEntry = pipeline.PipelinePlanEntry;

/** The fixed generation task and reply format. Only the brief, the plan and the findings follow it. */
const GENERATION_INSTRUCTIONS = [
  'You are writing the files of a Claude Code project framework for the project described below.',
  'For each planned file, write its full content. The layout shows the structure the file must have; the description and rule tags say what the file is for and which rules apply to it.',
  'Write for this project only. Do not mention the tool that produced these files. Leave no placeholders, such as braces around a name, and no TODO markers.',
  'Reply with ONLY one JSON object that maps each planned path to its text, with no prose and no code fence. Use exactly the planned paths as keys, and no other keys. Every value is a string.',
].join('\n');

const BRIEF_HEADING = 'Brief (JSON):';
const PLAN_HEADING = 'Planned files, in order:';
const FINDINGS_HEADING = 'Findings of the previous reply. Fix each of them in this reply:';

/**
 * Collapses line breaks and other white space to single spaces and trims the ends, so text taken from the brief
 * cannot start a new list line, and a blank text reads as empty.
 */
function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function pickStack(stack: pipeline.ProjectStack) {
  return {
    language: stack.language,
    framework: stack.framework,
    platform: stack.platform,
    buildTool: stack.buildTool,
    testFramework: stack.testFramework,
  };
}

/**
 * Picks the brief (name, idea, stack and rules) in a fixed key order, so the text
 * depends only on the values, never on how the object was built. The process is
 * already in the plan, so the flows and blocks are left out here.
 */
function pickBrief(config: pipeline.ProjectConfig) {
  return {
    name: config.name,
    idea: config.idea,
    stack: pickStack(config.stack),
    rules: config.rules.map((rule) => ({ title: rule.title, text: rule.text })),
  };
}

/** Lists each planned file with its path, description, rule tags and layout, in plan order. */
function plannedSection(plan: readonly PipelinePlanEntry[]): string {
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
 * Builds the generation prompt for a pipeline config: the fixed task, the brief as
 * JSON, each planned file in plan order, and, for a retry, the findings of the
 * previous reply. A pure function of its inputs: it reads no environment,
 * clock or file, so the same input gives the same text.
 */
export function buildGenerationPrompt(
  config: pipeline.ProjectConfig,
  plan: readonly PipelinePlanEntry[],
  findings?: readonly string[],
): string {
  const json = JSON.stringify(pickBrief(config), null, 2);
  const parts = [GENERATION_INSTRUCTIONS, '', BRIEF_HEADING, json, '', PLAN_HEADING, plannedSection(plan)];
  if (findings !== undefined && findings.length > 0) {
    parts.push('', findingsSection(findings));
  }
  return parts.join('\n');
}
