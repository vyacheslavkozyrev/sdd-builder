import type { AgentBlock, Flow, ProjectConfig, Rule } from '../model.js';
import { GenerationError } from './error.js';
import { flowFileName } from './flow-file.js';
import { isSafePath } from './paths.js';
import type { BaseTemplate, GenerationTemplates } from './templates.js';

// The source of a planned file: what its text is built from (F-04, AC-001 to AC-004).
export type FileSource =
  | { readonly kind: 'base'; readonly layout: string }
  | { readonly kind: 'pipeline' }
  | { readonly kind: 'flow'; readonly flow: Flow }
  | { readonly kind: 'agent'; readonly flow: Flow; readonly block: AgentBlock }
  | { readonly kind: 'rule'; readonly rule: Rule };

export interface ListedFile {
  readonly path: string;
  readonly source: FileSource;
}

// The file list of a configuration (F-04, AC-001 to AC-004, AC-006, AC-007, AC-024). It is a pure function of
// the config and the base templates: the same input gives the same list. The list is sorted by path in
// code-point order. A path that is not file-safe, or a path planned twice, is a bug in the generator and
// throws a GenerationError naming the path (a user's refusal is a finding, not this error).
export function listFiles(config: ProjectConfig, templates: GenerationTemplates): ListedFile[] {
  const files: ListedFile[] = [
    ...templates.base.map((entry: BaseTemplate) => ({
      path: entry.path,
      source: { kind: 'base', layout: entry.layout } as const,
    })),
    { path: '.claude/commands/pipeline.md', source: { kind: 'pipeline' } },
    ...config.pipeline.flows.map((flow) => ({
      path: `.claude/commands/${flowFileName(flow)}.md`,
      source: { kind: 'flow', flow } as const,
    })),
    ...config.pipeline.flows.flatMap((flow) =>
      flow.blocks.flatMap((block) =>
        block.kind === 'agent'
          ? [{ path: `.claude/agents/${block.name}.md`, source: { kind: 'agent', flow, block } as const }]
          : [],
      ),
    ),
    ...config.rules.map((rule) => ({
      path: `.claude/rules/${rule.id}.md`,
      source: { kind: 'rule', rule } as const,
    })),
  ];

  const seen = new Set<string>();
  for (const file of files) {
    if (!isSafePath(file.path)) {
      throw new GenerationError(`the planned path ${file.path} is not a file-safe relative path`);
    }
    if (seen.has(file.path)) {
      throw new GenerationError(`two planned files have the path ${file.path}`);
    }
    seen.add(file.path);
  }

  return files.sort((a, b) => compareCodePoints(a.path, b.path));
}

// Code-point order: it differs from the UTF-16 order of `<` only for characters beyond the BMP.
export function compareCodePoints(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  const length = Math.min(x.length, y.length);
  for (let i = 0; i < length; i += 1) {
    const cx = x[i]?.codePointAt(0) ?? 0;
    const cy = y[i]?.codePointAt(0) ?? 0;
    if (cx !== cy) {
      return cx - cy;
    }
  }
  return x.length - y.length;
}
