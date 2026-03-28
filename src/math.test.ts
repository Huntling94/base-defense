import { describe, it, expect } from 'vitest';
import { clamp, lerp } from './math';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });

  it('clamps to max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('returns a at t=0', () => {
    expect(lerp(0, 10, 0)).toBe(0);
  });

  it('returns b at t=1', () => {
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});
