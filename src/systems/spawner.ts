import { Enemy, ENEMY_CONFIGS } from '../entities/enemy';
import { findPath } from './pathfinding';
import { TILE_SIZE } from './grid';
import type { Grid } from './grid';
import type { Player } from '../entities/player';

const SPAWN_INTERVAL = 2;

export class Spawner {
  private timer: number = 0;

  update(dt: number, enemies: Enemy[], grid: Grid, player: Player): void {
    this.timer += dt;
    if (this.timer < SPAWN_INTERVAL) return;
    this.timer -= SPAWN_INTERVAL;

    const spawnTile = this.pickSpawnTile(grid);
    const spawnX = spawnTile.col * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = spawnTile.row * TILE_SIZE + TILE_SIZE / 2;
    const enemy = new Enemy(spawnX, spawnY, ENEMY_CONFIGS['basic']);

    const playerTile = grid.worldToGrid(player.x, player.y);
    const path = findPath(grid, spawnTile, playerTile);

    if (path) {
      enemy.setPath(path);
    }

    enemies.push(enemy);
  }

  private pickSpawnTile(grid: Grid): { row: number; col: number } {
    const side = Math.floor(Math.random() * 4);
    const maxRow = grid.rows - 1;
    const maxCol = grid.cols - 1;

    switch (side) {
      case 0: // top edge
        return { row: 0, col: Math.floor(Math.random() * grid.cols) };
      case 1: // right edge
        return { row: Math.floor(Math.random() * grid.rows), col: maxCol };
      case 2: // bottom edge
        return { row: maxRow, col: Math.floor(Math.random() * grid.cols) };
      default: // left edge
        return { row: Math.floor(Math.random() * grid.rows), col: 0 };
    }
  }
}
