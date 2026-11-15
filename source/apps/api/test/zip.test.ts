import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { packageZip, ZIP_ENTRY_DATE, type ZipFile } from '../src/zip.js';

const FILES: ZipFile[] = [
  { path: 'CLAUDE.md', content: '# Project\n\nInstructions.\n' },
  { path: '.claude/rules/general.md', content: '# General\n' },
  { path: 'spec/documents/idea.md', content: 'Idea text.\n'.repeat(50) },
  { path: 'spec/specifications/F-01-first/plan.md', content: '- [ ] T001\n' },
];

async function readBack(bytes: Uint8Array): Promise<JSZip> {
  return JSZip.loadAsync(bytes);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('F-07 AC-014 zip content', () => {
  it('F-07 AC-014 holds the given files at their paths, in order, with the same content', async () => {
    const zip = await readBack(await packageZip(FILES));

    expect(Object.keys(zip.files)).toEqual(FILES.map((file) => file.path));
    for (const file of FILES) {
      expect(await zip.file(file.path)?.async('string')).toBe(file.content);
    }
  });

  it('F-07 AC-014 returns an empty zip for an empty file list', async () => {
    const zip = await readBack(await packageZip([]));

    expect(Object.keys(zip.files)).toEqual([]);
  });

  it.each([
    ['an absolute path', '/etc/passwd'],
    ['a drive-letter path', 'C:/project/CLAUDE.md'],
    ['a parent segment', 'docs/../../secret.md'],
    ['a backslash', 'docs\\idea.md'],
    ['an empty path', ''],
  ])('F-07 AC-014 refuses %s by throwing', async (_label, path) => {
    await expect(packageZip([{ path, content: 'x' }])).rejects.toThrow();
  });
});

describe('F-07 AC-015 deterministic bytes', () => {
  it('F-07 AC-015 gives byte-identical zips for two builds of the same files', async () => {
    const first = await packageZip(FILES);
    const second = await packageZip(FILES.map((file) => ({ ...file })));

    expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true);
  });
});

describe('F-07 AC-014 file entries only', () => {
  it('F-07 AC-014 holds no folder entries and as many entries as files', async () => {
    const zip = await readBack(await packageZip(FILES));
    const entries = Object.values(zip.files);

    expect(entries.filter((entry) => entry.dir)).toEqual([]);
    expect(entries).toHaveLength(FILES.length);
  });
});

describe('F-07 AC-014 fixed timestamp', () => {
  it('F-07 AC-014 gives every entry the same fixed timestamp', async () => {
    const zip = await readBack(await packageZip(FILES));
    const dates = Object.values(zip.files).map((entry) => entry.date.getTime());

    expect(new Set(dates)).toEqual(new Set([ZIP_ENTRY_DATE.getTime()]));
  });

  it('F-07 AC-014 stores 2020-01-01 00:00 in every entry, read back as UTC fields and in the raw header', async () => {
    const bytes = await packageZip(FILES);
    const zip = await readBack(bytes);

    for (const entry of Object.values(zip.files)) {
      expect(entry.date.toISOString()).toBe('2020-01-01T00:00:00.000Z');
    }
    // First local file header: time at offset 10 (0x0000 = 00:00), date at offset 12 (0x5021 = 2020-01-01).
    // Checked as raw bytes so the result does not depend on the machine's time zone.
    const header = Buffer.from(bytes);
    expect(header.readUInt16LE(10)).toBe(0x0000);
    expect(header.readUInt16LE(12)).toBe(0x5021);
  });

  it('F-07 AC-015 keeps the zip bytes unchanged when the clock is set to another date', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });

    vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
    const early = await packageZip(FILES);

    vi.setSystemTime(new Date('2031-07-04T18:30:00Z'));
    const late = await packageZip(FILES);

    expect(Buffer.from(late).equals(Buffer.from(early))).toBe(true);
  });
});
