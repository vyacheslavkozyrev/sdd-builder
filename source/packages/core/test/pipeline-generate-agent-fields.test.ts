import { describe, expect, it } from 'vitest';
import { renderAgentAndRuleFiles } from '../src/pipeline/generate/agent-rule-files.js';
import { renderPipelineCommand } from '../src/pipeline/generate/pipeline-command.js';
import type { AgentBlock, AgentSettings, ProjectConfig } from '../src/pipeline/model.js';
import { configWith, gate, NEXT, pipelineEnd, pipelineStart, STOP, validFlow } from './pipeline-routes-fixtures.js';

const WRITER_PATH = '.claude/agents/writer.md';
const COMMAND_PATH = '.claude/commands/pipeline.md';
const WRITER_HEADER = '---\nname: "writer"\ndescription: "Writes the user stories."\n---\n';
const WRITER_STUB = '# writer\n\nWrites the user stories.\n';

/** An enabled Agent block named `writer`, with the given settings. */
function writer(settings: AgentSettings = {}): AgentBlock {
  return { kind: 'agent', id: 'a1', enabled: true, name: 'writer', scope: 'feature', description: 'Writes the user stories.', ...settings };
}

/** A config with one agent in one flow, in the default pipeline shape. */
function configWithAgent(settings: AgentSettings = {}): ProjectConfig {
  return configWith([pipelineStart(), validFlow('a', [writer(settings)]), pipelineEnd()]);
}

/** A config whose pipeline carries the given settings, with no agent. */
function configWithPipeline(settings: AgentSettings): ProjectConfig {
  const config = configWith([pipelineStart(), validFlow('a', []), gate('g1', NEXT, STOP), validFlow('b', []), pipelineEnd()]);
  return { ...config, pipeline: { ...config.pipeline, ...settings } };
}

/** The content of the agent file of the writer in the config. */
function writerFile(config: ProjectConfig): string {
  const file = renderAgentAndRuleFiles(config).find((candidate) => candidate.path === WRITER_PATH);
  if (file === undefined) throw new Error('no writer file');
  return file.content;
}

/** The content of the pipeline command of the config. */
function commandOf(config: ProjectConfig): string {
  return renderPipelineCommand(config).content;
}

describe('F-06 AC-031 agent file frontmatter always holds name and description', () => {
  it('F-06 AC-031 an agent with no settings has name and description in its frontmatter and no model or tools line', () => {
    expect(writerFile(configWithAgent())).toBe(`${WRITER_HEADER}${WRITER_STUB}`);
  });

  it('F-06 AC-031 a blank body adds nothing to the agent file', () => {
    expect(writerFile(configWithAgent({ body: '   \n ' }))).toBe(`${WRITER_HEADER}${WRITER_STUB}`);
  });

  it('F-06 AC-031 an empty tool list writes no tools line', () => {
    expect(writerFile(configWithAgent({ tools: [] }))).toBe(`${WRITER_HEADER}${WRITER_STUB}`);
  });

  it('F-06 AC-031 a description with a colon and a line break is quoted, so the frontmatter stays valid', () => {
    const block: AgentBlock = { ...writer(), description: 'Writes: stories\nfrom the brief.' };
    const config = configWith([pipelineStart(), validFlow('a', [block]), pipelineEnd()]);
    expect(writerFile(config)).toBe(
      '---\nname: "writer"\ndescription: "Writes: stories\\nfrom the brief."\n---\n# writer\n\nWrites: stories\nfrom the brief.\n',
    );
  });
});

describe('F-06 AC-031 agent file frontmatter for model and tools', () => {
  const rows: Array<{ name: string; settings: AgentSettings; model: string }> = [
    {
      name: 'a model alone gives a model line after the description',
      settings: { model: 'haiku' },
      model: 'model: haiku\n',
    },
    {
      name: 'the inherit model is written as it is',
      settings: { model: 'inherit' },
      model: 'model: inherit\n',
    },
    {
      name: 'a tool list alone gives a tools line, names joined by commas',
      settings: { tools: ['Read', 'Grep', 'Glob'] },
      model: 'tools: Read, Grep, Glob\n',
    },
    {
      name: 'model and tools give both lines, model first',
      settings: { model: 'sonnet', tools: ['Read', 'Write'] },
      model: 'model: sonnet\ntools: Read, Write\n',
    },
  ];

  it.each(rows)('F-06 AC-031 $name', ({ settings, model }) => {
    const header = `---\nname: "writer"\ndescription: "Writes the user stories."\n${model}---\n`;
    expect(writerFile(configWithAgent(settings))).toBe(`${header}${WRITER_STUB}`);
  });
});

describe('F-06 AC-031 agent file body', () => {
  it('F-06 AC-031 a body is written after the stub text', () => {
    expect(writerFile(configWithAgent({ body: 'Keep each story to one line.' }))).toBe(
      `${WRITER_HEADER}${WRITER_STUB.trimEnd()}\n\nKeep each story to one line.\n`,
    );
  });

  it('F-06 AC-031 a body is written after the stub text, below a frontmatter that holds the model and tools', () => {
    expect(writerFile(configWithAgent({ model: 'opus', tools: ['Read'], body: 'Write the stories.' }))).toBe(
      `---\nname: "writer"\ndescription: "Writes the user stories."\nmodel: opus\ntools: Read\n---\n${WRITER_STUB.trimEnd()}\n\nWrite the stories.\n`,
    );
  });

  it('F-06 AC-031 a body with trailing blank lines ends with exactly one newline', () => {
    expect(writerFile(configWithAgent({ body: 'Line one.\n\n\n' }))).toBe(
      `${WRITER_HEADER}${WRITER_STUB.trimEnd()}\n\nLine one.\n`,
    );
  });
});

describe('F-06 AC-031 pipeline command with and without the new fields', () => {
  it('F-06 AC-031 a pipeline with no settings has no frontmatter and starts with its title', () => {
    const content = commandOf(configWithPipeline({}));
    expect(content.startsWith('# ')).toBe(true);
    expect(content).not.toContain('---');
  });

  it('F-06 AC-031 the pipeline command takes the pipeline model and tools in its frontmatter', () => {
    const content = commandOf(configWithPipeline({ model: 'opus', tools: ['Read', 'Bash'] }));
    expect(content.startsWith('---\nmodel: opus\ntools: Read, Bash\n---\n# ')).toBe(true);
  });

  it('F-06 AC-031 the pipeline body follows the generated sections and keeps them', () => {
    const content = commandOf(configWithPipeline({ body: 'Stop when the user says so.' }));
    expect(content.startsWith('# ')).toBe(true);
    expect(content).toContain('## Steps');
    expect(content.endsWith('\n\nStop when the user says so.\n')).toBe(true);
  });

  it('F-06 AC-031 the pipeline command is the same for the same config', () => {
    const config = configWithPipeline({ model: 'haiku', tools: ['Read'], body: 'Run it.' });
    expect(commandOf(config)).toBe(commandOf(config));
    expect(renderPipelineCommand(config).path).toBe(COMMAND_PATH);
  });
});

describe('F-06 AC-031 generated agent files are deterministic', () => {
  it('F-06 AC-031 two runs on a config with the new fields give the same files', () => {
    const config = configWithAgent({ model: 'sonnet', tools: ['Read', 'Grep'], body: 'Write one story per line.' });
    expect(renderAgentAndRuleFiles(config)).toEqual(renderAgentAndRuleFiles(config));
  });
});
