// The file list of the generator (architecture.md §6, decisions 23 and 35). Planning fixes which files are
// written, their paths and their order, from the config and the template shapes. It renders no placeholder:
// each file carries its raw layout text, and the entries are filled in later. Pure: no file is read and no
// config or template is changed.

import type { Finding } from '../analyze/index.js';
import type { ProjectConfig } from '../model.js';
import { GenerationError } from './errors.js';
import { configProblems } from './problems.js';
import type { Templates } from './templates.js';

// One file the generator writes: its output path, its raw layout text before the placeholders are filled, and
// the `##` headings a Markdown output must carry (the reply check reads them from the plan).
export interface PlannedFile {
  readonly path: string;
  readonly text: string;
  readonly headings: readonly string[];
}

// The outcome of planning: the files sorted by path, or the blockers that refuse the config.
export type Plan =
  | { readonly ok: true; readonly files: readonly PlannedFile[] }
  | { readonly ok: false; readonly problems: readonly Finding[] };

// Plans the files of a config. A config with a blocker is refused and nothing is planned. A path that is not
// file-safe, or a path planned twice, is a bug in the generator or the templates and throws GenerationError.
export function planGeneration(config: ProjectConfig, templates: Templates): Plan {
  const problems = configProblems(config);
  if (problems.length > 0) {
    return { ok: false, problems };
  }

  const { flows } = config.pipeline;
  const files: PlannedFile[] = [
    ...templates.base.map((file) => ({ path: file.path, text: file.text, headings: file.headings })),
    {
      path: '.claude/commands/pipeline.md',
      text: templates.pipelineCommand.text,
      headings: templates.pipelineCommand.headings,
    },
    ...flows.map((flow) => ({
      path: `.claude/commands/${flow.id}.md`,
      text: templates.command.text,
      headings: templates.command.headings,
    })),
    ...flows.flatMap((flow) =>
      flow.blocks.flatMap((block) =>
        block.kind === 'agent'
          ? [
              {
                path: `.claude/agents/${block.name}.md`,
                text: templates.agent.text,
                headings: templates.agent.headings,
              },
            ]
          : [],
      ),
    ),
    ...config.rules.map((rule) => ({
      path: `.claude/rules/${rule.id}.md`,
      text: templates.rule.text,
      headings: templates.rule.headings,
    })),
  ];

  const seen = new Set<string>();
  for (const file of files) {
    if (!isFileSafe(file.path)) {
      throw new GenerationError(`The planned path "${file.path}" is not a file-safe relative path.`);
    }
    if (seen.has(file.path)) {
      throw new GenerationError(`Two planned files have the path "${file.path}".`);
    }
    seen.add(file.path);
  }

  files.sort((a, b) => compareCodePoints(a.path, b.path));
  return { ok: true, files };
}

// A file-safe path is relative, uses `/` only, and has no empty segment and no `..` segment.
function isFileSafe(path: string): boolean {
  if (path.startsWith('/') || path.includes('\\')) {
    return false;
  }
  return path.split('/').every((segment) => segment !== '' && segment !== '..');
}

// Orders two texts by code point. A plain `<` compares UTF-16 units, which puts an astral character before
// U+FFFF, so the code points are compared one by one.
function compareCodePoints(a: string, b: string): number {
  const x = Array.from(a, (char) => char.codePointAt(0) ?? 0);
  const y = Array.from(b, (char) => char.codePointAt(0) ?? 0);
  const length = Math.min(x.length, y.length);
  for (let i = 0; i < length; i++) {
    const delta = (x[i] ?? 0) - (y[i] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return x.length - y.length;
}
