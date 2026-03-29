import { TOWER_CONFIGS } from '../entities/towers';
import type { TowerConfig } from '../entities/towers';
import type { Enemy } from '../entities/enemy';
import type { Grid } from './grid';
import type { Projectile } from '../entities/projectile';
import { createProjectile } from '../entities/projectile';

export interface TowerInstance {
  row: number;
  col: number;
  configIndex: number;
  cooldown: number;
}

export class TowerManager {
  towers: TowerInstance[] = [];

  registerTower(row: number, col: number, configIndex: number): void {
    this.towers.push({ row, col, configIndex, cooldown: 0 });
  }

  removeTower(row: number, col: number): void {
    this.towers = this.towers.filter((t) => t.row !== row || t.col !== col);
  }

  update(dt: number, enemies: Enemy[], projectiles: Projectile[], grid: Grid): void {
    for (const tower of this.towers) {
      const config = TOWER_CONFIGS[tower.configIndex];
      if (config.fireRate <= 0) continue;

      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;

      const target = this.findClosestEnemy(tower, config, enemies, grid);
      if (!target) continue;

      tower.cooldown = 1 / config.fireRate;
      const towerPos = grid.gridToWorld(tower.row, tower.col);
      projectiles.push(createProjectile(towerPos.x, towerPos.y, target, config));
    }
  }

  findClosestEnemy(
    tower: TowerInstance,
    config: TowerConfig,
    enemies: Enemy[],
    grid: Grid,
  ): Enemy | null {
    const towerPos = grid.gridToWorld(tower.row, tower.col);
    const rangeSq = config.range * config.range;
    let closest: Enemy | null = null;
    let closestDistSq = Infinity;

    for (const enemy of enemies) {
      if (enemy.health <= 0) continue;
      const dx = enemy.x - towerPos.x;
      const dy = enemy.y - towerPos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= rangeSq && distSq < closestDistSq) {
        closest = enemy;
        closestDistSq = distSq;
      }
    }
    return closest;
  }
}
