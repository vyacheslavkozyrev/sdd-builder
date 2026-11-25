// Packs the generated files into a zip (F-15 AC-002, AC-003, AC-004). The entries keep the order given, hold no
// directory entries, are compressed with DEFLATE and carry one fixed date, so the same files give the same bytes.

import JSZip from 'jszip';

const ENTRY_DATE = new Date(Date.UTC(2020, 0, 1));

// JSZip stores an empty entry without compression, so an empty text would break the DEFLATE guarantee (F-15 AC-003).
// Paths must stay inside the archive and name files, not folders; a clash would silently drop an entry.
export async function buildZip(files: readonly { path: string; text: string }[]): Promise<Uint8Array> {
  const zip = new JSZip();
  const seen = new Set<string>();
  for (const file of files) {
    assertEntryPath(file.path, seen);
    if (file.text.length === 0) {
      throw new Error(`empty file text: ${JSON.stringify(file.path)}`);
    }
    seen.add(file.path);
    zip.file(file.path, file.text, { date: ENTRY_DATE, createFolders: false });
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

function assertEntryPath(path: string, seen: ReadonlySet<string>): void {
  const unsafe =
    path.includes('\\') || path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..');
  if (unsafe) {
    throw new Error(`unsafe zip entry path: ${JSON.stringify(path)}`);
  }
  if (seen.has(path)) {
    throw new Error(`duplicate zip entry path: ${JSON.stringify(path)}`);
  }
}
