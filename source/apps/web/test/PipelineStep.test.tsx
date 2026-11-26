// @vitest-environment jsdom
import type { ComponentProps, ReactElement } from 'react';
import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Edge, ReactFlow as ReactFlowComponent } from '@xyflow/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { StructureMarks } from '../src/builder/marks.js';
import { getCanvasStyles } from '../src/builder/canvasStyles.js';
import { getConnectionPanelStyles } from '../src/builder/connectionPanelStyles.js';
import { getFlowPanelStyles } from '../src/builder/flowPanelStyles.js';
import { getRowEditorStyles } from '../src/builder/rowEditorStyles.js';
import { addFlow, type Pipeline } from '../src/builder/model.js';
import { theme } from '../src/theme.js';
import { builderRules, PipelineStep } from '../src/wizard/PipelineStep.js';
import { getPipelineStepStyles } from '../src/wizard/pipelineStepStyles.js';
import type { RuleValues, WizardValues } from '../src/wizard/state.js';
import { defaultPipelineValue, emptyPipelineValue } from '../src/wizard/state.js';
import { valuesWith } from './wizardValues.js';

// The Workflow step (F-11 AC-002, AC-031, screen 01 and 06). The canvas is React Flow, so its props are
// captured by a wrapper (as in Canvas.test.tsx) and the handlers the step wires are called the way React
// Flow would call them. The step keeps its pipeline in the values it is given; a harness holds those values
// and writes each change back, as the wizard reducer does.

type ReactFlowProps = ComponentProps<typeof ReactFlowComponent>;
type NodeClick = NonNullable<ReactFlowProps['onNodeClick']>;
type EdgeClick = NonNullable<ReactFlowProps['onEdgeClick']>;
type PaneClick = NonNullable<ReactFlowProps['onPaneClick']>;

const rendered = vi.hoisted(() => ({ props: undefined as ReactFlowProps | undefined }));

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    ReactFlow: (props: ReactFlowProps) => {
      rendered.props = props;
      return <actual.ReactFlow {...props} />;
    },
  };
});

// The structural analyzer gives blockers only, so a warning can reach the step only through its marks.
// The wrapper adds the findings a test names to the analyzer's, and leaves the rest as they are.
const extraMarks = vi.hoisted(() => ({ findings: [] as ReadonlyArray<StructureMarks['findings'][number]> }));

vi.mock('../src/builder/marks.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/builder/marks.js')>();
  return {
    ...actual,
    structureMarks: (pipelineState: Pipeline, rules: Parameters<typeof actual.structureMarks>[1]) => {
      const marks = actual.structureMarks(pipelineState, rules);
      return { ...marks, findings: [...marks.findings, ...extraMarks.findings] };
    },
  };
});

// React Flow creates a ResizeObserver when it mounts; jsdom does not provide one.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  rendered.props = undefined;
  extraMarks.findings = [];
});

function flowProps(): ReactFlowProps {
  if (rendered.props === undefined) {
    throw new Error('React Flow was not rendered');
  }
  return rendered.props;
}

// The harness: the values in state, the step given them, and every change written back.
let lastValues: WizardValues;
let lastPipelineChange: ReturnType<typeof vi.fn<(pipeline: Pipeline) => void>>;

function Harness({ initial }: { readonly initial: WizardValues }) {
  const [values, setValues] = useState<WizardValues>(initial);
  lastValues = values;
  return (
    <PipelineStep
      values={values}
      onPipelineChange={(pipeline) => {
        lastPipelineChange(pipeline);
        setValues({ ...values, pipeline });
      }}
    />
  );
}

function renderStep(initial: WizardValues = valuesWith('Tracker', '')): void {
  lastPipelineChange = vi.fn<(pipeline: Pipeline) => void>();
  const ui: ReactElement = (
    <ThemeProvider theme={theme}>
      <Harness initial={initial} />
    </ThemeProvider>
  );
  render(ui);
}

// The default pipeline with `flowId`'s `next` removed, so a test can draw a new arrow.
function withoutNext(values: WizardValues, flowId: string): WizardValues {
  const pipeline = defaultPipelineValue();
  const flows = pipeline.flows.map((flow) => {
    if (flow.id !== flowId) return flow;
    const { next: _removed, ...rest } = flow;
    return rest;
  });
  return { ...values, pipeline: { ...pipeline, flows } };
}

// The default pipeline with `flowId`'s blocks emptied, so a test can start from a flow with no blocks.
function withoutBlocks(values: WizardValues, flowId: string): WizardValues {
  const pipeline = defaultPipelineValue();
  const flows = pipeline.flows.map((flow) => (flow.id === flowId ? { ...flow, blocks: [] } : flow));
  return { ...values, pipeline: { ...pipeline, flows } };
}

function tabNamed(name: string): HTMLElement {
  return screen.getByRole('tab', { name });
}

// The properties card: its heading and fields are inside this region, apart from the canvas title.
function propertiesCard(): HTMLElement {
  return screen.getByRole('region', { name: 'Properties' });
}

describe('F-11 AC-002 the Pipeline tab shows the canvas and the flow tab shows its name and a note', () => {
  it('F-11 AC-002 the Pipeline tab is open at first and shows the canvas with its title and hint', () => {
    renderStep();
    expect(tabNamed('Pipeline').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByLabelText('Pipeline canvas')).toBeTruthy();
    expect(screen.getByText('Flows in pipeline order, left to right. Select a flow to edit its artifacts and Human approval.')).toBeTruthy();
  });

  it('F-11 AC-002 a flow tab shows the flow name and its block canvas, with no placeholder', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    expect(tabNamed('Specify').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Specify' })).toBeTruthy();
    expect(screen.getByLabelText('Flow canvas')).toBeTruthy();
    expect(screen.queryByText('The blocks of this flow are built in a later step.')).toBeNull();
  });

  it('F-11 AC-002 negative case: a flow tab shows no Pipeline canvas', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    expect(screen.queryByLabelText('Pipeline canvas')).toBeNull();
  });

  it('F-11 AC-002 returning to the Pipeline tab shows the canvas again', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(tabNamed('Pipeline'));
    expect(screen.getByLabelText('Pipeline canvas')).toBeTruthy();
  });
});

