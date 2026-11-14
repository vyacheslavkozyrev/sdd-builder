import { describe, expect, it } from 'vitest';
import { mermaidId, renderMermaid } from '../src/index.js';
import { baseConfig, connection } from './fixtures.js';

/** Every id an edge refers to must be declared as a node or subgraph. */
function declaredIds(text: string): Set<string> {
  const ids = new Set<string>();
  for (const line of text.split('\n')) {
    const sub = /^\s*subgraph\s+(\w+)/.exec(line);
    if (sub?.[1]) ids.add(sub[1]);
    const node = /^\s*(\w+)[[({]/.exec(line);
    if (node?.[1]) ids.add(node[1]);
  }
  return ids;
}

function edgeEndpoints(text: string): [string, string][] {
  const edges: [string, string][] = [];
  for (const line of text.split('\n')) {
    const match = /^\s*(\w+)\s*(?:-->|-->\|[^|]*\|)\s*(\w+)\s*$/.exec(line) ?? /^\s*(\w+)\s*-->\|[^|]*\|\s*(\w+)\s*$/.exec(line);
    const edge = match ? [match[1], match[2]] : undefined;
    if (edge && edge[0] && edge[1]) {
      edges.push([edge[0], edge[1]]);
    }
  }
  return edges;
}

describe('F-02 T015 Mermaid process view', () => {
  it('F-02 AC-028 starts a flowchart with one subgraph per enabled workflow', () => {
    const text = renderMermaid(baseConfig());
    expect(text.split('\n')[0]).toBe('flowchart TD');
    expect(text).toContain('subgraph wf_specify["Specify (feature)"]');
    expect(text).toContain('subgraph wf_implement_cycle["Implement (task)"]');
    expect(text).toContain('wf_specify -->|"plan.md"| wf_implement_cycle');
  });

  it('F-02 AC-028 a map connection with an artifact is labelled with it', () => {
    expect(renderMermaid(baseConfig())).toContain('wf_specify -->|"plan.md"| wf_implement_cycle');
  });

  it('F-02 AC-029 a gate on a connection is a decision node', () => {
    const base = baseConfig();
    const gated = { ...base, connections: base.connections.map((c) => (c.id === 'specify-implement' ? { ...c, gate: { id: 'g', type: 'approval' as const, required: true } } : c)) };
    const text = renderMermaid(gated);
    expect(text).toContain('gate_specify_implement{"gate: approval"}');
    expect(text).toContain('gate_specify_implement -->|"pass"| wf_implement_cycle');
  });

  it('F-02 AC-029 a branch is a labelled edge with its round limit or "no limit set"', () => {
    const text = renderMermaid(baseConfig());
    expect(text).toContain('"fail: back to step 1 Implement, no limit set"');
    const base = baseConfig();
    const limited = {
      ...base,
      workflows: base.workflows.map((w) => (w.id === 'implement-cycle' ? { ...w, conditions: w.conditions.map((c) => (c.id === 'review-clean' ? { ...c, roundLimit: 2 } : c)) } : w)),
    };
    expect(renderMermaid(limited)).toContain('"fail: back to step 1 Implement, limit 2"');
  });

  it('F-02 AC-030 node ids use letters, digits and underscores only', () => {
    expect(mermaidId('wf', 'implement-cycle')).toBe('wf_implement_cycle');
    expect(mermaidId('a.b', 'c d')).toBe('a_b_c_d');
  });

  it('F-02 AC-030 every edge refers to a declared node or subgraph', () => {
    const base = baseConfig();
    const config = { ...base, connections: [...base.connections, connection('verify-feature', 'release-project', 'extra')] };
    const text = renderMermaid(config);
    const declared = declaredIds(text);
    const edges = edgeEndpoints(text);
    expect(edges.length).toBeGreaterThan(5);
    for (const [from, to] of edges) {
      expect(declared.has(from), `source ${from}`).toBe(true);
      expect(declared.has(to), `target ${to}`).toBe(true);
    }
  });

  it('F-02 AC-028 is the same for the same input', () => {
    expect(renderMermaid(baseConfig())).toBe(renderMermaid(baseConfig()));
  });

  it('F-06 AC-029 a switched-off condition with an unwired output gives no node and no edge', () => {
    const base = baseConfig();
    const offConfig = {
      ...base,
      workflows: base.workflows.map((w) =>
        w.id === 'implement-cycle'
          ? {
              ...w,
              conditions: w.conditions.map((c) =>
                c.id === 'review-clean' ? { ...c, enabled: false, fail: undefined } : c,
              ),
            }
          : w,
      ),
    };
    const text = renderMermaid(offConfig);
    expect(text).not.toContain('review_clean');
    expect(text).not.toContain('{"review"}');
  });

  it('F-06 AC-029 a switched-off condition draws the same diagram as a removed one', () => {
    const base = baseConfig();
    const offConfig = {
      ...base,
      workflows: base.workflows.map((w) =>
        w.id === 'implement-cycle'
          ? { ...w, conditions: w.conditions.map((c) => (c.id === 'review-clean' ? { ...c, enabled: false } : c)) }
          : w,
      ),
    };
    const removedConfig = {
      ...base,
      workflows: base.workflows.map((w) =>
        w.id === 'implement-cycle' ? { ...w, conditions: w.conditions.filter((c) => c.id !== 'review-clean') } : w,
      ),
    };
    expect(renderMermaid(offConfig)).toBe(renderMermaid(removedConfig));
  });
});
