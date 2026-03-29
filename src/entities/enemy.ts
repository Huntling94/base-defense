import { TILE_SIZE, TERRAIN_CONFIG } from '../systems/grid';
import type { Grid, GridCoord } from '../systems/grid';

export interface EnemyConfig {
  readonly name: string;
  readonly speed: number;
  readonly health: number;
  readonly color: string;
  readonly radius: number;
}

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  basic: { name: 'Basic', speed: 80, health: 50, color: '#e53935', radius: 10 },
};

const WAYPOINT_THRESHOLD = 2;

export class Enemy {
  x: number;
  y: number;
  health: number;
  readonly config: EnemyConfig;
  private path: GridCoord[] = [];
  private pathIndex: number = 0;
  arrived: boolean = false;
  pathStale: boolean = false;

  constructor(x: number, y: number, config: EnemyConfig) {
    this.x = x;
    this.y = y;
    this.health = config.health;
    this.config = config;
  }

  setPath(path: GridCoord[]): void {
    this.path = path;
    this.pathIndex = 0;
    this.pathStale = false;
    this.arrived = false;
  }

  hasPath(): boolean {
    return this.path.length > 0 && this.pathIndex < this.path.length;
  }

  update(dt: number, grid: Grid): void {
    if (this.arrived || !this.hasPath()) return;

    const target = this.path[this.pathIndex];
    const targetX = target.col * TILE_SIZE + TILE_SIZE / 2;
    const targetY = target.row * TILE_SIZE + TILE_SIZE / 2;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < WAYPOINT_THRESHOLD) {
      this.x = targetX;
      this.y = targetY;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        this.arrived = true;
      }
      return;
    }

    // Get terrain speed modifier at current position
    const currentTile = grid.worldToGrid(this.x, this.y);
    const tile = grid.getTile(currentTile.row, currentTile.col);
    const terrainMultiplier = tile ? TERRAIN_CONFIG[tile.terrain].movementMultiplier : 1;

    const speed = this.config.speed * terrainMultiplier;
    const moveX = (dx / dist) * speed * dt;
    const moveY = (dy / dist) * speed * dt;

    // Don't overshoot
    if (Math.abs(moveX) > Math.abs(dx)) {
      this.x = targetX;
    } else {
      this.x += moveX;
    }
    if (Math.abs(moveY) > Math.abs(dy)) {
      this.y = targetY;
    } else {
      this.y += moveY;
    }
  }
}
