import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildZip } from '../src/generate/zip.js';

const FILES = [
  { path: 'CLAUDE.md', text: '# Project\n' },
  { path: 'rules/zeta.md', text: 'zeta rule\n' },
  { path: 'commands/alpha.md', text: 'alpha command\n' },
];

const DEFLATE = 8;
const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const FIXED_DATE_MS = Date.UTC(2020, 0, 1);

// Reads the compression method of each local file header in the order the entries are stored.
function localCompressionMethods(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const methods: number[] = [];
  let offset = 0;
  while (offset + 30 <= bytes.byteLength && view.getUint32(offset, true) === LOCAL_HEADER_SIGNATURE) {
    methods.push(view.getUint16(offset + 8, true));
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    offset += 30 + nameLength + extraLength + compressedSize;
  }
  return methods;
}

describe('F-15 AC-002 buildZip entries', () => {
  it('F-15 AC-002 holds each file at its path with its text', async () => {
    const zip = await JSZip.loadAsync(await buildZip(FILES));
    for (const file of FILES) {
      expect(await zip.file(file.path)?.async('string')).toBe(file.text);
    }
  });

  it('F-15 AC-002 writes no directory entries for nested paths', async () => {
    const zip = await JSZip.loadAsync(await buildZip(FILES));
    const names = Object.keys(zip.files);
    expect(names).toHaveLength(FILES.length);
    expect(names.some((name) => name.endsWith('/'))).toBe(false);
    expect(Object.values(zip.files).every((entry) => !entry.dir)).toBe(true);
  });

  it('F-15 AC-002 gives a valid empty zip for an empty list', async () => {
    const bytes = await buildZip([]);
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files)).toEqual([]);
  });
});

describe('F-15 AC-003 buildZip order, compression and date', () => {
  it('F-15 AC-003 keeps the entries in the order given', async () => {
    const zip = await JSZip.loadAsync(await buildZip(FILES));
    expect(Object.keys(zip.files)).toEqual(FILES.map((file) => file.path));
  });

  it('F-15 AC-003 stores each entry compressed with DEFLATE', async () => {
    const bytes = await buildZip(FILES);
    expect(localCompressionMethods(bytes)).toEqual(FILES.map(() => DEFLATE));
  });

  it('F-15 AC-003 dates each entry 2020-01-01 00:00 UTC', async () => {
    const zip = await JSZip.loadAsync(await buildZip(FILES));
    for (const entry of Object.values(zip.files)) {
      expect(entry.date.getTime()).toBe(FIXED_DATE_MS);
    }
  });

  it('F-15 AC-003 rejects an empty text, which JSZip would store uncompressed', async () => {
    await expect(buildZip([{ path: 'CLAUDE.md', text: '' }])).rejects.toThrow('empty file text');
  });
});

describe('F-15 AC-002 buildZip path guard', () => {
  it.each([
    ['a parent segment', '../CLAUDE.md'],
    ['a parent segment in the middle', 'rules/../../etc/passwd'],
    ['an absolute path', '/CLAUDE.md'],
    ['a folder name with a trailing slash', 'rules/'],
    ['an empty segment', 'rules//zeta.md'],
    ['a current-directory segment', './CLAUDE.md'],
    ['a backslash', 'rules\\zeta.md'],
    ['an empty path', ''],
  ])('F-15 AC-002 rejects %s', async (_label, path) => {
    await expect(buildZip([{ path, text: 'x\n' }])).rejects.toThrow('unsafe zip entry path');
  });

  it('F-15 AC-002 rejects a path that appears twice instead of dropping an entry', async () => {
    const twice = [
      { path: 'CLAUDE.md', text: 'first\n' },
      { path: 'CLAUDE.md', text: 'second\n' },
    ];
    await expect(buildZip(twice)).rejects.toThrow('duplicate zip entry path');
  });
});

describe('F-15 AC-004 buildZip determinism', () => {
  it('F-15 AC-004 gives the same bytes for the same files on two runs', async () => {
    const first = await buildZip(FILES);
    const second = await buildZip(FILES);
    expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true);
  });

  it('F-15 AC-004 gives different bytes when a text changes', async () => {
    const changed = FILES.map((file) => (file.path === 'CLAUDE.md' ? { ...file, text: '# Other\n' } : file));
    const original = await buildZip(FILES);
    const other = await buildZip(changed);
    expect(Buffer.from(other).equals(Buffer.from(original))).toBe(false);
  });

  it('F-15 AC-004 gives the same bytes in every time zone', async () => {
    const previous = process.env.TZ;
    try {
      process.env.TZ = 'UTC';
      const utc = Buffer.from(await buildZip(FILES));
      for (const zone of ['Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
        process.env.TZ = zone;
        const local = Buffer.from(await buildZip(FILES));
        expect(local.equals(utc), zone).toBe(true);
      }
    } finally {
      if (previous === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = previous;
      }
    }
  });
});
