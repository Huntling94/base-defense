// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { Player, PLAYER_SPEED, PLAYER_RADIUS } from './player';
import { InputManager } from '../systems/input';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../systems/grid';

function pressKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function releaseKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { key }));
}

describe('Player', () => {
  let player: Player;
  let input: InputManager;

  beforeEach(() => {
    player = new Player(500, 500);
    input = new InputManager();
  });

  describe('movement', () => {
    it('moves right when D is held', () => {
      pressKey('d');
      const startX = player.x;
      player.update(1, input);
      expect(player.x).toBe(startX + PLAYER_SPEED);
      expect(player.y).toBe(500);
      releaseKey('d');
    });

    it('moves left when A is held', () => {
      pressKey('a');
      const startX = player.x;
      player.update(1, input);
      expect(player.x).toBe(startX - PLAYER_SPEED);
      releaseKey('a');
    });

    it('moves up when W is held', () => {
      pressKey('w');
      const startY = player.y;
      player.update(1, input);
      expect(player.y).toBe(startY - PLAYER_SPEED);
      releaseKey('w');
    });

    it('moves down when S is held', () => {
      pressKey('s');
      const startY = player.y;
      player.update(1, input);
      expect(player.y).toBe(startY + PLAYER_SPEED);
      releaseKey('s');
    });

    it('does not move when no keys are held', () => {
      player.update(1, input);
      expect(player.x).toBe(500);
      expect(player.y).toBe(500);
    });

    it('scales movement by delta time', () => {
      pressKey('d');
      player.update(0.5, input);
      expect(player.x).toBe(500 + PLAYER_SPEED * 0.5);
      releaseKey('d');
    });
  });

  describe('diagonal normalization', () => {
    it('diagonal speed equals cardinal speed', () => {
      const cardinalPlayer = new Player(500, 500);
      const diagonalPlayer = new Player(500, 500);

      // Cardinal: just right
      pressKey('d');
      cardinalPlayer.update(1, input);
      releaseKey('d');
      const cardinalDist = Math.abs(cardinalPlayer.x - 500);

      // Diagonal: right + down
      pressKey('d');
      pressKey('s');
      diagonalPlayer.update(1, input);
      releaseKey('d');
      releaseKey('s');
      const dx = diagonalPlayer.x - 500;
      const dy = diagonalPlayer.y - 500;
      const diagonalDist = Math.sqrt(dx * dx + dy * dy);

      expect(diagonalDist).toBeCloseTo(cardinalDist, 5);
    });
  });

  describe('world bounds clamping', () => {
    it('clamps to left edge', () => {
      player.x = 0;
      pressKey('a');
      player.update(1, input);
      expect(player.x).toBe(PLAYER_RADIUS);
      releaseKey('a');
    });

    it('clamps to right edge', () => {
      player.x = WORLD_WIDTH;
      pressKey('d');
      player.update(1, input);
      expect(player.x).toBe(WORLD_WIDTH - PLAYER_RADIUS);
      releaseKey('d');
    });

    it('clamps to top edge', () => {
      player.y = 0;
      pressKey('w');
      player.update(1, input);
      expect(player.y).toBe(PLAYER_RADIUS);
      releaseKey('w');
    });

    it('clamps to bottom edge', () => {
      player.y = WORLD_HEIGHT;
      pressKey('s');
      player.update(1, input);
      expect(player.y).toBe(WORLD_HEIGHT - PLAYER_RADIUS);
      releaseKey('s');
    });
  });
});
