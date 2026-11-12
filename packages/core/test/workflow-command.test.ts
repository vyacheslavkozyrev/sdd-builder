import { describe, expect, it } from 'vitest';
import { renderWorkflowCommand, templateSourceFromRecord, TemplateError, type Workflow } from '../src/index.js';
import { baseConfig } from './fixtures.js';

const FRAME = [
  '# {{workflow.name}} ({{workflow.id}})',
  '{{workflow.scope}}',
  '',
  '## Steps',
  '{{workflow.steps}}',
  '',
  '## Rules',
  '{{workflow.rules}}',
  '',
].join('\n');

const templates = templateSourceFromRecord({ 'workflows/workflow.md': FRAME });

function implementCycle(): Workflow {
  const found = baseConfig().workflows.find((w) => w.id === 'implement-cycle');
  if (!found) {
    throw new Error('default implement-cycle workflow missing');
  }
  return found;
}

describe('F-02 T012 workflow command', () => {
  it('F-02 AC-015 writes one command per workflow at .claude/commands/workflow-<id>.md', () => {
    const file = renderWorkflowCommand(baseConfig(), implementCycle(), templates);
    expect(file.path).toBe('.claude/commands/workflow-implement-cycle.md');
  });

  it('F-02 AC-016 lists the enabled steps as numbered items in tab order, each naming its file', () => {
    const { content } = renderWorkflowCommand(baseConfig(), implementCycle(), templates);
    expect(content).toContain(
      [
        '1. Implement (agent: `.claude/agents/implement.md`)',
        '2. Code review (agent: `.claude/agents/code-review.md`)',
        '3. Unit tests (script: `scripts/unit-tests.sh`)',
        '4. Commit (command: `.claude/commands/commit.md`)',
      ].join('\n'),
    );
    expect(content).not.toContain('End-to-end tests');
  });

  it('F-02 AC-019 states the scope and iteration source', () => {
    const { content } = renderWorkflowCommand(baseConfig(), implementCycle(), templates);
    expect(content).toContain('# Implement (implement-cycle)');
    expect(content).toContain('for each task in plan.md');
  });

  it('F-02 AC-019 a project-scope workflow says it runs once per project', () => {
    const release = baseConfig().workflows.find((w) => w.id === 'release-project');
    expect(renderWorkflowCommand(baseConfig(), release!, templates).content).toContain('once per project');
  });

  it('a missing workflow template is refused, naming the template', () => {
    const empty = templateSourceFromRecord({});
    expect(() => renderWorkflowCommand(baseConfig(), implementCycle(), empty)).toThrow(TemplateError);
    expect(() => renderWorkflowCommand(baseConfig(), implementCycle(), empty)).toThrow('workflows/workflow.md: missing workflow template');
  });
});
