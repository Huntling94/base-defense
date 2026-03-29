import { clamp, lerp } from '../math';
import { WORLD_WIDTH, WORLD_HEIGHT } from './grid';
import type { InputManager } from './input';

const CAMERA_SMOOTHING = 8;
const CAMERA_PAN_SPEED = 500;

export type CameraMode = 'follow' | 'free';

export class Camera {
  x: number = 0;
  y: number = 0;
  mode: CameraMode = 'follow';
  private freeTargetX: number = 0;
  private freeTargetY: number = 0;

  update(
    playerX: number,
    playerY: number,
    canvasWidth: number,
    canvasHeight: number,
    dt: number,
    input: InputManager,
  ): void {
    if (input.isKeyDown(' ')) {
      this.mode = 'follow';
    }

    let panX = 0;
    let panY = 0;
    if (input.isKeyDown('arrowleft')) panX -= 1;
    if (input.isKeyDown('arrowright')) panX += 1;
    if (input.isKeyDown('arrowup')) panY -= 1;
    if (input.isKeyDown('arrowdown')) panY += 1;

    if (panX !== 0 || panY !== 0) {
      if (this.mode === 'follow') {
        this.freeTargetX = this.x + canvasWidth / 2;
        this.freeTargetY = this.y + canvasHeight / 2;
      }
      this.mode = 'free';
      this.freeTargetX += panX * CAMERA_PAN_SPEED * dt;
      this.freeTargetY += panY * CAMERA_PAN_SPEED * dt;
    }

    let desiredX: number;
    let desiredY: number;

    if (this.mode === 'follow') {
      desiredX = playerX - canvasWidth / 2;
      desiredY = playerY - canvasHeight / 2;
    } else {
      desiredX = this.freeTargetX - canvasWidth / 2;
      desiredY = this.freeTargetY - canvasHeight / 2;
    }

    const t = 1 - Math.exp(-CAMERA_SMOOTHING * dt);
    this.x = lerp(this.x, desiredX, t);
    this.y = lerp(this.y, desiredY, t);

    this.x = clamp(this.x, 0, Math.max(0, WORLD_WIDTH - canvasWidth));
    this.y = clamp(this.y, 0, Math.max(0, WORLD_HEIGHT - canvasHeight));
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return { x: worldX - this.x, y: worldY - this.y };
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return { x: screenX + this.x, y: screenY + this.y };
  }
}
