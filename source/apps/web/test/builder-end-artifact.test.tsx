// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { pipeline as core } from '@sddbuilder/core';
import { EndPanel } from '../src/builder/BlockPanel.js';
import { addBlock } from '../src/builder/blocks.js';
import { addFlowArtifact, toDocument, type Pipeline } from '../src/builder/fields.js';

// The End panel as the Map tab holds it: the panel's change replaces the pipeline it shows (F-16 AC-031).

afterEach(() => {
  cleanup();
});

const SPECIFY = '2d8eebb4-9a34-5eae-ae8d-88813520de08';
const START = '15e362eb-af40-5e75-8c68-8ac7e7fc6a9e';
const WRITER = '1954b5cf-b131-5509-9c06-eb5b22e8aaad';
const END = 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0';

// The specify flow with one artifact `stories.md`: Start, one agent, and a new End that produces nothing.
function specifyPipeline(): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: [
      {
        index: 0,
        id: SPECIFY,
        name: 'specify',
        description: 'The specify step.',
        arguments: [],
        body: 'Write the stories.',
        artifacts: [{ label: 'stories.md', template: 'the stories' }],
        approval: true,
        blocks: [
          { index: 0, id: START, kind: 'start', next: WRITER },
          {
            index: 1,
            id: WRITER,
            kind: 'agent',
            name: 'writer',
            description: 'Writes the stories.',
            arguments: [],
            next: END,
            body: 'Writes stories.md from the brief.',
          },
          { index: 2, id: END, kind: 'end', outcome: 'done', producedArtifact: '' },
        ],
      },
    ],
  };
}

// Shows the End `blockId` of the specify flow in EndPanel, with the pipeline held in state as the Map tab holds it.
// Every pipeline the panel saves is also passed to `onSave`, so a test reads what was saved.
function Harness({
  initial,
  blockId,
  onSave,
}: {
  readonly initial: Pipeline;
  readonly blockId: string;
  readonly onSave: (saved: Pipeline) => void;
}) {
  const [pipelineState, setPipeline] = useState(initial);
  const flow = pipelineState.flows.find((item) => item.id === SPECIFY);
  const block = flow?.blocks.find((item) => item.id === blockId);
  if (flow === undefined || block === undefined || block.kind !== 'end') throw new Error(`no End ${blockId}`);
  return (
    <EndPanel
      pipelineState={pipelineState}
      rules={[]}
      flow={flow}
      block={block}
      onChange={(next) => {
        onSave(next);
        setPipeline(next);
      }}
    />
  );
}

// The produced artifact the saved pipeline holds for the End `blockId`, after the parser accepts the pipeline.
function savedArtifactOf(pipelineState: Pipeline, blockId: string): string {
  const parsed = core.parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: toDocument(pipelineState) });
  if (!parsed.ok) throw new Error(`the parser refused the saved pipeline: ${JSON.stringify(parsed.problems)}`);
  const flow = parsed.config.pipeline.flows.find((item) => item.id === SPECIFY);
  const block = flow?.blocks.find((item) => item.id === blockId);
  if (block === undefined || block.kind !== 'end') throw new Error(`no End ${blockId} in the saved pipeline`);
  return block.producedArtifact;
}

describe('F-16 AC-032 the text none is never a produced artifact choice', () => {
  it('F-16 AC-032 offers None and the other artifacts, but no choice for an artifact labelled none', () => {
    const pipelineState = specifyPipeline();
    const withNone: Pipeline = {
      ...pipelineState,
      flows: pipelineState.flows.map((flow) => ({
        ...flow,
        artifacts: [{ label: 'none', template: 'the none file' }, ...flow.artifacts],
      })),
    };
    render(<Harness initial={withNone} blockId={END} onSave={() => undefined} />);

    const values = Array.from(screen.getByLabelText('Produced artifact').querySelectorAll('option')).map((option) => option.value);
    expect(values).toEqual(['', 'stories.md']);
  });

  it('F-16 AC-032 shows a saved none as the value of a disabled option, never as a choice', () => {
    const pipelineState = specifyPipeline();
    const savedNone: Pipeline = {
      ...pipelineState,
      flows: pipelineState.flows.map((flow) => ({
        ...flow,
        blocks: flow.blocks.map((block) => (block.kind === 'end' ? { ...block, producedArtifact: 'none' } : block)),
      })),
    };
    render(<Harness initial={savedNone} blockId={END} onSave={() => undefined} />);

    const select = screen.getByLabelText('Produced artifact') as HTMLSelectElement;
    expect(select.value).toBe('none');
    const options = Array.from(select.querySelectorAll('option'));
    expect(options.find((option) => option.value === 'none')?.disabled).toBe(true);
    expect(options.filter((option) => !option.disabled).map((option) => option.value)).toEqual(['', 'stories.md']);
  });
});

