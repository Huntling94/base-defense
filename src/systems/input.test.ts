// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { InputManager } from './input';

// InputManager listens to window events, so we simulate them directly.

describe('InputManager', () => {
  let input: InputManager;

  beforeEach(() => {
    input = new InputManager();
  });

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

  it('clears all keys on blur', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(input.isKeyDown('w')).toBe(true);
    expect(input.isKeyDown('a')).toBe(true);

    window.dispatchEvent(new Event('blur'));
    expect(input.isKeyDown('w')).toBe(false);
    expect(input.isKeyDown('a')).toBe(false);
  });
});
