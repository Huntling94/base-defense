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
const ATTACK_RANGE = TILE_SIZE * 0.8;
const ATTACK_DAMAGE = 10; // damage per second to structures

export class Enemy {
  x: number;
  y: number;
  health: number;
  readonly config: EnemyConfig;
  private path: GridCoord[] = [];
  private pathIndex: number = 0;
  arrived: boolean = false;
  pathStale: boolean = false;
  attackTarget: GridCoord | null = null;

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
    this.attackTarget = null;
  }

  hasPath(): boolean {
    return this.path.length > 0 && this.pathIndex < this.path.length;
  }

  update(dt: number, grid: Grid): void {
    if (this.arrived || this.health <= 0) return;

    // If has a valid path, follow it
    if (this.hasPath() && !this.pathStale) {
      this.followPath(dt, grid);
      return;
    }

    // No path — attack nearest structure
    if (this.attackTarget) {
      // Check if target structure still exists
      const tile = grid.getTile(this.attackTarget.row, this.attackTarget.col);
      if (!tile || !tile.structureRef) {
        this.attackTarget = null;
        this.pathStale = true;
        return;
      }
      this.moveTowardAndAttack(dt, grid);
    } else {
      this.attackTarget = this.findNearestStructure(grid);
    }
  }

  private followPath(dt: number, grid: Grid): void {
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

    const currentTile = grid.worldToGrid(this.x, this.y);
    const tile = grid.getTile(currentTile.row, currentTile.col);
    const terrainMultiplier = tile ? TERRAIN_CONFIG[tile.terrain].movementMultiplier : 1;

    const speed = this.config.speed * terrainMultiplier;
    const moveX = (dx / dist) * speed * dt;
    const moveY = (dy / dist) * speed * dt;

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

  private moveTowardAndAttack(dt: number, grid: Grid): void {
    if (!this.attackTarget) return;

    const targetX = this.attackTarget.col * TILE_SIZE + TILE_SIZE / 2;
    const targetY = this.attackTarget.row * TILE_SIZE + TILE_SIZE / 2;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= ATTACK_RANGE) {
      // Attack the structure
      const tile = grid.getTile(this.attackTarget.row, this.attackTarget.col);
      if (tile && tile.structureRef) {
        tile.structureRef.structure.health -= ATTACK_DAMAGE * dt;
      }
    } else {
      // Move toward target
      const speed = this.config.speed;
      const moveX = (dx / dist) * speed * dt;
      const moveY = (dy / dist) * speed * dt;

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

  findNearestStructure(grid: Grid): GridCoord | null {
    const myTile = grid.worldToGrid(this.x, this.y);
    let bestCoord: GridCoord | null = null;
    let bestDistSq = Infinity;

    // Scan grid for nearest structure
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const tile = grid.getTile(r, c)!;
        if (!tile.structureRef) continue;

        const dr = r - myTile.row;
        const dc = c - myTile.col;
        const distSq = dr * dr + dc * dc;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestCoord = { row: r, col: c };
        }
      }
    }
    return bestCoord;
  }
}
