// The Mermaid process diagram of the pipeline (architecture.md §10; the process.md value of the templates).
// One node per child flow, in pipeline order, with the node ids F1, F2, … so that no flow id can clash with a
// Mermaid keyword; an edge runs from each flow to the flow its FlowLink names, carrying the FlowLink label. A flow
// with no FlowLink gets an unlabelled edge to the next flow, and the last flow with no FlowLink gets none. A gate on
// a FlowLink is a decision node G1, G2, … between its two flows, labelled with its kind and description; its edge to
// the next flow is labelled `pass` (a pipeline gate has no fail route). Labels are written with Mermaid entity codes
// (line breaks as spaces) for the characters that would end or change a quoted label. Pure: the pipeline is read,
// never changed.

import type { Gate, Pipeline } from '../model.js';

// The characters a label cannot hold as typed, each with its replacement: a Mermaid entity code, or a space for a
// line break (a quoted label holds one line). Each character is replaced once, in a single pass, so an entity code
// is never escaped again.
const LABEL_REPLACEMENTS: Readonly<Record<string, string>> = {
  '#': '#35;',
  '"': '#quot;',
  '[': '#91;',
  ']': '#93;',
  '{': '#123;',
  '}': '#125;',
  '|': '#124;',
  '\n': ' ',
  '\r': ' ',
};

// The text of a `flowchart TD` for the child flows of a pipeline.
export function processDiagram(pipeline: Pipeline): string {
  const lines = ['flowchart TD'];
  pipeline.flows.forEach((flow, index) => {
    lines.push(`  F${index + 1}["${escapeLabel(flow.name)}"]`);
  });
  pipeline.flows.forEach((flow, index) => {
    const gate = flow.connectedTo?.gate;
    if (gate !== undefined) {
      lines.push(`  G${index + 1}{"${escapeLabel(gateText(gate))}"}`);
    }
  });
  pipeline.flows.forEach((flow, index) => {
    const link = flow.connectedTo;
    const target =
      link === undefined
        ? index + 1
        : pipeline.flows.findIndex((candidate) => candidate.id === link.to);
    if (target === -1) {
      throw new Error(`Flow "${flow.id}" connects to a flow that is not in the pipeline: "${link?.to ?? ''}"`);
    }
    if (target >= pipeline.flows.length) return;
    const label = link?.label ?? '';
    if (link?.gate === undefined) {
      lines.push(edgeLine(`F${index + 1}`, label, `F${target + 1}`));
    } else {
      lines.push(edgeLine(`F${index + 1}`, label, `G${index + 1}`));
      lines.push(edgeLine(`G${index + 1}`, 'pass', `F${target + 1}`));
    }
  });
  return lines.join('\n');
}

// A gate as the text of its decision node: its kind, then its description.
function gateText(gate: Gate): string {
  return gate.kind === 'approval' ? `Approval: ${gate.description}` : `Check: ${gate.description}`;
}

// An edge line, with its label when there is one.
function edgeLine(from: string, label: string, to: string): string {
  const edge = label === '' ? '-->' : `-->|"${escapeLabel(label)}"|`;
  return `  ${from} ${edge} ${to}`;
}

function escapeLabel(text: string): string {
  return Array.from(text, (character) => LABEL_REPLACEMENTS[character] ?? character).join('');
}
