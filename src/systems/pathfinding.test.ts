import { describe, it, expect } from 'vitest';
import { findPath } from './pathfinding';
import { Grid, Terrain, StructureKind } from './grid';
import type { Structure, StructureRef } from './grid';

function blockTile(grid: Grid, row: number, col: number): void {
  const structure: Structure = {
    kind: StructureKind.Tower,
    anchor: { row, col },
    size: { rows: 1, cols: 1 },
    health: 100,
    maxHealth: 100,
    configIndex: 0,
  };
  const tile = grid.getTile(row, col)!;
  tile.structureRef = { structure, isAnchor: true };
}

function setTerrain(grid: Grid, row: number, col: number, terrain: Terrain): void {
  const tile = grid.getTile(row, col)! as { terrain: Terrain; structureRef: StructureRef | null };
  tile.terrain = terrain;
}

describe('findPath', () => {
  it('finds a straight path on an open grid', () => {
    const grid = new Grid(5, 5);
    const path = findPath(grid, { row: 0, col: 0 }, { row: 0, col: 4 });
    expect(path).not.toBeNull();
    expect(path!.length).toBe(5);
    expect(path![0]).toEqual({ row: 0, col: 0 });
    expect(path![4]).toEqual({ row: 0, col: 4 });
  });

  it('finds path around an obstacle', () => {
    const grid = new Grid(5, 5);
    // Block col 2 except row 4
    blockTile(grid, 0, 2);
    blockTile(grid, 1, 2);
    blockTile(grid, 2, 2);
    blockTile(grid, 3, 2);

    const path = findPath(grid, { row: 0, col: 0 }, { row: 0, col: 4 });
    expect(path).not.toBeNull();
    // Path must go around the wall via row 4
    expect(path!.length).toBeGreaterThan(5);
    // Every step should be a valid tile
    for (const coord of path!) {
      expect(grid.isInBounds(coord.row, coord.col)).toBe(true);
      expect(grid.isOccupied(coord.row, coord.col)).toBe(false);
    }
  });

  it('returns null when no path exists', () => {
    const grid = new Grid(5, 5);
    // Completely wall off the goal
    blockTile(grid, 0, 1);
    blockTile(grid, 1, 1);
    blockTile(grid, 1, 0);

    // Goal at (0,0), start at (2,2) — (0,0) is surrounded
    const path = findPath(grid, { row: 2, col: 2 }, { row: 0, col: 0 });
    expect(path).toBeNull();
  });

  it('returns single-element path when start equals goal', () => {
    const grid = new Grid(5, 5);
    const path = findPath(grid, { row: 2, col: 2 }, { row: 2, col: 2 });
    expect(path).toEqual([{ row: 2, col: 2 }]);
  });

  it('returns null when goal is blocked', () => {
    const grid = new Grid(5, 5);
    blockTile(grid, 3, 3);
    const path = findPath(grid, { row: 0, col: 0 }, { row: 3, col: 3 });
    expect(path).toBeNull();
  });

  it('returns null when start or goal is out of bounds', () => {
    const grid = new Grid(5, 5);
    expect(findPath(grid, { row: -1, col: 0 }, { row: 0, col: 0 })).toBeNull();
    expect(findPath(grid, { row: 0, col: 0 }, { row: 10, col: 0 })).toBeNull();
  });

  it('prefers grass over sand due to terrain cost', () => {
    // Wide grid so the detour through grass is cheaper than slogging through sand.
    // Row 0: 10 sand tiles between start and goal (cost per sand ~1.67, total ~16.7)
    // Row 1: all grass, detour = 1 down + 10 across + 1 up = 12 steps at cost 1 each
    const grid = new Grid(3, 12);
    for (let c = 1; c < 11; c++) {
      setTerrain(grid, 0, c, Terrain.Sand);
    }

    const path = findPath(grid, { row: 0, col: 0 }, { row: 0, col: 11 });
    expect(path).not.toBeNull();

    // Path should detour through row 1 (grass) to avoid sand
    const row1Waypoints = path!.filter((p) => p.row === 1);
    expect(row1Waypoints.length).toBeGreaterThan(0);
  });

  it('path steps are adjacent (4-directional)', () => {
    const grid = new Grid(10, 10);
    blockTile(grid, 3, 3);
    blockTile(grid, 3, 4);
    blockTile(grid, 3, 5);

    const path = findPath(grid, { row: 0, col: 0 }, { row: 6, col: 6 });
    expect(path).not.toBeNull();

    for (let i = 1; i < path!.length; i++) {
      const prev = path![i - 1];
      const curr = path![i];
      const dr = Math.abs(curr.row - prev.row);
      const dc = Math.abs(curr.col - prev.col);
      // Each step should be exactly 1 tile in one direction
      expect(dr + dc).toBe(1);
    }
  });
});
