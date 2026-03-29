import { Enemy, ENEMY_CONFIGS } from '../entities/enemy';
import { findPath } from './pathfinding';
import { TILE_SIZE } from './grid';
import type { Grid } from './grid';
import type { Player } from '../entities/player';

const SPAWN_INTERVAL = 2;
const SPAWN_MARGIN = TILE_SIZE; // spawn one tile outside the grid

export class Spawner {
  private timer: number = 0;

  update(dt: number, enemies: Enemy[], grid: Grid, player: Player): void {
    this.timer += dt;
    if (this.timer < SPAWN_INTERVAL) return;
    this.timer -= SPAWN_INTERVAL;

    const spawnPos = this.pickSpawnPosition(grid);
    const enemy = new Enemy(spawnPos.x, spawnPos.y, ENEMY_CONFIGS['basic']);

    // Pathfind to player's current tile
    const enemyTile = grid.worldToGrid(spawnPos.x, spawnPos.y);
    const playerTile = grid.worldToGrid(player.x, player.y);
    const path = findPath(grid, enemyTile, playerTile);

    if (path) {
      enemy.setPath(path);
    }

    enemies.push(enemy);
  }

  private pickSpawnPosition(grid: Grid): { x: number; y: number } {
    const worldW = grid.cols * TILE_SIZE;
    const worldH = grid.rows * TILE_SIZE;
    const side = Math.floor(Math.random() * 4);

    switch (side) {
      case 0: // top
        return { x: Math.random() * worldW, y: -SPAWN_MARGIN };
      case 1: // right
        return { x: worldW + SPAWN_MARGIN, y: Math.random() * worldH };
      case 2: // bottom
        return { x: Math.random() * worldW, y: worldH + SPAWN_MARGIN };
      default: // left
        return { x: -SPAWN_MARGIN, y: Math.random() * worldH };
    }
  }
}
