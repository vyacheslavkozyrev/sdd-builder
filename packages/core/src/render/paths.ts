import type { StepDefinition } from '../model.js';

/** The file a step generates in the Claude Code layout (templates/README.md). */
export function stepFilePath(step: StepDefinition): string {
  switch (step.kind) {
    case 'command':
      return `.claude/commands/${step.id}.md`;
    case 'agent':
      return `.claude/agents/${step.id}.md`;
    case 'skill':
      return `.claude/skills/${step.id}/SKILL.md`;
    case 'script':
      return `scripts/${step.id}.sh`;
  }
}

/** The file a workflow's command is written to. */
export function workflowFilePath(workflowId: string): string {
  return `.claude/commands/workflow-${workflowId}.md`;
}
