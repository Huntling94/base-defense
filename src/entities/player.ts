import { clamp } from '../math';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../systems/grid';
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

  update(dt: number, input: InputManager): void {
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

    this.x = clamp(this.x, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    this.y = clamp(this.y, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
  }
}
