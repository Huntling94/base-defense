import { describe, it, expect } from 'vitest';
import { TowerManager } from './tower-manager';
import { Grid } from './grid';
import { Enemy, ENEMY_CONFIGS } from '../entities/enemy';
import { TOWER_CONFIGS } from '../entities/towers';
import type { Projectile } from '../entities/projectile';

const basicEnemy = ENEMY_CONFIGS['basic'];

function enemyAt(x: number, y: number): Enemy {
  return new Enemy(x, y, basicEnemy);
}

describe('TowerManager', () => {
  describe('findClosestEnemy', () => {
    it('finds the closest enemy within range', () => {
      const grid = new Grid(10, 10);
      const manager = new TowerManager();
      const tower = { row: 5, col: 5, configIndex: 0, cooldown: 0 };
      const config = TOWER_CONFIGS[0]; // Arrow Tower, range 128

      const towerPos = grid.gridToWorld(5, 5);
      const near = enemyAt(towerPos.x + 50, towerPos.y);
      const far = enemyAt(towerPos.x + 100, towerPos.y);

      const target = manager.findClosestEnemy(tower, config, [far, near], grid);
      expect(target).toBe(near);
    });

    it('returns null when no enemies in range', () => {
      const grid = new Grid(10, 10);
      const manager = new TowerManager();
      const tower = { row: 5, col: 5, configIndex: 0, cooldown: 0 };
      const config = TOWER_CONFIGS[0]; // range 128

      const towerPos = grid.gridToWorld(5, 5);
      const farAway = enemyAt(towerPos.x + 500, towerPos.y);

      const target = manager.findClosestEnemy(tower, config, [farAway], grid);
      expect(target).toBeNull();
    });

    it('ignores dead enemies', () => {
      const grid = new Grid(10, 10);
      const manager = new TowerManager();
      const tower = { row: 5, col: 5, configIndex: 0, cooldown: 0 };
      const config = TOWER_CONFIGS[0];

      const towerPos = grid.gridToWorld(5, 5);
      const dead = enemyAt(towerPos.x + 10, towerPos.y);
      dead.health = 0;
      const alive = enemyAt(towerPos.x + 50, towerPos.y);

      const target = manager.findClosestEnemy(tower, config, [dead, alive], grid);
      expect(target).toBe(alive);
    });
  });

  describe('update', () => {
    it('fires projectile when enemy in range and cooldown ready', () => {
      const grid = new Grid(10, 10);
      const manager = new TowerManager();
      manager.registerTower(5, 5, 0); // Arrow Tower

      const towerPos = grid.gridToWorld(5, 5);
      const enemy = enemyAt(towerPos.x + 50, towerPos.y);
      const projectiles: Projectile[] = [];

      manager.update(1, [enemy], projectiles, grid);
      expect(projectiles.length).toBe(1);
    });

    it('respects cooldown', () => {
      const grid = new Grid(10, 10);
      const manager = new TowerManager();
      manager.registerTower(5, 5, 0); // Arrow Tower, fireRate 2 = every 0.5s

      const towerPos = grid.gridToWorld(5, 5);
      const enemy = enemyAt(towerPos.x + 50, towerPos.y);
      const projectiles: Projectile[] = [];

      // First shot
      manager.update(1, [enemy], projectiles, grid);
      expect(projectiles.length).toBe(1);

      // Too soon for second shot (0.1s < 0.5s cooldown)
      manager.update(0.1, [enemy], projectiles, grid);
      expect(projectiles.length).toBe(1);

      // Enough time for second shot
      manager.update(0.5, [enemy], projectiles, grid);
      expect(projectiles.length).toBe(2);
    });

    it('Gold Mine does not fire', () => {
      const grid = new Grid(10, 10);
      const manager = new TowerManager();
      manager.registerTower(5, 5, 4); // Gold Mine, fireRate 0

      const towerPos = grid.gridToWorld(5, 5);
      const enemy = enemyAt(towerPos.x + 10, towerPos.y);
      const projectiles: Projectile[] = [];

      manager.update(10, [enemy], projectiles, grid);
      expect(projectiles.length).toBe(0);
    });
  });
});
