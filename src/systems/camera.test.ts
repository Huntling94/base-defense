// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { Camera } from './camera';
import { InputManager } from './input';
import { WORLD_WIDTH, WORLD_HEIGHT } from './grid';

function pressKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function releaseKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { key }));
}

describe('Camera', () => {
  let camera: Camera;
  let input: InputManager;
  const canvasWidth = 800;
  const canvasHeight = 600;

  beforeEach(() => {
    camera = new Camera();
    input = new InputManager();
  });

  describe('coordinate conversion', () => {
    it('worldToScreen subtracts camera position', () => {
      camera.x = 100;
      camera.y = 200;
      const screen = camera.worldToScreen(300, 400);
      expect(screen.x).toBe(200);
      expect(screen.y).toBe(200);
    });

    it('screenToWorld adds camera position', () => {
      camera.x = 100;
      camera.y = 200;
      const world = camera.screenToWorld(200, 200);
      expect(world.x).toBe(300);
      expect(world.y).toBe(400);
    });

    it('round-trip conversion is lossless', () => {
      camera.x = 150;
      camera.y = 300;
      const world = camera.screenToWorld(400, 250);
      const screen = camera.worldToScreen(world.x, world.y);
      expect(screen.x).toBeCloseTo(400);
      expect(screen.y).toBeCloseTo(250);
    });
  });

  describe('follow mode', () => {
    it('starts in follow mode', () => {
      expect(camera.mode).toBe('follow');
    });

    it('moves toward player position', () => {
      const playerX = WORLD_WIDTH / 2;
      const playerY = WORLD_HEIGHT / 2;

      // Run several frames to let camera converge
      for (let i = 0; i < 60; i++) {
        camera.update(playerX, playerY, canvasWidth, canvasHeight, 1 / 60, input);
      }

      // Camera should center on player
      const expectedX = playerX - canvasWidth / 2;
      const expectedY = playerY - canvasHeight / 2;
      expect(camera.x).toBeCloseTo(expectedX, 0);
      expect(camera.y).toBeCloseTo(expectedY, 0);
    });
  });

  describe('clamping', () => {
    it('clamps to zero at top-left corner', () => {
      camera.update(0, 0, canvasWidth, canvasHeight, 1, input);
      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
    });

    it('clamps at bottom-right corner', () => {
      camera.update(WORLD_WIDTH, WORLD_HEIGHT, canvasWidth, canvasHeight, 1, input);
      expect(camera.x).toBeLessThanOrEqual(WORLD_WIDTH - canvasWidth);
      expect(camera.y).toBeLessThanOrEqual(WORLD_HEIGHT - canvasHeight);
    });

    it('handles canvas larger than world', () => {
      camera.update(500, 500, WORLD_WIDTH + 100, WORLD_HEIGHT + 100, 1, input);
      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
    });
  });

  describe('free mode', () => {
    it('switches to free mode when arrow keys are pressed', () => {
      pressKey('ArrowRight');
      camera.update(500, 500, canvasWidth, canvasHeight, 1 / 60, input);
      expect(camera.mode).toBe('free');
      releaseKey('ArrowRight');
    });

    it('returns to follow mode when Space is pressed', () => {
      pressKey('ArrowRight');
      camera.update(500, 500, canvasWidth, canvasHeight, 1 / 60, input);
      releaseKey('ArrowRight');
      expect(camera.mode).toBe('free');

      pressKey(' ');
      camera.update(500, 500, canvasWidth, canvasHeight, 1 / 60, input);
      expect(camera.mode).toBe('follow');
      releaseKey(' ');
    });

    it('pans independently of player position', () => {
      // Place player at center
      const playerX = WORLD_WIDTH / 2;
      const playerY = WORLD_HEIGHT / 2;

      // Let camera settle on player
      for (let i = 0; i < 60; i++) {
        camera.update(playerX, playerY, canvasWidth, canvasHeight, 1 / 60, input);
      }
      const settledX = camera.x;

      // Pan right
      pressKey('ArrowRight');
      for (let i = 0; i < 30; i++) {
        camera.update(playerX, playerY, canvasWidth, canvasHeight, 1 / 60, input);
      }
      releaseKey('ArrowRight');

      // Camera should have moved right, away from player
      expect(camera.x).toBeGreaterThan(settledX);
    });
  });
});
