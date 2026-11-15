import { templateSourceFromRecord, type TemplateSource } from '../src/index.js';

/** A complete set of fixture templates for every catalog step, base file and rule file. */
export function fullTemplates(): TemplateSource {
  return templateSourceFromRecord({
    'flat/base/CLAUDE.md': '# {{projectName}}\n\n{{idea}}\n',
    'flat/base/process.md': '# Process\n\n{{process.diagram}}\n',
    'flat/base/spec-template/stories.md': '# Stories\n',
    'flat/base/spec-template/plan.md': '# Plan\n',
    'flat/base/spec-template/progress.md': '# Progress\n',
    'workflows/workflow.md': '# {{workflow.name}} ({{workflow.id}})\n{{workflow.scope}}\n\n## Steps\n{{workflow.steps}}\n\n## Rules\n{{workflow.rules}}\n',
    'steps/define-feature/command.md': '# Define feature\n',
    'steps/refine/command.md': '# Refine\n',
    'steps/plan/command.md': '# Plan\n',
    'steps/implement/agent.md': '# Implement\n',
    'steps/code-review/agent.md': '# Code review\n',
    'steps/unit-tests/script.md': '# Unit tests\n',
    'steps/e2e-tests/script.md': '# End-to-end tests\n',
    'steps/commit/command.md': '# Commit\n',
    'steps/verify/agent.md': '# Verify\n',
    'steps/release/command.md': '# Release\n',
    'rules/code.md': '# Code rules\n',
    'rules/qa.md': '# QA rules\n',
  });
}
