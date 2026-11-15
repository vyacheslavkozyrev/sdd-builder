import type { AnalysisFinding, pipeline } from '@sddbuilder/core';

/** The fixed review task and reply format. Only the configuration follows it. */
const REVIEW_INSTRUCTIONS = [
  'You are reviewing a project brief and the spec-driven development process a user designed for it.',
  'Find:',
  '- gaps in the idea: what the brief leaves unsaid that building the product would need;',
  '- contradictory rules, and rules that no test or review could verify;',
  '- test rules that name tools outside the stack (the stack section lists what is in use);',
  '- suggested steps that the process lacks.',
  'This is advice only. Do not change the brief or the process. The structure is checked elsewhere; do not repeat structural problems.',
  'Reply with ONLY a JSON array of objects, with no prose and no code fence. Each object has exactly these fields:',
  "- severity: one of 'info', 'warning' or 'blocker';",
  '- subject: a string naming the part of the brief or the process the finding is about;',
  '- message: a string stating the finding and what to do about it.',
  'If there is nothing to report, reply with [].',
].join('\n');

const BRIEF_HEADING = 'Brief and process (JSON):';

/** Collapses line breaks and other white space, so text taken from the brief cannot start a new list line. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/**
 * The structural findings the review must not repeat, one per line in the order given.
 * Returns an empty string when there are none, so no list section is emitted.
 */
function structuralSection(structural: readonly AnalysisFinding[]): string {
  if (structural.length === 0) {
    return '';
  }
  const lines = structural.map(
    (finding) => `- [${finding.severity}] ${oneLine(finding.subject)}: ${oneLine(finding.message)}`,
  );
  return [
    'The structural check has already found these problems. Do not repeat any of them, and do not restate one in other words: a finding about the same problem is a repeat.',
    ...lines,
  ].join('\n');
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

/** One enabled block of a flow. Only agent blocks carry a description; the others keep their kind and the field that shapes the process. */
function pickFlowBlock(block: pipeline.ChildBlock) {
  switch (block.kind) {
    case 'agent':
      return { kind: block.kind, id: block.id, name: block.name, scope: block.scope, description: block.description };
    case 'condition':
      return { kind: block.kind, id: block.id, checkType: block.checkType, decidedBy: block.decidedBy };
    case 'end':
      return { kind: block.kind, id: block.id, outcome: block.outcome, produced: block.produced };
    case 'connection':
      return { kind: block.kind, id: block.id, from: block.from, to: block.to, artifact: block.artifact };
    case 'start':
      return { kind: block.kind, id: block.id };
  }
}

/** The enabled flows of the pipeline in pipeline order, each with its enabled blocks in order. Disabled flows and blocks are left out. */
function pickFlows(config: pipeline.ProjectConfig) {
  return config.pipeline.blocks.flatMap((block) => {
    if (block.kind !== 'flow' || !block.enabled) {
      return [];
    }
    return [
      {
        id: block.id,
        name: block.name,
        description: block.description,
        blocks: block.blocks.filter((child) => child.enabled).map(pickFlowBlock),
      },
    ];
  });
}

/**
 * Picks the brief (name, idea and stack), the enabled flows and the rules in a
 * fixed key order, so the text depends only on the values, never on how the object was built.
 */
function pickPipelineProject(config: pipeline.ProjectConfig) {
  return {
    name: config.name,
    idea: config.idea,
    stack: pickStack(config.stack),
    flows: pickFlows(config),
    rules: config.rules.map((rule) => ({ title: rule.title, text: rule.text })),
  };
}

/**
 * Builds the review prompt for a pipeline config: the fixed review task, the
 * structural findings the review must not repeat (when there are any), then the
 * brief, the enabled flows and the rules as JSON. A pure function of its inputs:
 * it reads no environment, clock or file, so the same input gives the same text.
 */
export function buildPipelineReviewPrompt(
  config: pipeline.ProjectConfig,
  structural: readonly AnalysisFinding[],
): string {
  const json = JSON.stringify(pickPipelineProject(config), null, 2);
  const section = structuralSection(structural);
  const parts = section === '' ? [REVIEW_INSTRUCTIONS] : [REVIEW_INSTRUCTIONS, '', section];
  return [...parts, '', BRIEF_HEADING, json].join('\n');
}
