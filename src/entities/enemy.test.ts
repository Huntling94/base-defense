import { describe, it, expect } from 'vitest';
import { Enemy, ENEMY_CONFIGS } from './enemy';
import { Grid, TILE_SIZE, StructureKind } from '../systems/grid';
import type { Structure } from '../systems/grid';

const basicConfig = ENEMY_CONFIGS['basic'];

describe('Enemy', () => {
  describe('path following', () => {
    it('moves toward first waypoint', () => {
      const grid = new Grid(5, 5);
      const startX = 0.5 * TILE_SIZE + TILE_SIZE / 2;
      const startY = 0.5 * TILE_SIZE + TILE_SIZE / 2;
      const enemy = new Enemy(startX, startY, basicConfig);

      enemy.setPath([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ]);

      enemy.update(0.1, grid);
      expect(enemy.arrived).toBe(false);
      expect(enemy.hasPath()).toBe(true);
    });

    it('advances through waypoints', () => {
      const grid = new Grid(5, 5);
      // Start at center of tile (0,0)
      const enemy = new Enemy(TILE_SIZE / 2, TILE_SIZE / 2, basicConfig);

      enemy.setPath([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]);

      // First waypoint is where we already are, should snap and advance
      enemy.update(0.016, grid);

      // Run enough frames to reach second waypoint
      for (let i = 0; i < 100; i++) {
        enemy.update(0.016, grid);
        if (enemy.arrived) break;
      }

      expect(enemy.arrived).toBe(true);
    });

    it('sets arrived when reaching final waypoint', () => {
      const grid = new Grid(5, 5);
      const enemy = new Enemy(TILE_SIZE / 2, TILE_SIZE / 2, basicConfig);

      enemy.setPath([{ row: 0, col: 0 }]);
      enemy.update(0.016, grid);

      expect(enemy.arrived).toBe(true);
    });

    it('does not move without a path', () => {
      const grid = new Grid(5, 5);
      const enemy = new Enemy(100, 100, basicConfig);
      const startX = enemy.x;
      const startY = enemy.y;

      enemy.update(0.016, grid);

      expect(enemy.x).toBe(startX);
      expect(enemy.y).toBe(startY);
    });

    it('does not move after arriving', () => {
      const grid = new Grid(5, 5);
      const enemy = new Enemy(TILE_SIZE / 2, TILE_SIZE / 2, basicConfig);
      enemy.setPath([{ row: 0, col: 0 }]);
      enemy.update(0.016, grid);
      expect(enemy.arrived).toBe(true);

      const x = enemy.x;
      const y = enemy.y;
      enemy.update(0.016, grid);
      expect(enemy.x).toBe(x);
      expect(enemy.y).toBe(y);
    });
  });

  describe('structure attacking', () => {
    function placeWall(grid: Grid, row: number, col: number): Structure {
      const structure: Structure = {
        kind: StructureKind.Wall,
        anchor: { row, col },
        size: { rows: 1, cols: 1 },
        health: 100,
        maxHealth: 100,
        configIndex: -1,
      };
      const tile = grid.getTile(row, col)!;
      tile.structureRef = { structure, isAnchor: true };
      return structure;
    }

    it('finds nearest structure when path is blocked', () => {
      const grid = new Grid(5, 5);
      placeWall(grid, 2, 2);

      const enemy = new Enemy(TILE_SIZE / 2, TILE_SIZE / 2, basicConfig);
      // No path set, pathStale not set — enemy has no path and no target
      // On update, it should find the wall as attack target
      enemy.pathStale = true;
      enemy.update(0.016, grid);

      expect(enemy.attackTarget).not.toBeNull();
      expect(enemy.attackTarget!.row).toBe(2);
      expect(enemy.attackTarget!.col).toBe(2);
    });

    it('damages structure when in attack range', () => {
      const grid = new Grid(5, 5);
      const structure = placeWall(grid, 0, 1);

      // Place enemy right next to the wall
      const enemy = new Enemy(TILE_SIZE / 2, TILE_SIZE / 2, basicConfig);
      enemy.attackTarget = { row: 0, col: 1 };
      enemy.pathStale = true;

      const healthBefore = structure.health;
      // Run for 1 second
      for (let i = 0; i < 60; i++) {
        enemy.update(1 / 60, grid);
      }

      expect(structure.health).toBeLessThan(healthBefore);
    });

    it('clears attack target when structure is destroyed', () => {
      const grid = new Grid(5, 5);
      placeWall(grid, 0, 1);

      const enemy = new Enemy(TILE_SIZE / 2, TILE_SIZE / 2, basicConfig);
      enemy.attackTarget = { row: 0, col: 1 };
      enemy.pathStale = true;

      // Remove the wall
      grid.getTile(0, 1)!.structureRef = null;

      enemy.update(0.016, grid);
      expect(enemy.attackTarget).toBeNull();
      expect(enemy.pathStale).toBe(true);
    });
  });

  describe('setPath', () => {
    it('resets path state', () => {
      const enemy = new Enemy(0, 0, basicConfig);
      enemy.arrived = true;
      enemy.pathStale = true;

      enemy.setPath([
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ]);

      expect(enemy.arrived).toBe(false);
      expect(enemy.pathStale).toBe(false);
      expect(enemy.hasPath()).toBe(true);
    });
  });
});