describe('F-16 AC-031 choosing an artifact or None saves it', () => {
  it('F-16 AC-031 saves a picked artifact, shows it, and the parser reads the saved value', () => {
    const saves: Pipeline[] = [];
    render(<Harness initial={specifyPipeline()} blockId={END} onSave={(saved) => saves.push(saved)} />);

    fireEvent.change(screen.getByLabelText('Produced artifact'), { target: { value: 'stories.md' } });

    expect(saves).toHaveLength(1);
    expect(savedArtifactOf(saves[0] as Pipeline, END)).toBe('stories.md');
    expect(screen.getByLabelText('Produced artifact')).toHaveProperty('value', 'stories.md');
    expect(screen.queryByText(/must be at least 1 character/)).toBeNull();
    expect(screen.queryByText(/must name an artifact/)).toBeNull();
  });

  it('F-16 AC-031 saves the picked artifact on the saved End, and the parser reads it', () => {
    let saved: Pipeline | undefined;
    const initial = specifyPipeline();
    const flow = initial.flows[0];
    if (flow === undefined) throw new Error('no specify flow');
    render(
      <EndPanel
        pipelineState={initial}
        rules={[]}
        flow={flow}
        block={flow.blocks[2] as core.EndBlock}
        onChange={(next) => {
          saved = next;
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Produced artifact'), { target: { value: 'stories.md' } });

    if (saved === undefined) throw new Error('the pick was not saved');
    expect(savedArtifactOf(saved, END)).toBe('stories.md');
  });

  it('F-16 AC-031 saves a second End added after the first, when it picks the artifact', () => {
    const initial = specifyPipeline();
    const flow = initial.flows[0];
    if (flow === undefined) throw new Error('no specify flow');
    const added = addBlock(flow, 'end');
    const withSecond = { ...initial, flows: [added.flow] };
    const saves: Pipeline[] = [];
    render(<Harness initial={withSecond} blockId={added.blockId} onSave={(saved) => saves.push(saved)} />);

    fireEvent.change(screen.getByLabelText('Produced artifact'), { target: { value: 'stories.md' } });

    expect(saves).toHaveLength(1);
    expect(savedArtifactOf(saves[0] as Pipeline, added.blockId)).toBe('stories.md');
    expect(screen.getByLabelText('Produced artifact')).toHaveProperty('value', 'stories.md');
  });

  it('F-16 AC-031 saves a pick in an End whose flow got its artifact after the End was added', () => {
    const initial = specifyPipeline();
    const flow = initial.flows[0];
    if (flow === undefined) throw new Error('no specify flow');
    const noArtifacts: Pipeline = { ...initial, flows: [{ ...flow, artifacts: [] }] };
    const withArtifact = addFlowArtifact(noArtifacts, [], SPECIFY, { label: 'notes.md', template: 'the notes' });
    if (!withArtifact.ok) throw new Error(`the parser refused the artifact: ${withArtifact.reason}`);
    const saves: Pipeline[] = [];
    render(<Harness initial={withArtifact.pipeline} blockId={END} onSave={(saved) => saves.push(saved)} />);

    fireEvent.change(screen.getByLabelText('Produced artifact'), { target: { value: 'notes.md' } });

    expect(saves).toHaveLength(1);
    expect(savedArtifactOf(saves[0] as Pipeline, END)).toBe('notes.md');
    expect(screen.getByLabelText('Produced artifact')).toHaveProperty('value', 'notes.md');
  });

  it('F-16 AC-031 picking None after an artifact is saved saves a blank produced artifact', () => {
    const saves: Pipeline[] = [];
    render(<Harness initial={specifyPipeline()} blockId={END} onSave={(saved) => saves.push(saved)} />);
    fireEvent.change(screen.getByLabelText('Produced artifact'), { target: { value: 'stories.md' } });

    fireEvent.change(screen.getByLabelText('Produced artifact'), { target: { value: '' } });

    expect(saves).toHaveLength(2);
    expect(savedArtifactOf(saves[1] as Pipeline, END)).toBe('');
    expect(screen.getByLabelText('Produced artifact')).toHaveProperty('value', '');
    expect(screen.queryByText(/must be at least 1 character/)).toBeNull();
  });
});
