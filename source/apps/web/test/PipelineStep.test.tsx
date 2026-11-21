// @vitest-environment jsdom
import type { ComponentProps, ReactElement } from 'react';
import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Edge, ReactFlow as ReactFlowComponent } from '@xyflow/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { StructureMarks } from '../src/builder/marks.js';
import type { Pipeline } from '../src/builder/model.js';
import { theme } from '../src/theme.js';
import { builderRules, PipelineStep } from '../src/wizard/PipelineStep.js';
import type { RuleValues, WizardValues } from '../src/wizard/state.js';
import { defaultPipelineValue } from '../src/wizard/state.js';
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

  it('F-11 AC-002 a flow tab shows the flow name and the note that its blocks are built in a later step', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    expect(tabNamed('Specify').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Specify' })).toBeTruthy();
    expect(screen.getByText('The blocks of this flow are built in a later step.')).toBeTruthy();
  });

  it('F-11 AC-002 negative case: a flow tab shows no block and no canvas', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    expect(screen.queryByLabelText('Pipeline canvas')).toBeNull();
    expect(screen.queryByText(/\d+ blocks?$/)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Properties' })).toBeNull();
  });

  it('F-11 AC-002 returning to the Pipeline tab shows the canvas again', () => {
    renderStep();
    fireEvent.click(tabNamed('Specify'));
    fireEvent.click(tabNamed('Pipeline'));
    expect(screen.getByLabelText('Pipeline canvas')).toBeTruthy();
  });
});

describe('F-11 AC-031 after a confirmed delete the selection is cleared and the tab moves to Pipeline', () => {
  it('F-11 AC-031 deleting the selected flow after confirmation moves the open tab to Pipeline and clears the selection', async () => {
    renderStep();
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: 'plan' } as Parameters<NodeClick>[1]);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Plan' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete flow' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(tabNamed('Pipeline').getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('tab', { name: 'Plan' })).toBeNull();
    expect(within(propertiesCard()).getByRole('heading', { name: 'Pipeline' })).toBeTruthy();
    expect(lastValues.pipeline.flows.map((flow) => flow.id)).not.toContain('plan');
    expect(lastPipelineChange).toHaveBeenCalledTimes(1);
  });

  it('F-11 AC-031 negative case: Cancel keeps the flow and its panel', async () => {
    renderStep();
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: 'plan' } as Parameters<NodeClick>[1]);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: Plan' })).toBeTruthy();
    expect(lastValues.pipeline.flows.map((flow) => flow.id)).toContain('plan');
    expect(lastPipelineChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-031 a confirmed Delete connection clears the selection and keeps the Pipeline tab open', async () => {
    renderStep();
    act(() => {
      flowProps().onEdgeClick?.({} as Parameters<EdgeClick>[0], {
        id: 'specify->ux',
        source: 'specify',
        target: 'ux',
      } as Edge);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Connection' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete connection' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete connection' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(within(propertiesCard()).getByRole('heading', { name: 'Pipeline' })).toBeTruthy();
    expect(tabNamed('Pipeline').getAttribute('aria-selected')).toBe('true');
    expect(lastValues.pipeline.flows.find((flow) => flow.id === 'specify')?.next).toBeUndefined();
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
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: 'ux' } as Parameters<NodeClick>[1]);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Flow: UX' })).toBeTruthy();
    expect(within(propertiesCard()).getByText('Generates .claude/commands/UX.md')).toBeTruthy();
  });

  it('F-11 AC-042 a selected arrow shows the Connection panel', () => {
    renderStep();
    act(() => {
      flowProps().onEdgeClick?.({} as Parameters<EdgeClick>[0], { id: 'specify->ux', source: 'specify', target: 'ux' } as Edge);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Connection' })).toBeTruthy();
    expect(within(propertiesCard()).getByText('An arrow only points one flow to another.')).toBeTruthy();
  });

  it('F-11 AC-042 a click on the empty canvas returns the selection to the pipeline', () => {
    renderStep();
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: 'ux' } as Parameters<NodeClick>[1]);
    });
    act(() => {
      flowProps().onPaneClick?.({} as Parameters<PaneClick>[0]);
    });
    expect(within(propertiesCard()).getByRole('heading', { name: 'Pipeline' })).toBeTruthy();
  });

  it('F-11 AC-042 a change made on the canvas clears the selection', () => {
    renderStep(withoutNext(valuesWith('Tracker', ''), 'specify'));
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: 'ux' } as Parameters<NodeClick>[1]);
    });
    act(() => {
      flowProps().onConnect?.({
        source: 'specify',
        target: 'ux',
        sourceHandle: 'right',
        targetHandle: 'left',
      });
    });
    expect(lastPipelineChange).toHaveBeenCalledTimes(1);
    expect(lastValues.pipeline.flows.find((flow) => flow.id === 'specify')?.next).toBe('ux');
    expect(within(propertiesCard()).getByRole('heading', { name: 'Pipeline' })).toBeTruthy();
  });
});