describe('F-12 AC-051 the flow tab shows the block canvas in place of the F-11 placeholder', () => {
  it('F-12 AC-051 UI the default pipeline\'s flow shows its blocks, with the toolbox and the flow panel', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    expect(screen.getByRole('button', { name: 'Start block' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agent block: specify' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'End block' })).toBeTruthy();
    expect(screen.getByRole('toolbar', { name: 'Add a block' })).toBeTruthy();
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Specify' })).toBeTruthy();
  });

  it('F-12 AC-051 negative case: a flow with no blocks shows the empty text and no block', () => {
    renderStep(withoutBlocks(valuesWith('Tracker', ''), 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2'));
    fireEvent.click(tabNamed('Specify'));
    expect(screen.getByText('No blocks yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start block' })).toBeNull();
  });
});

describe('F-12 AC-011 selecting a block or an arrow drives the properties card', () => {
  it('F-12 AC-011 a selected Agent block shows its Agent panel', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    expect(within(propertiesCard()).getByRole('heading', { name: 'Agent: specify' })).toBeTruthy();
  });

  it('F-12 AC-011 a selected arrow shows the Connection panel with its two block names', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Arrow from Start' }));
    expect(within(propertiesCard()).getByRole('heading', { name: 'Connection' })).toBeTruthy();
    expect(within(propertiesCard()).getByText('An arrow only points one block to another.')).toBeTruthy();
    expect(within(propertiesCard()).getByText('Start')).toBeTruthy();
    expect(within(propertiesCard()).getByText('specify')).toBeTruthy();
  });

  it('F-12 AC-011 negative case: a click on the empty canvas returns the panel to the flow', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(screen.getByLabelText('Flow canvas').querySelector('svg') as SVGSVGElement);
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Specify' })).toBeTruthy();
  });

  it('F-12 AC-011 a block added from the toolbox is selected and its panel opens', () => {
    renderStep(withoutBlocks(valuesWith('Tracker', ''), 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2'));
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(within(propertiesCard()).getByRole('heading', { name: 'Start' })).toBeTruthy();
    expect(within(propertiesCard()).getByText('A flow keeps its Start block.')).toBeTruthy();
    expect(within(propertiesCard()).queryByRole('heading', { name: 'Flow: Specify' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Start block' })).toBeTruthy();
    expect(lastValues.pipeline.flows.find((flow) => flow.id === 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2')?.blocks.map((block) => block.kind)).toEqual([
      'start',
    ]);
  });

  it('F-12 AC-045 a finding on an Agent block is listed in its panel', () => {
    extraMarks.findings = [
      {
        finding: {
          severity: 'warning',
          rule: 'test',
          path: 'pipeline.flows.0.blocks.1.body',
          message: 'pipeline.flows.0.blocks.1.body is thin.',
        },
        placement: { kind: 'block', flowId: 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2', blockId: 'b86f903b-53da-44bf-9ac1-7bdfb71ea194' },
        label: { location: 'Specify agent', message: 'The body is thin.' },
      },
    ];
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    const marks = within(propertiesCard()).getByRole('region', { name: 'Structure marks' });
    expect(marks.textContent).toContain('The body is thin.');
    expect(marks.textContent).not.toContain('pipeline.flows');
  });

  it('F-12 AC-011 an edit to the selected Agent keeps its panel open', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('Name'), { target: { value: 'drafter' } });
    fireEvent.blur(within(propertiesCard()).getByLabelText('Name'));
    expect(within(propertiesCard()).getByRole('heading', { name: 'Agent: drafter' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agent block: drafter' })).toBeTruthy();
  });
});

describe('F-12 AC-021 a confirmed Delete connection on a block arrow removes the arrow and clears the selection', () => {
  it('F-12 AC-021 Delete connection on the Start arrow removes it, keeps the flow tab and returns the panel to the flow', async () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Arrow from Start' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Delete connection' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete connection' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Arrow from Start' })).toBeNull();
    expect(tabNamed('Specify').getAttribute('aria-selected')).toBe('true');
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Specify' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agent block: specify' })).toBeTruthy();
    expect(lastValues.pipeline.flows.find((flow) => flow.id === 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2')?.blocks.map((block) => block.id)).toContain(
      'b86f903b-53da-44bf-9ac1-7bdfb71ea194',
    );
  });

  it('F-12 AC-021 negative case: Cancel keeps the arrow and its panel', async () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Arrow from Start' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Delete connection' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: 'Arrow from Start' })).toBeTruthy();
    expect(within(propertiesCard()).getByRole('heading', { name: 'Connection' })).toBeTruthy();
    expect(lastPipelineChange).not.toHaveBeenCalled();
  });
});

describe('F-12 AC-044 a block delete keeps the flow tab and clears the selection', () => {
  it('F-12 AC-044 a confirmed Delete block removes the block, keeps the flow tab and returns the panel to the flow', async () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Delete block' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(tabNamed('Specify').getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Agent block: specify' })).toBeNull();
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Specify' })).toBeTruthy();
  });

  it('F-12 AC-044 negative case: Cancel keeps the block and its panel', async () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Delete block' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: 'Agent block: specify' })).toBeTruthy();
    expect(within(propertiesCard()).getByRole('heading', { name: 'Agent: specify' })).toBeTruthy();
  });
});

