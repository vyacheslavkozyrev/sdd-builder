import { describe, expect, it } from 'vitest';
import { wouldCreateCycle } from '../src/cycle.js';
import { connection } from './fixtures.js';

describe('F-06 T004 wouldCreateCycle', () => {
  const chain = [connection('a', 'b'), connection('b', 'c')];

  it.each([
    ['a workflow to itself, on an empty map', [], 'a', 'a'],
    ['a workflow to itself, on a map with other connections', chain, 'b', 'b'],
  ])('F-06 AC-013 refuses a self-link: %s', (_name, connections, from, to) => {
    expect(wouldCreateCycle(connections, from, to)).toBe(true);
  });

  it.each([
    ['closing a chain back to its start (C→A after A→B→C)', [...chain], 'c', 'a'],
    ['closing a chain back to its middle (C→B after A→B→C)', [...chain], 'c', 'b'],
    ['the reverse of an existing connection (B→A after A→B)', [connection('a', 'b')], 'b', 'a'],
    ['closing a longer path back to its start (D→A after A→B→C→D)', [...chain, connection('c', 'd')], 'd', 'a'],
  ])('F-06 AC-014 refuses a connection that closes a cycle: %s', (_name, connections, from, to) => {
    expect(wouldCreateCycle(connections, from, to)).toBe(true);
  });

  it.each([
    ['an unrelated pair on an empty map', [], 'a', 'b'],
    ['extending a chain forward (C→D after A→B→C)', [...chain], 'c', 'd'],
    ['a new branch from the start (A→C after A→B)', [connection('a', 'b')], 'a', 'c'],
    ['joining two branches without a loop (B→C after A→B, A→C)', [connection('a', 'b'), connection('a', 'c')], 'b', 'c'],
    ['a pair with no path in either direction (D→E after A→B→C)', [...chain], 'd', 'e'],
    ['a connection from a workflow with no outgoing links (C→A when only A→B exists)', [connection('a', 'b')], 'c', 'a'],
  ])('F-06 AC-014 allows a connection that keeps the map acyclic: %s', (_name, connections, from, to) => {
    expect(wouldCreateCycle(connections, from, to)).toBe(false);
  });

  it('F-06 AC-014 does not change the connections it is given', () => {
    const connections = [...chain];
    wouldCreateCycle(connections, 'c', 'a');
    expect(connections).toEqual(chain);
  });
});
