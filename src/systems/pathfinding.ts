import { BinaryHeap } from '../utils/binary-heap';
import { TERRAIN_CONFIG } from './grid';
import type { Grid, GridCoord } from './grid';

interface PathNode {
  row: number;
  col: number;
  g: number;
  f: number;
}

const NEIGHBORS: [number, number][] = [
  [-1, 0], // up
  [1, 0], // down
  [0, -1], // left
  [0, 1], // right
];

function coordKey(row: number, col: number): string {
  return `${row},${col}`;
}

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

/**
 * Find shortest path from start to goal using A*.
 * Returns array of GridCoords from start to goal (inclusive), or null if no path.
 */
export function findPath(grid: Grid, start: GridCoord, goal: GridCoord): GridCoord[] | null {
  // Start or goal out of bounds
  if (!grid.isInBounds(start.row, start.col) || !grid.isInBounds(goal.row, goal.col)) {
    return null;
  }

  // Goal is blocked
  if (isBlocked(grid, goal.row, goal.col)) {
    return null;
  }

  // Already at goal
  if (start.row === goal.row && start.col === goal.col) {
    return [{ row: start.row, col: start.col }];
  }

  const open = new BinaryHeap<PathNode>((a, b) => a.f - b.f);
  const closed = new Set<string>();
  const gCosts = new Map<string, number>();
  const parents = new Map<string, string>();

  const startKey = coordKey(start.row, start.col);
  const h = manhattan(start.row, start.col, goal.row, goal.col);
  open.insert({ row: start.row, col: start.col, g: 0, f: h });
  gCosts.set(startKey, 0);

  while (!open.isEmpty) {
    const current = open.extractMin()!;
    const currentKey = coordKey(current.row, current.col);

    // Reached goal
    if (current.row === goal.row && current.col === goal.col) {
      return reconstructPath(parents, start, goal);
    }

    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    for (const [dr, dc] of NEIGHBORS) {
      const nr = current.row + dr;
      const nc = current.col + dc;

      if (!grid.isInBounds(nr, nc)) continue;
      const neighborKey = coordKey(nr, nc);
      if (closed.has(neighborKey)) continue;
      if (isBlocked(grid, nr, nc)) continue;

      const tile = grid.getTile(nr, nc)!;
      const terrainConfig = TERRAIN_CONFIG[tile.terrain];
      const moveCost =
        terrainConfig.movementMultiplier > 0 ? 1 / terrainConfig.movementMultiplier : Infinity;
      const tentativeG = current.g + moveCost;

      const existingG = gCosts.get(neighborKey);
      if (existingG !== undefined && tentativeG >= existingG) continue;

      gCosts.set(neighborKey, tentativeG);
      parents.set(neighborKey, currentKey);
      const fCost = tentativeG + manhattan(nr, nc, goal.row, goal.col);
      open.insert({ row: nr, col: nc, g: tentativeG, f: fCost });
    }
  }

  return null; // No path found
}

function isBlocked(grid: Grid, row: number, col: number): boolean {
  const tile = grid.getTile(row, col);
  if (!tile) return true;
  if (tile.structureRef !== null) return true;
  const config = TERRAIN_CONFIG[tile.terrain];
  if (config.movementMultiplier <= 0) return true;
  return false;
}

function reconstructPath(
  parents: Map<string, string>,
  start: GridCoord,
  goal: GridCoord,
): GridCoord[] {
  const path: GridCoord[] = [];
  let key = coordKey(goal.row, goal.col);
  const startKey = coordKey(start.row, start.col);

  while (key !== startKey) {
    const [r, c] = key.split(',').map(Number);
    path.push({ row: r, col: c });
    const parent = parents.get(key);
    if (!parent) break;
    key = parent;
  }
  path.push({ row: start.row, col: start.col });
  path.reverse();
  return path;
}
