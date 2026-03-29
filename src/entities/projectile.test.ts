import { describe, it, expect } from 'vitest';
import { createProjectile, updateProjectile } from './projectile';
import { Enemy, ENEMY_CONFIGS } from './enemy';
import { TOWER_CONFIGS } from './towers';

const arrowConfig = TOWER_CONFIGS[0];
const basicEnemy = ENEMY_CONFIGS['basic'];

describe('Projectile', () => {
  describe('createProjectile', () => {
    it('creates projectile moving toward target', () => {
      const target = new Enemy(100, 0, basicEnemy);
      const proj = createProjectile(0, 0, target, arrowConfig);

      expect(proj.x).toBe(0);
      expect(proj.y).toBe(0);
      expect(proj.vx).toBeGreaterThan(0);
      expect(proj.vy).toBeCloseTo(0);
      expect(proj.alive).toBe(true);
    });
  });

  describe('updateProjectile', () => {
    it('moves projectile by velocity', () => {
      const target = new Enemy(100, 0, basicEnemy);
      const proj = createProjectile(0, 0, target, arrowConfig);
      const startX = proj.x;

      updateProjectile(proj, 0.1, []);
      expect(proj.x).toBeGreaterThan(startX);
      expect(proj.alive).toBe(true);
    });

    it('dies after lifetime expires', () => {
      const target = new Enemy(10000, 0, basicEnemy);
      const proj = createProjectile(0, 0, target, arrowConfig);

      updateProjectile(proj, 10, []);
      expect(proj.alive).toBe(false);
    });

    it('damages enemy on collision', () => {
      const enemy = new Enemy(5, 0, basicEnemy);
      const proj = createProjectile(0, 0, enemy, arrowConfig);

      // Move projectile close to enemy
      proj.x = enemy.x;
      proj.y = enemy.y;

      const healthBefore = enemy.health;
      updateProjectile(proj, 0.01, [enemy]);

      expect(enemy.health).toBe(healthBefore - arrowConfig.damage);
      expect(proj.alive).toBe(false);
    });

    it('does not damage dead enemies', () => {
      const enemy = new Enemy(5, 0, basicEnemy);
      enemy.health = 0;
      const proj = createProjectile(0, 0, enemy, arrowConfig);
      proj.x = enemy.x;
      proj.y = enemy.y;

      updateProjectile(proj, 0.01, [enemy]);
      expect(proj.alive).toBe(true); // Passed through dead enemy
      expect(enemy.health).toBe(0);
    });
  });
});