describe('F-12 AC-049 the flow tab keeps each flow\'s blocks when the user switches tabs', () => {
  it('F-12 AC-049 the blocks of a flow are still there after the Pipeline tab is shown and the flow is reopened', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(tabNamed('Pipeline'));
    fireEvent.click(tabNamed('Specify'));
    expect(screen.getByRole('button', { name: 'Agent block: specify' })).toBeTruthy();
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Specify' })).toBeTruthy();
  });

  it('F-12 AC-049 negative case: a flow tab does not show the blocks of another flow', () => {
    renderStep();
    fireEvent.click(tabNamed('Plan'));
    expect(screen.queryByRole('button', { name: 'Agent block: specify' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Agent block: plan' })).toBeTruthy();
  });

  it('F-12 AC-049 each flow keeps its own block selection when the user switches tabs', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(tabNamed('Pipeline'));
    fireEvent.click(tabNamed('Plan'));
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Plan' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: plan' }));
    expect(within(propertiesCard()).getByRole('heading', { name: 'Agent: plan' })).toBeTruthy();
    fireEvent.click(tabNamed('Specify'));
    expect(within(propertiesCard()).getByRole('heading', { name: 'Agent: specify' })).toBeTruthy();
    fireEvent.click(tabNamed('Pipeline'));
    fireEvent.click(tabNamed('Plan'));
    expect(within(propertiesCard()).getByRole('heading', { name: 'Agent: plan' })).toBeTruthy();
  });

  it('F-12 AC-049 a block arrow selected on one flow tab is still selected when that tab is shown again', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Arrow from Start' }));
    fireEvent.click(tabNamed('Plan'));
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Plan' })).toBeTruthy();
    fireEvent.click(tabNamed('Pipeline'));
    fireEvent.click(tabNamed('Specify'));
    expect(within(propertiesCard()).getByRole('heading', { name: 'Connection' })).toBeTruthy();
    expect(within(propertiesCard()).getByText('An arrow only points one block to another.')).toBeTruthy();
  });

  it('F-12 AC-049 a deleted flow drops its block selection, so a new flow with the same id starts with none', async () => {
    // The first flow, then the Agent block, then the same flow id again after the delete (F-16 AC-027 ids come from randomUUID).
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('40174c6b-ffc9-5a01-af92-33a352fc884a')
      .mockReturnValueOnce('8a2c4e6f-1b3d-4a5c-9e7f-0a1b2c3d4e5f')
      .mockReturnValueOnce('40174c6b-ffc9-5a01-af92-33a352fc884a');
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    expect(within(propertiesCard()).getByRole('heading', { name: /^Agent/ })).toBeTruthy();
    fireEvent.click(tabNamed('Pipeline'));
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: '40174c6b-ffc9-5a01-af92-33a352fc884a' } as Parameters<NodeClick>[1]);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete flow' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(lastValues.pipeline.flows.map((flow) => flow.id)).not.toContain('40174c6b-ffc9-5a01-af92-33a352fc884a');
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    expect(lastValues.pipeline.flows.map((flow) => flow.id).at(-1)).toBe('40174c6b-ffc9-5a01-af92-33a352fc884a');
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: flow-1' })).toBeTruthy();
  });
});

describe('F-11 AC-031 after a confirmed delete the selection is cleared and the tab moves to Pipeline', () => {
  it('F-11 AC-031 deleting the selected flow after confirmation moves the open tab to Pipeline and clears the selection', async () => {
    renderStep();
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: 'd3882ef1-5c45-41aa-9277-a98217396d45' } as Parameters<NodeClick>[1]);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Plan' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete flow' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(tabNamed('Pipeline').getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('tab', { name: 'Plan' })).toBeNull();
    expect(within(propertiesCard()).getByRole('heading', { name: 'Pipeline' })).toBeTruthy();
    expect(lastValues.pipeline.flows.map((flow) => flow.id)).not.toContain('d3882ef1-5c45-41aa-9277-a98217396d45');
    expect(lastPipelineChange).toHaveBeenCalledTimes(1);
  });

  it('F-11 AC-031 negative case: Cancel keeps the flow and its panel', async () => {
    renderStep();
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: 'd3882ef1-5c45-41aa-9277-a98217396d45' } as Parameters<NodeClick>[1]);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Plan' })).toBeTruthy();
    expect(lastValues.pipeline.flows.map((flow) => flow.id)).toContain('d3882ef1-5c45-41aa-9277-a98217396d45');
    expect(lastPipelineChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-031 a confirmed Delete connection clears the selection and keeps the Pipeline tab open', async () => {
    renderStep();
    act(() => {
      flowProps().onEdgeClick?.({} as Parameters<EdgeClick>[0], {
        id: 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2->8a976641-9b75-4aa9-a363-fb78b4225c7a',
        source: 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2',
        target: '8a976641-9b75-4aa9-a363-fb78b4225c7a',
      } as Edge);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Connection' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete connection' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete connection' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(within(propertiesCard()).getByRole('heading', { name: 'Pipeline' })).toBeTruthy();
    expect(tabNamed('Pipeline').getAttribute('aria-selected')).toBe('true');
    expect(lastValues.pipeline.flows.find((flow) => flow.id === 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2')?.next).toBeUndefined();
  });
});

// The default pipeline with `flowId` renamed, so a test can show a name that needs a file name.
function withFlowName(values: WizardValues, flowId: string, name: string): WizardValues {
  const pipeline = defaultPipelineValue();
  const flows = pipeline.flows.map((flow) => (flow.id === flowId ? { ...flow, name } : flow));
  return { ...values, pipeline: { ...pipeline, flows } };
}

describe('F-16 AC-016 the subtitle names the command file with the flow file name', () => {
  it('F-16 AC-016 a flow named "Build Code" shows build-code.md as its command file', () => {
    renderStep(withFlowName(valuesWith('Tracker', ''), '8a976641-9b75-4aa9-a363-fb78b4225c7a', 'Build Code'));
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: '8a976641-9b75-4aa9-a363-fb78b4225c7a' } as Parameters<NodeClick>[1]);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Build Code' })).toBeTruthy();
    expect(within(propertiesCard()).getByText('Generates .claude/commands/build-code.md')).toBeTruthy();
  });
});