describe('F-11 AC-003 + adds a flow and opens its tab', () => {
  it('F-11 AC-003 the new flow gets the next flow-N id, is appended and its tab is open', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    expect(lastValues.pipeline.flows.map((flow) => flow.id).at(-1)).toBe('flow-1');
    expect(tabNamed('flow-1').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('heading', { name: 'flow-1' })).toBeTruthy();
  });

  it('F-11 AC-003 the new flow is named by its id, with a blank body and no blocks or artifacts', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    const added = lastValues.pipeline.flows.at(-1);
    expect(added).toMatchObject({ id: 'flow-1', name: 'flow-1', body: '', arguments: [], artifacts: [], blocks: [] });
  });
});

describe('F-11 AC-035 AC-036 the message band and the list under the canvas', () => {
  it('F-11 AC-035 a blocker shows its message in the band as "Blocker · …"', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    fireEvent.click(tabNamed('Pipeline'));
    expect(screen.getByRole('status').textContent).toContain('Blocker · ');
  });

  it('F-11 AC-036 a finding with no drawn item is listed under the canvas as "Not on a drawn item"', () => {
    renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    fireEvent.click(tabNamed('Pipeline'));
    const section = screen.getByRole('region', { name: 'Not on a drawn item' });
    expect(within(section).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('F-11 AC-036 negative case: the default pipeline with a body in each flow lists no unplaced finding', () => {
    renderStep();
    expect(screen.queryByRole('region', { name: 'Not on a drawn item' })).toBeNull();
  });
});

describe('F-11 AC-026 the rule tags offer the rule blocks of the Technical details step', () => {
  it('F-11 AC-026 keeps the valid rule blocks, once each, in order', () => {
    const blocks: readonly RuleValues[] = [
      { name: 'Code Style', description: 'Use the style guide.' },
      { name: '!!!', description: 'refused id' },
      { name: 'code-style', description: 'same id as the first' },
      { name: 'QA', description: 'Test first.' },
    ];
    expect(builderRules(blocks)).toEqual([
      { index: 0, id: 'code-style', title: 'Code Style', text: 'Use the style guide.' },
      { index: 1, id: 'qa', title: 'QA', text: 'Test first.' },
    ]);
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

  it('F-11 AC-035 a warning on a flow box shows beside that box, with the analyzer message', () => {
    extraMarks.findings = [
      { finding: warning('pipeline.flows.1', 'is short'), placement: { kind: 'flow', flowId: 'ux' } },
    ];
    renderStep();
    expect(screen.getByRole('note').textContent).toBe('Warning · is short');
    expect(screen.queryByRole('region', { name: 'Not on a drawn item' })).toBeNull();
  });

  it('F-11 AC-035 a warning on an arrow shows beside the box it leaves', () => {
    extraMarks.findings = [
      { finding: warning('pipeline.flows.0.next', 'goes far'), placement: { kind: 'arrow', source: 'specify' } },
    ];
    renderStep();
    expect(screen.getByRole('note').textContent).toBe('Warning · goes far');
  });

  it('F-11 AC-036 a warning with no drawn item is listed under the canvas and not beside a box', () => {
    extraMarks.findings = [{ finding: warning('pipeline.name', 'is blank'), placement: { kind: 'none' } }];
    renderStep();
    expect(screen.queryByRole('note')).toBeNull();
    const section = screen.getByRole('region', { name: 'Not on a drawn item' });
    expect(within(section).getByText('pipeline.name')).toBeTruthy();
    expect(within(section).getByText('is blank')).toBeTruthy();
  });
});
