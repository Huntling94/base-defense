import { describe, it, expect } from 'vitest';
import { Grid, TILE_SIZE, Terrain, StructureKind, TERRAIN_CONFIG } from './grid';
import type { Structure, StructureRef } from './grid';

describe('Grid', () => {
  describe('constructor', () => {
    it('creates a grid with the specified dimensions', () => {
      const grid = new Grid(10, 20);
      expect(grid.rows).toBe(10);
      expect(grid.cols).toBe(20);
    });

    it('initializes all tiles as grass with no structure', () => {
      const grid = new Grid(3, 3);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const tile = grid.getTile(r, c);
          expect(tile).not.toBeNull();
          expect(tile!.terrain).toBe(Terrain.Grass);
          expect(tile!.structureRef).toBeNull();
        }
      }
    });
  });

  describe('worldToGrid', () => {
    const grid = new Grid(10, 10);

    it('converts pixel position to grid coordinates', () => {
      const coord = grid.worldToGrid(100, 200);
      expect(coord.col).toBe(Math.floor(100 / TILE_SIZE));
      expect(coord.row).toBe(Math.floor(200 / TILE_SIZE));
    });

    it('maps pixel (0, 0) to tile (0, 0)', () => {
      const coord = grid.worldToGrid(0, 0);
      expect(coord.row).toBe(0);
      expect(coord.col).toBe(0);
    });

    it('maps last pixel before tile boundary to same tile', () => {
      const coord = grid.worldToGrid(TILE_SIZE - 1, TILE_SIZE - 1);
      expect(coord.row).toBe(0);
      expect(coord.col).toBe(0);
    });

    it('maps first pixel of next tile correctly', () => {
      const coord = grid.worldToGrid(TILE_SIZE, TILE_SIZE);
      expect(coord.row).toBe(1);
      expect(coord.col).toBe(1);
    });

    it('handles negative coordinates', () => {
      const coord = grid.worldToGrid(-1, -1);
      expect(coord.row).toBe(-1);
      expect(coord.col).toBe(-1);
    });
  });

  describe('gridToWorld', () => {
    const grid = new Grid(10, 10);

    it('returns center of tile in world pixels', () => {
      const pos = grid.gridToWorld(0, 0);
      expect(pos.x).toBe(TILE_SIZE / 2);
      expect(pos.y).toBe(TILE_SIZE / 2);
    });

    it('returns correct center for non-origin tile', () => {
      const pos = grid.gridToWorld(3, 5);
      expect(pos.x).toBe(5 * TILE_SIZE + TILE_SIZE / 2);
      expect(pos.y).toBe(3 * TILE_SIZE + TILE_SIZE / 2);
    });
  });

  describe('round-trip conversion', () => {
    const grid = new Grid(20, 20);

    it('worldToGrid(gridToWorld(r, c)) returns the same tile', () => {
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const world = grid.gridToWorld(r, c);
          const back = grid.worldToGrid(world.x, world.y);
          expect(back.row).toBe(r);
          expect(back.col).toBe(c);
        }
      }
    });
  });

  describe('isInBounds', () => {
    const grid = new Grid(10, 15);

    it('returns true for valid coordinates', () => {
      expect(grid.isInBounds(0, 0)).toBe(true);
      expect(grid.isInBounds(9, 14)).toBe(true);
      expect(grid.isInBounds(5, 7)).toBe(true);
    });

    it('returns false for negative row', () => {
      expect(grid.isInBounds(-1, 0)).toBe(false);
    });

    it('returns false for negative col', () => {
      expect(grid.isInBounds(0, -1)).toBe(false);
    });

    it('returns false for row overflow', () => {
      expect(grid.isInBounds(10, 0)).toBe(false);
    });

    it('returns false for col overflow', () => {
      expect(grid.isInBounds(0, 15)).toBe(false);
    });
  });

  describe('getTile', () => {
    const grid = new Grid(5, 5);

    it('returns tile data for valid coordinates', () => {
      const tile = grid.getTile(2, 3);
      expect(tile).not.toBeNull();
      expect(tile!.terrain).toBe(Terrain.Grass);
    });

    it('returns null for out-of-bounds coordinates', () => {
      expect(grid.getTile(-1, 0)).toBeNull();
      expect(grid.getTile(0, -1)).toBeNull();
      expect(grid.getTile(5, 0)).toBeNull();
      expect(grid.getTile(0, 5)).toBeNull();
    });
  });

  describe('isOccupied', () => {
    it('returns false for empty tiles', () => {
      const grid = new Grid(5, 5);
      expect(grid.isOccupied(0, 0)).toBe(false);
    });

    it('returns true when tile has a structure', () => {
      const grid = new Grid(5, 5);
      const structure: Structure = {
        kind: StructureKind.Wall,
        anchor: { row: 1, col: 1 },
        size: { rows: 1, cols: 1 },
        health: 100,
        maxHealth: 100,
      };
      const ref: StructureRef = { structure, isAnchor: true };
      const tile = grid.getTile(1, 1);
      tile!.structureRef = ref;

      expect(grid.isOccupied(1, 1)).toBe(true);
    });

    it('returns false for out-of-bounds coordinates', () => {
      const grid = new Grid(5, 5);
      expect(grid.isOccupied(-1, 0)).toBe(false);
    });
  });
});

describe('TERRAIN_CONFIG', () => {
  it('grass is walkable and buildable', () => {
    const config = TERRAIN_CONFIG[Terrain.Grass];
    expect(config.movementMultiplier).toBe(1.0);
    expect(config.buildable).toBe(true);
  });

  it('sand slows movement but is buildable', () => {
    const config = TERRAIN_CONFIG[Terrain.Sand];
    expect(config.movementMultiplier).toBeLessThan(1.0);
    expect(config.movementMultiplier).toBeGreaterThan(0);
    expect(config.buildable).toBe(true);
  });

  it('rock is walkable but not buildable', () => {
    const config = TERRAIN_CONFIG[Terrain.Rock];
    expect(config.movementMultiplier).toBeGreaterThan(0);
    expect(config.buildable).toBe(false);
  });

  it('every terrain has both color and colorAlt defined', () => {
    for (const terrain of Object.values(Terrain)) {
      const config = TERRAIN_CONFIG[terrain];
      expect(config.color).toBeTruthy();
      expect(config.colorAlt).toBeTruthy();
    }
  });
});