describe('F-11 AC-042 the properties card shows the panel of the selection', () => {
  it('F-11 AC-042 shows the pipeline panel with its command file line when nothing is selected', () => {
    renderStep();
    expect(within(propertiesCard()).getByRole('heading', { name: 'Pipeline' })).toBeTruthy();
    expect(screen.getByText('Generates .claude/commands/pipeline.md')).toBeTruthy();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'SDD process');
  });

  it('F-11 AC-042 a selected flow shows "Flow: <name>" and its command file line', () => {
    renderStep();
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: '8a976641-9b75-4aa9-a363-fb78b4225c7a' } as Parameters<NodeClick>[1]);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: UX' })).toBeTruthy();
    expect(within(propertiesCard()).getByText('Generates .claude/commands/ux.md')).toBeTruthy();
  });

  it('F-11 AC-042 a selected arrow shows the Connection panel', () => {
    renderStep();
    act(() => {
      flowProps().onEdgeClick?.({} as Parameters<EdgeClick>[0], { id: 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2->8a976641-9b75-4aa9-a363-fb78b4225c7a', source: 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2', target: '8a976641-9b75-4aa9-a363-fb78b4225c7a' } as Edge);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Connection' })).toBeTruthy();
    expect(within(propertiesCard()).getByText('An arrow only points one flow to another.')).toBeTruthy();
  });

  it('F-11 AC-042 a click on the empty canvas returns the selection to the pipeline', () => {
    renderStep();
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: '8a976641-9b75-4aa9-a363-fb78b4225c7a' } as Parameters<NodeClick>[1]);
    });
    act(() => {
      flowProps().onPaneClick?.({} as Parameters<PaneClick>[0]);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Pipeline' })).toBeTruthy();
  });

  it('F-11 AC-042 a change made on the canvas clears the selection', () => {
    renderStep(withoutNext(valuesWith('Tracker', ''), 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2'));
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: '8a976641-9b75-4aa9-a363-fb78b4225c7a' } as Parameters<NodeClick>[1]);
    });
    act(() => {
      flowProps().onConnect?.({
        source: 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2',
        target: '8a976641-9b75-4aa9-a363-fb78b4225c7a',
        sourceHandle: 'right',
        targetHandle: 'left',
      });
    });
    expect(lastPipelineChange).toHaveBeenCalledTimes(1);
    expect(lastValues.pipeline.flows.find((flow) => flow.id === 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2')?.next).toBe('8a976641-9b75-4aa9-a363-fb78b4225c7a');
    expect(within(propertiesCard()).getByRole('heading', { name: 'Pipeline' })).toBeTruthy();
  });
});

describe('F-11 AC-003 + adds a flow and opens its tab', () => {
  it('F-11 AC-003 the new flow gets the next flow-N id, is appended and its tab is open', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('40174c6b-ffc9-5a01-af92-33a352fc884a');
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    expect(lastValues.pipeline.flows.map((flow) => flow.id).at(-1)).toBe('40174c6b-ffc9-5a01-af92-33a352fc884a');
    expect(tabNamed('flow-1').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('heading', { name: 'flow-1' })).toBeTruthy();
  });

  it('F-11 AC-003 the new flow is named by its id, with a blank body and no blocks or artifacts', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('40174c6b-ffc9-5a01-af92-33a352fc884a');
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    const added = lastValues.pipeline.flows.at(-1);
    expect(added).toMatchObject({ id: '40174c6b-ffc9-5a01-af92-33a352fc884a', name: 'flow-1', body: '', arguments: [], artifacts: [], blocks: [] });
  });
});

