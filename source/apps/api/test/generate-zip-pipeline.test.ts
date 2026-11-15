import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { pipeline } from '@sddbuilder/core';
import type { ReviewModel } from '../src/analyze.js';
import { createApp, type GenerationPorts } from '../src/app.js';
import type { GenerationModel, GenerationReply } from '../src/generate/generation-model.js';
import type { LogPort } from '../src/log.js';
import { ZIP_ENTRY_DATE } from '../src/zip.js';
import { fixedLimits } from './fixed-limits.js';
import { pipelineConfig, pipelineTemplates } from './pipeline-config.js';

const GENERATE_URL = 'http://localhost/generate';
/** A marker in every model reply, so a test can tell the reply text apart from the layout text. */
const MARKER = 'MARKER-F07-ZIP';
/** DEFLATE, the compression method number in a zip record. */
const DEFLATE = 8;
const END_OF_CENTRAL_DIRECTORY_SIZE = 22;
const CENTRAL_DIRECTORY_RECORD = 0x02014b50;

const UNUSED_REVIEW: ReviewModel = {
  complete: () => Promise.reject(new Error('the review model is not used by /generate')),
};

const SILENT_LOG: LogPort = { write: () => undefined };

/** A model fake that answers every call with the same fixed reply. Each test makes its own. */
function fixedModel(text: string): GenerationModel {
  return {
    complete(): Promise<GenerationReply> {
      return Promise.resolve({ text, truncated: false });
    },
  };
}

/** The text the fake reply holds for one planned file: the marker, the path and the layout. */
function textFor(entry: pipeline.PipelinePlanEntry): string {
  return `${MARKER} ${entry.path}.\n\n${entry.layout}`;
}

/** A reply that maps every planned path of the configuration to its text. */
function replyFor(config: pipeline.ProjectConfig): string {
  const plan = pipeline.planGeneration(config, pipelineTemplates());
  return JSON.stringify(Object.fromEntries(plan.map((entry) => [entry.path, textFor(entry)])));
}

function appWith(model: GenerationModel) {
  const generation: GenerationPorts = { templates: pipelineTemplates(), model };
  return createApp({ limits: fixedLimits(), review: UNUSED_REVIEW, generation, log: SILENT_LOG });
}

/** Posts the configuration to /generate and returns the response with its bytes read once. */
async function generateZip(config: pipeline.ProjectConfig, model: GenerationModel) {
  const response = await appWith(model).request(GENERATE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(config),
  });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { response, bytes };
}

/** The planned paths of the configuration, in plan order. */
function plannedPaths(config: pipeline.ProjectConfig): string[] {
  return pipeline.planGeneration(config, pipelineTemplates()).map((entry) => entry.path);
}

/**
 * The compression method of every record in the central directory, read from the raw bytes.
 * The end-of-central-directory record is found at the fixed end offset (JSZip writes no comment),
 * and each record's length is read from its own name, extra and comment lengths.
 */
function centralDirectoryMethods(bytes: Uint8Array): number[] {
  const buffer = Buffer.from(bytes);
  const end = buffer.length - END_OF_CENTRAL_DIRECTORY_SIZE;
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const methods: number[] = [];
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_RECORD) {
      throw new Error(`no central directory record at offset ${offset}`);
    }
    methods.push(buffer.readUInt16LE(offset + 10));
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
  return methods;
}

describe('F-07 AC-014 the 200 response carries the zip headers', () => {
  it('F-07 AC-014 sets Content-Type application/zip and an attachment disposition with the fixed filename', async () => {
    const config = pipelineConfig();
    const { response } = await generateZip(config, fixedModel(replyFor(config)));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="sddbuilder-project.zip"');
  });
});

describe('F-07 AC-014 the zip holds the planned files in plan order', () => {
  it('F-07 AC-014 lists the entries in the order of the plan, with no folder entries', async () => {
    const config = pipelineConfig();
    const { response, bytes } = await generateZip(config, fixedModel(replyFor(config)));
    const zip = await JSZip.loadAsync(bytes);
    const entries = Object.values(zip.files);

    expect(response.status).toBe(200);
    expect(Object.keys(zip.files)).toEqual(plannedPaths(config));
    expect(entries.filter((entry) => entry.dir)).toEqual([]);
  });

  it('F-07 AC-014 gives every entry the text the model returned for its own path', async () => {
    const config = pipelineConfig();
    const plan = pipeline.planGeneration(config, pipelineTemplates());
    const { bytes } = await generateZip(config, fixedModel(replyFor(config)));
    const zip = await JSZip.loadAsync(bytes);

    for (const entry of plan) {
      expect(await zip.file(entry.path)?.async('string')).toBe(textFor(entry));
    }
  });

  it('F-07 AC-014 stores every entry DEFLATE-compressed', async () => {
    const config = pipelineConfig();
    const { bytes } = await generateZip(config, fixedModel(replyFor(config)));
    const methods = centralDirectoryMethods(bytes);

    expect(methods).toHaveLength(plannedPaths(config).length);
    expect(new Set(methods)).toEqual(new Set([DEFLATE]));
  });
});

describe('F-07 AC-015 the zip entries carry the fixed date', () => {
  it('F-07 AC-015 dates every entry 2020-01-01 00:00 UTC', async () => {
    const config = pipelineConfig();
    const { bytes } = await generateZip(config, fixedModel(replyFor(config)));
    const zip = await JSZip.loadAsync(bytes);

    for (const entry of Object.values(zip.files)) {
      expect(entry.date.getTime()).toBe(ZIP_ENTRY_DATE.getTime());
    }
    expect(ZIP_ENTRY_DATE.toISOString()).toBe('2020-01-01T00:00:00.000Z');
  });
});

describe('F-07 AC-015 the same config and the same reply give byte-identical zips', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('F-07 AC-015 gives identical bytes on two requests made on different clock dates', async () => {
    const config = pipelineConfig();
    const reply = replyFor(config);
    vi.useFakeTimers({ toFake: ['Date'] });

    vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
    const first = await generateZip(config, fixedModel(reply));
    vi.setSystemTime(new Date('2031-07-04T18:30:00Z'));
    expect(new Date().toISOString()).toBe('2031-07-04T18:30:00.000Z');
    const second = await generateZip(config, fixedModel(reply));

    expect(first.response.status).toBe(200);
    expect(second.response.status).toBe(200);
    expect(Buffer.from(second.bytes).equals(Buffer.from(first.bytes))).toBe(true);
  });
});
