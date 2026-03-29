import { clamp } from '../math';
import { WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE } from '../systems/grid';
import type { Grid } from '../systems/grid';
import type { InputManager } from '../systems/input';

export const PLAYER_SPEED = 200;
export const PLAYER_RADIUS = 12;

export class Player {
  x: number;
  y: number;
  readonly radius: number = PLAYER_RADIUS;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number, input: InputManager, grid: Grid): void {
    let dx = 0;
    let dy = 0;

    if (input.isKeyDown('w')) dy -= 1;
    if (input.isKeyDown('s')) dy += 1;
    if (input.isKeyDown('a')) dx -= 1;
    if (input.isKeyDown('d')) dx += 1;

    // Normalize diagonal movement to prevent sqrt(2) speed boost
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    this.x += dx * PLAYER_SPEED * dt;
    this.y += dy * PLAYER_SPEED * dt;

    // Clamp to world bounds
    this.x = clamp(this.x, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    this.y = clamp(this.y, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);

    // Resolve collisions with structures
    this.resolveStructureCollisions(grid);
  }

  private resolveStructureCollisions(grid: Grid): void {
    // Check tiles that the player's bounding box overlaps
    const minCol = Math.floor((this.x - this.radius) / TILE_SIZE);
    const maxCol = Math.floor((this.x + this.radius) / TILE_SIZE);
    const minRow = Math.floor((this.y - this.radius) / TILE_SIZE);
    const maxRow = Math.floor((this.y + this.radius) / TILE_SIZE);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (!grid.isInBounds(r, c) || !grid.isOccupied(r, c)) continue;

        // Tile AABB
        const tileLeft = c * TILE_SIZE;
        const tileRight = tileLeft + TILE_SIZE;
        const tileTop = r * TILE_SIZE;
        const tileBottom = tileTop + TILE_SIZE;

        // Find closest point on tile AABB to player center
        const closestX = clamp(this.x, tileLeft, tileRight);
        const closestY = clamp(this.y, tileTop, tileBottom);

        const distX = this.x - closestX;
        const distY = this.y - closestY;
        const distSq = distX * distX + distY * distY;

        if (distSq < this.radius * this.radius && distSq > 0) {
          // Push player out
          const dist = Math.sqrt(distSq);
          const overlap = this.radius - dist;
          this.x += (distX / dist) * overlap;
          this.y += (distY / dist) * overlap;
        }
      }
    }
  }
}
