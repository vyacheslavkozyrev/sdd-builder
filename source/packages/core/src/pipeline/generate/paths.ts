// A file-safe relative path of the output (F-04, AC-006): it is relative (no leading slash), has no
// backslash, no `..` segment and no empty segment (so no doubled or trailing slash).
export function isSafePath(path: string): boolean {
  if (path.length === 0 || path.startsWith('/') || path.includes('\\')) {
    return false;
  }
  return path.split('/').every((segment) => segment !== '' && segment !== '..');
}
