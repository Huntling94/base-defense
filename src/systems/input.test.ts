// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { InputManager } from './input';

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  return canvas;
}

describe('InputManager', () => {
  let input: InputManager;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = createCanvas();
    input = new InputManager(canvas);
  });

  describe('keyboard', () => {
    it('reports no keys down initially', () => {
      expect(input.isKeyDown('w')).toBe(false);
      expect(input.isKeyDown('a')).toBe(false);
    });

    it('tracks keydown events', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      expect(input.isKeyDown('w')).toBe(true);
      expect(input.isKeyDown('a')).toBe(false);
    });

    it('tracks keyup events', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      expect(input.isKeyDown('w')).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
      expect(input.isKeyDown('w')).toBe(false);
    });

    it('handles multiple simultaneous keys', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
      expect(input.isKeyDown('w')).toBe(true);
      expect(input.isKeyDown('d')).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
      expect(input.isKeyDown('w')).toBe(false);
      expect(input.isKeyDown('d')).toBe(true);
    });

    it('normalizes key names to lowercase', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'W' }));
      expect(input.isKeyDown('w')).toBe(true);
      expect(input.isKeyDown('W')).toBe(true);
    });

    it('clears all keys and mouse on blur', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      expect(input.isKeyDown('w')).toBe(true);

      window.dispatchEvent(new Event('blur'));
      expect(input.isKeyDown('w')).toBe(false);
      expect(input.isMouseDown()).toBe(false);
    });
  });

  describe('mouse', () => {
    it('tracks mouse position from mousemove', () => {
      const event = new MouseEvent('mousemove', { clientX: 150, clientY: 200 });
      // offsetX/offsetY are read-only getters; define them for testing
      Object.defineProperty(event, 'offsetX', { value: 150 });
      Object.defineProperty(event, 'offsetY', { value: 200 });
      canvas.dispatchEvent(event);
      expect(input.mouseScreenX).toBe(150);
      expect(input.mouseScreenY).toBe(200);
    });

    it('tracks mouse button down/up', () => {
      expect(input.isMouseDown(0)).toBe(false);

      canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      expect(input.isMouseDown(0)).toBe(true);

      canvas.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
      expect(input.isMouseDown(0)).toBe(false);
    });

    it('wasMousePressed returns true only until endFrame', () => {
      expect(input.wasMousePressed(0)).toBe(false);

      canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      expect(input.wasMousePressed(0)).toBe(true);

      input.endFrame();
      expect(input.wasMousePressed(0)).toBe(false);
      // Button is still held down
      expect(input.isMouseDown(0)).toBe(true);
    });

    it('tracks right mouse button separately', () => {
      canvas.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
      expect(input.isMouseDown(0)).toBe(false);
      expect(input.isMouseDown(2)).toBe(true);
    });
  });
});
