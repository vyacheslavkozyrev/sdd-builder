import type { Flow, Pipeline } from '../model.js';

// The Mermaid flowchart of the process, for the generated process.md (F-05, AC-030 to AC-033; decision 36(a)). Only
// flows are drawn: Conditions and retry routes are not (owner decision, 2026-11-19). The first line is `flowchart`,
// which Mermaid draws top to bottom. The flows come in the order of the `next` links from the first flow, the one no
// other `next` names; node ids are `F1`, `F2` and so on in that order. Each node is labelled with the flow's name, and
// a flow with approval on has the word `approval` at the end of its label. Each `next` is one unlabelled edge from its
// flow's node to the node of the flow it names. The text is a pure function of the pipeline: no date, no random value.
export function processDiagram(pipeline: Pipeline): string {
  const chain = flowChain(pipeline.flows);
  const nodes = chain.map((flow, i) => `F${i + 1}["${labelText(flow.name)}${flow.approval ? ' approval' : ''}"]`);
  const edges = chain.flatMap((flow, i) => {
    const target = flow.next === undefined ? -1 : chain.findIndex((other) => other.id === flow.next);
    return target === -1 ? [] : [`F${i + 1} --> F${target + 1}`];
  });
  return ['flowchart', ...nodes, ...edges].join('\n');
}

// A flow name as the text of a node label (AC-034). A line break becomes a space. The characters that would end or
// change a Mermaid label (a double quote, a square bracket, a brace, a pipe) and a hash are written as Mermaid entity
// codes. The hash is escaped first, so the codes written after it are not escaped again.
function labelText(name: string): string {
  return name
    .replace(/\r\n|[\r\n\u2028\u2029]/g, ' ')
    .replace(/#/g, '#35;')
    .replace(/"/g, '#quot;')
    .replace(/\[/g, '#91;')
    .replace(/\]/g, '#93;')
    .replace(/\{/g, '#123;')
    .replace(/\}/g, '#125;')
    .replace(/\|/g, '#124;');
}

// The flows reached from the first flow along the `next` links, each once, in that order. A `next` to a missing flow
// is not followed, and a chain that loops stops at the flow already listed. A pipeline with no first flow (no flow, or
// every flow named by a `next`) gives an empty chain: the checks refuse such a pipeline before it is generated.
export function flowChain(flows: readonly Flow[]): Flow[] {
  const named = new Set(flows.flatMap((flow) => (flow.next === undefined ? [] : [flow.next])));
  const chain: Flow[] = [];
  let current: Flow | undefined = flows.find((flow) => !named.has(flow.id));
  while (current !== undefined && !chain.some((flow) => flow.id === current?.id)) {
    chain.push(current);
    const next = current.next;
    current = next === undefined ? undefined : flows.find((flow) => flow.id === next);
  }
  return chain;
}
