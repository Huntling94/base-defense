import { describe, it, expect } from 'vitest';
import { Enemy, ENEMY_CONFIGS } from './enemy';
import { Grid, TILE_SIZE } from '../systems/grid';

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
