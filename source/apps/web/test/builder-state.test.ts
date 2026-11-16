import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { createBuilderState } from '../src/builder/state.js';

type ProjectConfig = pipeline.ProjectConfig;

const BUILDER = join(import.meta.dirname, '..', 'src', 'builder');

/** A copy of the default configuration with a different project name. */
function renamed(name: string): ProjectConfig {
  return { ...pipeline.defaultProjectConfig, name };
}

describe('F-06 AC-041 the builder starts from the default pipeline', () => {
  it('F-06 AC-041 starts from the default pipeline when the host gives no configuration', () => {
    const state = createBuilderState();
    expect(state.current()).toEqual(pipeline.defaultProjectConfig);
  });

  it('F-06 AC-041 the default pipeline holds the six flows and the five gates of building-blocks §4', () => {
    const blocks = pipeline.defaultProjectConfig.pipeline.blocks;
    expect(blocks.filter((block) => block.kind === 'flow')).toHaveLength(6);
    expect(blocks.filter((block) => block.kind === 'condition')).toHaveLength(5);
  });
});

describe('F-06 AC-043 the host contract', () => {
  it('F-06 AC-043 accepts an initial configuration from the host instead of the default', () => {
    const initial = renamed('from the host');
    const state = createBuilderState({ initial });
    expect(state.current()).toEqual(initial);
  });

  it('F-06 AC-043 reports the current configuration to the host after each change, in order', () => {
    const reported: ProjectConfig[] = [];
    const state = createBuilderState({ onChange: (config) => reported.push(config) });
    const first = renamed('first');
    const second = renamed('second');

    state.replace(first);
    state.replace(second);

    expect(reported).toEqual([first, second]);
    expect(state.current()).toEqual(second);
  });

  it('F-06 AC-043 does not report the starting configuration before any change', () => {
    const reported: ProjectConfig[] = [];
    createBuilderState({ onChange: (config) => reported.push(config) });
    expect(reported).toEqual([]);
  });

  it('F-06 AC-043 works without an onChange callback', () => {
    const state = createBuilderState();
    const next = renamed('no host callback');
    state.replace(next);
    expect(state.current()).toEqual(next);
  });
});

describe('F-06 AC-044 no server calls and in-memory state', () => {
  it('F-06 AC-044 the builder folder has no request, socket or storage call', () => {
    const forbidden = /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB/;
    const offending = readdirSync(BUILDER, { encoding: 'utf8', recursive: true })
      .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
      .filter((name) => forbidden.test(readFileSync(join(BUILDER, name), 'utf8')));
    expect(offending).toEqual([]);
  });

  it('F-06 AC-044 an edit made through the current configuration does not reach the default', () => {
    const state = createBuilderState();
    (state.current() as { name: string }).name = 'mutated in place';
    expect(pipeline.defaultProjectConfig.name).not.toBe('mutated in place');
    expect(createBuilderState().current()).toEqual(pipeline.defaultProjectConfig);
  });

  it('F-06 AC-044 a new state starts from the default again: nothing persists between states', () => {
    const first = createBuilderState();
    first.replace(renamed('edited in an earlier state'));
    const second = createBuilderState();
    expect(second.current()).toEqual(pipeline.defaultProjectConfig);
  });
});
