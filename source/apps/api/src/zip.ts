import JSZip from 'jszip';

/** One file of the generated project: a forward-slash relative path and its text. */
export interface ZipFile {
  path: string;
  content: string;
}

/**
 * The timestamp written on every entry. A constant, not the clock, so the same files always give the same bytes.
 * JSZip 3.10.2 stores the UTC fields of this date, so 2020-01-01 00:00 UTC is stored as the same bytes on every
 * machine. A local-midnight date would store different bytes in each time zone.
 */
export const ZIP_ENTRY_DATE = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));

/**
 * Builds the zip in memory: file entries only, in the order given, DEFLATE-compressed.
 * A path that is absolute, has a '..' segment or a backslash, or is empty is a programmer error and throws.
 */
export async function packageZip(files: readonly ZipFile[]): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const file of files) {
    assertSafePath(file.path);
    zip.file(file.path, file.content, { date: ZIP_ENTRY_DATE, createFolders: false });
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

function assertSafePath(path: string): void {
  if (path.length === 0) {
    throw new Error('zip path is empty');
  }
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    throw new Error(`zip path is absolute: ${path}`);
  }
  if (path.includes('\\')) {
    throw new Error(`zip path contains a backslash: ${path}`);
  }
  if (path.split('/').includes('..')) {
    throw new Error(`zip path contains a '..' segment: ${path}`);
  }
}