describe('F-11 AC-035 AC-036 the error panel on the Pipeline tab', () => {
  it('F-11 AC-035 a blocker is counted in the error panel, and no line is drawn in the band', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    fireEvent.click(tabNamed('Pipeline'));
    expect(screen.getByRole('button', { name: /^\d+ errors?$/ })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('F-11 AC-035 the panel sits in the canvas card header, outside the canvas, so no box is covered', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    fireEvent.click(tabNamed('Pipeline'));
    const counter = screen.getByRole('button', { name: /^\d+ errors?$/ });
    expect(screen.getByLabelText('Pipeline canvas').contains(counter)).toBe(false);
    expect(screen.getByRole('region', { name: 'Canvas card' }).contains(counter)).toBe(true);
  });

  it('F-11 AC-036 a finding with no drawn item is listed in the panel as "Not on a drawn item", closed by default', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    fireEvent.click(tabNamed('Pipeline'));
    expect(screen.queryByRole('region', { name: 'Not on a drawn item' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^\d+ errors?$/ }));
    const section = screen.getByRole('region', { name: 'Not on a drawn item' });
    expect(within(section).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('F-11 AC-036 negative case: the default pipeline with a body in each flow shows no panel and no unplaced finding', () => {
    renderStep();
    expect(screen.queryByRole('button', { name: /errors?|warnings?/ })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Not on a drawn item' })).toBeNull();
  });
});

describe('F-11 AC-026 the rule tags offer the rule blocks of the Technical details step', () => {
  it('F-11 AC-026 keeps the valid rule blocks, once each, in order', () => {
    const blocks: readonly RuleValues[] = [
      { id: '221ef52b-eec6-57a3-830f-c43f1411ab81', name: 'Code Style', description: 'Use the style guide.' },
      { id: '4a86af9e-5549-5ca6-b4cc-c9df4a90c109', name: '!!!', description: 'refused id' },
      { id: 'a6c2c72d-82cc-5eb6-affd-a71313550e5a', name: 'code-style', description: 'same id as the first' },
      { id: '574bc6de-9064-55d4-8472-0267f9c6968d', name: 'QA', description: 'Test first.' },
    ];
    expect(builderRules(blocks)).toEqual([
      { index: 0, id: '221ef52b-eec6-57a3-830f-c43f1411ab81', title: 'Code Style', text: 'Use the style guide.' },
      { index: 1, id: '574bc6de-9064-55d4-8472-0267f9c6968d', title: 'QA', text: 'Test first.' },
    ]);
  });

  it('F-16 AC-027 a rule offered to the builder carries the GUID id of its rule block', () => {
    const blocks: readonly RuleValues[] = [{ id: '221ef52b-eec6-57a3-830f-c43f1411ab81', name: 'Code Style', description: 'Use the style guide.' }];
    expect(builderRules(blocks)).toEqual([{ index: 0, id: '221ef52b-eec6-57a3-830f-c43f1411ab81', title: 'Code Style', text: 'Use the style guide.' }]);
  });

  it('F-11 AC-026 negative case: no rule blocks give no rules to offer', () => {
    expect(builderRules([])).toEqual([]);
  });
});

describe('F-11 AC-035 a warning shows beside the box or arrow it names', () => {
  const warning = (path: string, message: string) => ({
    severity: 'warning' as const,
    rule: 'test',
    path,
    message,
  });
  const named = (location: string, message: string) => ({ location, message });

  it('F-11 AC-035 a warning on a flow box shows beside that box, with its message named (F-16 AC-022)', () => {
    extraMarks.findings = [
      {
        finding: warning('pipeline.flows.1', 'flow-2 is short'),
        placement: { kind: 'flow', flowId: '8a976641-9b75-4aa9-a363-fb78b4225c7a' },
        label: named('8a976641-9b75-4aa9-a363-fb78b4225c7a', 'Build is short'),
      },
    ];
    renderStep();
    expect(screen.getByRole('note').textContent).toBe('Warning · Build is short');
    expect(screen.queryByRole('region', { name: 'Not on a drawn item' })).toBeNull();
  });

  it('F-11 AC-035 a warning on an arrow shows beside the box it leaves, with its message named (F-16 AC-022)', () => {
    extraMarks.findings = [
      {
        finding: warning('pipeline.flows.0.next', 'specify goes far'),
        placement: { kind: 'arrow', source: 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2' },
        label: named('Specify', 'Specify goes far'),
      },
    ];
    renderStep();
    expect(screen.getByRole('note').textContent).toBe('Warning · Specify goes far');
  });

  it('F-11 AC-036 a warning with no drawn item is listed in the error panel and not beside a box', () => {
    extraMarks.findings = [
      {
        finding: warning('pipeline.name', 'is blank'),
        placement: { kind: 'none' },
        label: named('pipeline', 'is blank'),
      },
    ];
    renderStep();
    expect(screen.queryByRole('note')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '1 warning' }));
    const section = screen.getByRole('region', { name: 'Not on a drawn item' });
    expect(within(section).getByText('pipeline')).toBeTruthy();
    expect(within(section).getByText('is blank')).toBeTruthy();
  });
});

describe('F-11 AC-006 layout point 1: the tab row sits outside the white cards, on the page', () => {
  it('F-11 AC-006 layout point 1 the tab row is not inside the properties card or the canvas', () => {
    renderStep();
    const tabList = screen.getByRole('tablist', { name: 'Pipeline tabs' });
    expect(propertiesCard().contains(tabList)).toBe(false);
    expect(screen.getByLabelText('Pipeline canvas').contains(tabList)).toBe(false);
  });

  it('F-11 AC-006 layout point 1 the tab row and both cards share the step column, the tab row before the cards', () => {
    renderStep();
    const tabList = screen.getByRole('tablist', { name: 'Pipeline tabs' });
    const column = tabList.parentElement?.parentElement;
    expect(column?.contains(propertiesCard())).toBe(true);
    expect(column?.contains(screen.getByLabelText('Pipeline canvas'))).toBe(true);
    expect(tabList.compareDocumentPosition(propertiesCard()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('F-11 AC-006 layout point 1 negative case: the step column draws no card, the properties card draws the white card', () => {
    const styles = getPipelineStepStyles(theme);
    expect(styles.root).not.toHaveProperty('bgcolor');
    expect(styles.root).not.toHaveProperty('boxShadow');
    expect(styles.propertiesCard).toMatchObject({ bgcolor: theme.palette.background.paper, boxShadow: expect.any(String) });
  });
});

describe('F-11 AC-006 layout point 1 (screen 01): the title and the hint sit inside the canvas card', () => {
  const HINT = 'Flows in pipeline order, left to right. Select a flow to edit its artifacts and Human approval.';

  it('F-11 AC-006 layout point 1 the Pipeline title and the hint are inside the canvas card, above the canvas', () => {
    renderStep();
    const card = screen.getByLabelText('Canvas card');
    const canvas = screen.getByLabelText('Pipeline canvas');
    const title = within(card).getByRole('heading', { name: 'Pipeline' });
    const hint = within(card).getByText(HINT);
    expect(card.contains(canvas)).toBe(true);
    expect(title.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hint.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('F-11 AC-006 layout point 1 negative case: no Pipeline title sits on the page outside the card', () => {
    renderStep();
    const card = screen.getByLabelText('Canvas card');
    const outside = screen.getAllByRole('heading', { name: 'Pipeline' }).filter((heading) => !propertiesCard().contains(heading));
    expect(outside).toHaveLength(1);
    expect(card.contains(outside[0] ?? null)).toBe(true);
    expect(card.contains(screen.getByText(HINT))).toBe(true);
  });

  it('F-11 AC-006 layout point 1 the canvas card is the white card, and the canvas area draws no second card', () => {
    const styles = getPipelineStepStyles(theme);
    expect(styles.canvasColumn).toMatchObject({ bgcolor: theme.palette.background.paper, boxShadow: expect.any(String) });
    expect(getCanvasStyles(theme).root).not.toHaveProperty('boxShadow');
    expect(getCanvasStyles(theme).root).not.toHaveProperty('bgcolor');
  });
});

describe('F-11 AC-006 layout points 2 and 3: the cards fill the height and only the properties body scrolls', () => {
  it('F-11 AC-006 layout point 3 the step column and its body fill the height and may shrink inside the frame', () => {
    const styles = getPipelineStepStyles(theme);
    expect(styles.root).toMatchObject({ flex: 1, minHeight: 0 });
    expect(styles.body).toMatchObject({ flex: 1, minHeight: 0 });
    expect(styles.canvasColumn).toMatchObject({ minHeight: 0 });
    expect(styles.canvasArea).toMatchObject({ flex: 1, minHeight: 0 });
  });

  it('F-11 AC-006 layout point 3 the canvas card fills its area and does not scroll the page', () => {
    expect(getCanvasStyles(theme).root).toMatchObject({ height: '100%', minHeight: 0, overflow: 'hidden' });
  });

  it('F-11 AC-006 layout point 2 the one scrolling region is the panel fields inside the body, with the padding inside it', () => {
    const styles = getPipelineStepStyles(theme);
    const panel = getFlowPanelStyles(theme);
    const connection = getConnectionPanelStyles(theme);
    // The card has no padding of its own, so the scrollbar is on its right edge.
    expect(styles.propertiesCard).toMatchObject({ minHeight: 0, overflow: 'hidden' });
    expect(styles.propertiesCard).not.toHaveProperty('p');
    // The body between the header and the footer holds the one scrolling region, and it does not scroll itself.
    expect(styles.propertiesBody).toMatchObject({ flex: 1, minHeight: 0, overflow: 'hidden' });
    // The scrolling region carries the 16 px side inset, so the content has a gap before the scrollbar.
    expect(panel.scroll).toMatchObject({ flex: 1, minHeight: 0, overflowY: 'auto', px: '16px' });
    // The header and the footer keep their own inset and stay outside the scrolling region.
    expect(styles.propertiesHeader).toMatchObject({ flexShrink: 0, px: '16px', pt: '16px' });
    expect(panel.footer).toMatchObject({ flexShrink: 0, px: '16px', pb: '16px' });
    // The connection panel has the same region: its fields scroll and its footer stays fixed.
    expect(connection.fields).toMatchObject({ flex: 1, minHeight: 0, overflowY: 'auto', px: '16px' });
    expect(connection.footer).toMatchObject({ flexShrink: 0, px: '16px', pb: '16px' });
  });

  it('F-11 AC-019 AC-045 a field is 40 px high with its text centred, as screen 01 draws it', () => {
    const panel = getFlowPanelStyles(theme);
    expect(panel.field).toMatchObject({ '& .MuiInputBase-root': { height: 40 } });
    expect(panel.field).toMatchObject({ '& .MuiOutlinedInput-input': expect.objectContaining({ lineHeight: '40px' }) });
    expect(panel.select).toMatchObject({ '& .MuiInputBase-root': { height: 40 } });
  });

  it('F-11 AC-019 AC-045 the label baseline is 12 px above its field: a label and its field form a group with an 8 px gap', () => {
    // The label's baseline sits about 4 px above the bottom of its 16 px line, so an 8 px gap puts it 12 px above the field.
    const panel = getFlowPanelStyles(theme);
    expect(panel.group).toMatchObject({ display: 'flex', flexDirection: 'column', gap: '8px' });
    expect(panel.fieldLabel).toMatchObject({ lineHeight: '16px', mb: 0 });
  });

  it('F-11 AC-019 AC-045 the next label baseline is 36 px below a field: the groups are 24 px apart, not the label and its field', () => {
    // 24 px from the field bottom to the next label box, plus the 12 px from the label box top to its baseline.
    // The 24 px gap belongs to the scroll column, so it does not also apply between a label and its own field.
    expect(getFlowPanelStyles(theme).scroll).toMatchObject({ gap: '24px' });
  });

  it('F-11 AC-019 AC-045 the body box is 80 px high: three 20 px lines and 20 px of padding, 5 px above the first line', () => {
    const body = getFlowPanelStyles(theme).multilineField;
    expect(body).toMatchObject({ '& .MuiInputBase-root': { p: 0 } });
    expect(body).toMatchObject({
      '& .MuiOutlinedInput-input': expect.objectContaining({ padding: '5px 12px 15px', lineHeight: '20px' }),
    });
  });

  it('F-11 AC-025 AC-045 the outcome artifacts have no border: a Label part, then a Template part 16 px below it, as screen 03 draws them', () => {
    const rows = getRowEditorStyles(theme);
    expect(rows.artifact).not.toHaveProperty('border');
    expect(rows.artifact).toMatchObject({ gap: '16px' });
    // Within a part the label sits 8 px above its field (its baseline 12 px above), and the help text 8 px below the box.
    expect(rows.artifactPart).toMatchObject({ gap: '8px' });
    expect(rows.helpText).toMatchObject({ lineHeight: '16px' });
    // The Template box is 80 px: the outlined root's padding is removed, and the text is 5 px above its first line.
    expect(rows.multilineInput).toMatchObject({ '& .MuiInputBase-root': { p: 0 } });
    expect(rows.multilineInput).toMatchObject({
      '& .MuiOutlinedInput-input': expect.objectContaining({ padding: '5px 12px 15px', lineHeight: '20px' }),
    });
  });

  it('F-11 AC-019 AC-045 the body counter is 8 px under the body box, inside the body group, so its baseline is 20 px below the box', () => {
    const panel = getFlowPanelStyles(theme);
    expect(panel.counter).not.toHaveProperty('mt');
    expect(panel.counter).toMatchObject({ lineHeight: '16px', textAlign: 'right' });
    expect(panel.group).toMatchObject({ gap: '8px' });
  });

  it('F-11 AC-019 AC-045 an argument row is a 40 px field with a 28 px minus, and rows are 8 px apart', () => {
    const rows = getRowEditorStyles(theme);
    expect(rows.list).toMatchObject({ gap: '8px' });
    expect(rows.input).toMatchObject({ '& .MuiInputBase-root': { height: 40 } });
    expect(rows.minusButton).toMatchObject({ height: 28, minWidth: 28 });
  });

  it('F-11 AC-006 layout point 2 negative case: the canvas and the step column do not scroll themselves', () => {
    const styles = getPipelineStepStyles(theme);
    expect(styles.root).not.toHaveProperty('overflowY');
    expect(styles.canvasArea).not.toHaveProperty('overflowY');
  });
});

describe('F-16 AC-023 a deleted block or flow is not written back by a line still open', () => {
  it('F-16 AC-023 negative case: a block deleted while a line is open stays deleted and the line is not saved', async () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    const blocksBefore = lastValues.pipeline.flows.find((flow) => flow.name === 'Specify')?.blocks.length;
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Delete block' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Agent block: specify' })).toBeNull();
    const specify = lastValues.pipeline.flows.find((flow) => flow.name === 'Specify');
    expect(specify?.blocks.length).toBe((blocksBefore ?? 0) - 1);
    expect(JSON.stringify(lastValues.pipeline)).not.toContain('"topic"');
  });

  it('F-16 AC-023 negative case: a flow deleted while a line is open stays deleted and the line is not saved', async () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete flow' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(lastValues.pipeline.flows.map((flow) => flow.name)).not.toContain('Specify');
    expect(JSON.stringify(lastValues.pipeline)).not.toContain('"topic"');
  });
});

// The argument ids saved in the pipeline, in a flow named `flowName`, or in the Agent block named `blockName` of a flow
// (F-16 AC-023). A flow or block that is gone gives undefined, so an assertion on it fails instead of passing on [].
function savedPipelineArgumentNames(): string[] {
  return lastValues.pipeline.arguments.map((argument) => argument.hint);
}

function savedFlowArgumentNames(flowName: string): string[] | undefined {
  return lastValues.pipeline.flows.find((flow) => flow.name === flowName)?.arguments.map((argument) => argument.hint);
}

function savedAgentArgumentNames(flowName: string, blockName: string): string[] | undefined {
  const block = lastValues.pipeline.flows
    .find((flow) => flow.name === flowName)
    ?.blocks.find((item) => item.kind === 'agent' && item.name === blockName);
  return block?.kind === 'agent' ? block.arguments.map((argument) => argument.hint) : undefined;
}

describe('F-16 AC-023 an argument added in the builder survives a selection change', () => {
  it('F-16 AC-023 a line typed in a block and not yet left is saved when another block is selected', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    expect(within(propertiesCard()).getByLabelText('Argument 1 name')).toHaveProperty('value', 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038');
    expect(savedAgentArgumentNames('Specify', 'specify')).toEqual(['f6e48fc8-29f2-5a26-9b01-9d90e8d52038']);
  });

  it('F-16 AC-023 a line typed in the pipeline and not yet left is saved when a flow is selected', () => {
    renderStep();
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: '8a976641-9b75-4aa9-a363-fb78b4225c7a' } as Parameters<NodeClick>[1]);
    });
    act(() => {
      flowProps().onPaneClick?.({} as Parameters<PaneClick>[0]);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Pipeline' })).toBeTruthy();
    expect(within(propertiesCard()).getByLabelText('Argument 2 name')).toHaveProperty('value', 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038');
    expect(savedPipelineArgumentNames()).toEqual(['F-XX', 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038']);
  });

  it('F-16 AC-023 negative case: a line typed and then refused by the parser is dropped on selection, with no error', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: '!!!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    expect(within(propertiesCard()).queryByLabelText('Argument 1 name')).toBeNull();
    expect(lastPipelineChange).not.toHaveBeenCalled();
    expect(savedAgentArgumentNames('Specify', 'specify')).toEqual([]);
  });

  it('F-16 AC-023 an argument added to an Agent block is still listed with its values after another block is selected and the first is selected again', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.blur(within(propertiesCard()).getByLabelText('New argument name'));
    expect(within(propertiesCard()).getByLabelText('Argument 1 name')).toHaveProperty('value', 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038');
    fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
    expect(within(propertiesCard()).getByRole('heading', { name: 'Start' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    expect(within(propertiesCard()).getByLabelText('Argument 1 name')).toHaveProperty('value', 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038');
    expect(savedAgentArgumentNames('Specify', 'specify')).toEqual(['f6e48fc8-29f2-5a26-9b01-9d90e8d52038']);
  });

  it('F-16 AC-023 an argument added to a flow survives a selection change and comes back', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.blur(within(propertiesCard()).getByLabelText('New argument name'));
    fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
    fireEvent.click(screen.getByLabelText('Flow canvas').querySelector('svg') as SVGSVGElement);
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Specify' })).toBeTruthy();
    expect(within(propertiesCard()).getByLabelText('Argument 1 name')).toHaveProperty('value', 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038');
    expect(savedFlowArgumentNames('Specify')).toEqual(['f6e48fc8-29f2-5a26-9b01-9d90e8d52038']);
  });

  it('F-16 AC-023 an argument added to the pipeline survives a selection change and comes back', () => {
    renderStep();
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.blur(within(propertiesCard()).getByLabelText('New argument name'));
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: '8a976641-9b75-4aa9-a363-fb78b4225c7a' } as Parameters<NodeClick>[1]);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: UX' })).toBeTruthy();
    act(() => {
      flowProps().onPaneClick?.({} as Parameters<PaneClick>[0]);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Pipeline' })).toBeTruthy();
    expect(within(propertiesCard()).getByLabelText('Argument 2 name')).toHaveProperty('value', 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038');
    expect(savedPipelineArgumentNames()).toEqual(['F-XX', 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038']);
  });

  it('F-16 AC-023 negative case: a blank line left open is discarded on selection, with no error and no saved change', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    expect(within(propertiesCard()).queryByLabelText('New argument name')).toBeNull();
    expect(lastPipelineChange).not.toHaveBeenCalled();
    expect(savedAgentArgumentNames('Specify', 'specify')).toEqual([]);
  });

  it('F-16 AC-023 negative case: a removed argument stays removed after a selection change', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.blur(within(propertiesCard()).getByLabelText('New argument name'));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Remove argument 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    expect(within(propertiesCard()).queryByLabelText('Argument 1 name')).toBeNull();
    expect(savedAgentArgumentNames('Specify', 'specify')).toEqual([]);
  });
});

describe('F-16 AC-023 an edited saved argument id not yet left survives a selection change', () => {
  it('F-16 AC-023 a saved argument id edited and not left is saved when another block is selected and the first is selected again', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.blur(within(propertiesCard()).getByLabelText('New argument name'));
    fireEvent.change(within(propertiesCard()).getByLabelText('Argument 1 name'), { target: { value: 'subject' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    expect(within(propertiesCard()).getByLabelText('Argument 1 name')).toHaveProperty('value', 'subject');
    expect(savedAgentArgumentNames('Specify', 'specify')).toEqual(['subject']);
  });

  it('F-16 AC-023 an edited saved id and a line still open are both saved, the id first, when another block is selected', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.blur(within(propertiesCard()).getByLabelText('New argument name'));
    fireEvent.change(within(propertiesCard()).getByLabelText('Argument 1 name'), { target: { value: 'subject' } });
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'extra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
    expect(savedAgentArgumentNames('Specify', 'specify')).toEqual(['subject', 'extra']);
  });


  it('F-16 AC-023 negative case: an edited saved id refused by the parser leaves the saved argument unchanged on selection', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.blur(within(propertiesCard()).getByLabelText('New argument name'));
    fireEvent.change(within(propertiesCard()).getByLabelText('Argument 1 name'), { target: { value: '!!!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    expect(within(propertiesCard()).getByLabelText('Argument 1 name')).toHaveProperty('value', 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038');
    expect(savedAgentArgumentNames('Specify', 'specify')).toEqual(['f6e48fc8-29f2-5a26-9b01-9d90e8d52038']);
  });

  it('F-16 AC-023 negative case: an edited saved id whose block is deleted is not restored', async () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.blur(within(propertiesCard()).getByLabelText('New argument name'));
    fireEvent.change(within(propertiesCard()).getByLabelText('Argument 1 name'), { target: { value: 'subject' } });
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Delete block' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('button', { name: 'Agent block: specify' })).toBeNull();
    expect(JSON.stringify(lastValues.pipeline)).not.toContain('"subject"');
    expect(savedAgentArgumentNames('Specify', 'specify')).toBeUndefined();
  });
});

// F-16 AC-023 (browser case): a document with flows from Add flow that have no link yet, in a pipeline with a blank name
// (a new project). The arguments added in it are saved and listed again after a selection change.
describe('F-16 AC-023 an argument added in a document with new flows survives a selection change', () => {
  it('F-16 AC-023 an argument added to the pipeline in a blank-name document with two new flows is saved and listed again', () => {
    const one = addFlow(emptyPipelineValue());
    const two = addFlow(one.pipeline);
    renderStep({ ...valuesWith('Tracker', ''), pipeline: two.pipeline });

    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: one.flowId } as Parameters<NodeClick>[1]);
    });
    act(() => {
      flowProps().onPaneClick?.({} as Parameters<PaneClick>[0]);
    });

    expect(within(propertiesCard()).getByLabelText('Argument 1 name')).toHaveProperty('value', 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038');
    expect(savedPipelineArgumentNames()).toEqual(['f6e48fc8-29f2-5a26-9b01-9d90e8d52038']);
  });

  it('F-16 AC-023 an argument added to an Agent block with a new flow in the pipeline is saved and listed again', () => {
    const withNew = addFlow(defaultPipelineValue());
    renderStep({ ...valuesWith('Tracker', ''), pipeline: withNew.pipeline });

    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));
    fireEvent.click(within(propertiesCard()).getByRole('button', { name: 'Add argument' }));
    fireEvent.change(within(propertiesCard()).getByLabelText('New argument name'), { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: specify' }));

    expect(within(propertiesCard()).getByLabelText('Argument 1 name')).toHaveProperty('value', 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038');
    expect(savedAgentArgumentNames('Specify', 'specify')).toEqual(['f6e48fc8-29f2-5a26-9b01-9d90e8d52038']);
  });
});
