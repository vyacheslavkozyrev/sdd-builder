import type { GeneratedFile } from './model.js';
import { InvalidConfigError } from './errors.js';

/** Why a path is not allowed in the output, or undefined when it is fine. */
function pathProblem(path: string): string | undefined {
  if (path.length === 0) {
    return 'file path is empty';
  }
  if (path.startsWith('/')) {
    return `file path "${path}" must not start with "/"`;
  }
  if (path.includes('\\')) {
    return `file path "${path}" must use forward slashes`;
  }
  if (path.split('/').some((segment) => segment === '..')) {
    return `file path "${path}" must not contain ".."`;
  }
  return undefined;
}

/** LF line endings, exactly one trailing newline. */
function normalizeContent(content: string): string {
  return `${content.replace(/\r\n/g, '\n').replace(/\n*$/, '')}\n`;
}

/**
 * The output file list (AC-032, AC-033): paths checked for safety, duplicates
 * refused, content normalized, files sorted by path. Path problems are
 * reported together as an InvalidConfigError.
 */
export function finishFileList(files: readonly GeneratedFile[]): GeneratedFile[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const problem = pathProblem(file.path);
    if (problem) {
      problems.push(problem);
    }
    if (seen.has(file.path)) {
      problems.push(`duplicate output path "${file.path}"`);
    }
    seen.add(file.path);
  }
  if (problems.length > 0) {
    throw new InvalidConfigError(problems);
  }

  return files
    .map((file) => ({ path: file.path, content: normalizeContent(file.content) }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
