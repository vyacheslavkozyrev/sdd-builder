import type { MapConnection } from './model.js';

/**
 * True when adding the connection `from → to` to `connections` must be refused:
 * a self-link, or a connection that closes a cycle (a path `to → … → from`
 * already exists).
 */
export function wouldCreateCycle(connections: readonly MapConnection[], from: string, to: string): boolean {
  if (from === to) {
    return true;
  }
  const next = new Map<string, string[]>();
  for (const connection of connections) {
    next.set(connection.from, [...(next.get(connection.from) ?? []), connection.to]);
  }
  const seen = new Set<string>();
  const reaches = (node: string): boolean => {
    if (node === from) {
      return true;
    }
    if (seen.has(node)) {
      return false;
    }
    seen.add(node);
    return (next.get(node) ?? []).some(reaches);
  };
  return reaches(to);
}
