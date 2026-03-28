import { describe, it, expect } from 'vitest';
import { capDeltaTime, updateFpsSamples, MAX_DELTA_TIME, FPS_SAMPLE_COUNT } from './game';

describe('capDeltaTime', () => {
  it('passes through normal frame times', () => {
    expect(capDeltaTime(0.016)).toBeCloseTo(0.016);
  });

  it('caps large delta times at MAX_DELTA_TIME', () => {
    expect(capDeltaTime(0.5)).toBe(MAX_DELTA_TIME);
    expect(capDeltaTime(2.0)).toBe(MAX_DELTA_TIME);
  });

  it('handles zero dt', () => {
    expect(capDeltaTime(0)).toBe(0);
  });

  it('handles exactly MAX_DELTA_TIME', () => {
    expect(capDeltaTime(MAX_DELTA_TIME)).toBe(MAX_DELTA_TIME);
  });
});

describe('updateFpsSamples', () => {
  it('returns fps for a single sample', () => {
    const samples: number[] = [];
    const fps = updateFpsSamples(samples, 1 / 60);
    expect(fps).toBeCloseTo(60);
    expect(samples.length).toBe(1);
  });

  it('returns rolling average across multiple samples', () => {
    const samples: number[] = [];
    // 3 frames at 60fps, then 1 frame at 30fps
    updateFpsSamples(samples, 1 / 60);
    updateFpsSamples(samples, 1 / 60);
    updateFpsSamples(samples, 1 / 60);
    const fps = updateFpsSamples(samples, 1 / 30);

    // Average of [60, 60, 60, 30] = 52.5
    expect(fps).toBeCloseTo(52.5);
  });

  it('limits samples to FPS_SAMPLE_COUNT', () => {
    const samples: number[] = [];
    for (let i = 0; i < FPS_SAMPLE_COUNT + 20; i++) {
      updateFpsSamples(samples, 1 / 60);
    }
    expect(samples.length).toBe(FPS_SAMPLE_COUNT);
  });

  it('ignores zero dt', () => {
    const samples: number[] = [];
    updateFpsSamples(samples, 1 / 60);
    const fps = updateFpsSamples(samples, 0);
    // Should return existing average, not push Infinity
    expect(fps).toBeCloseTo(60);
    expect(samples.length).toBe(1);
  });

  it('ignores negative dt', () => {
    const samples: number[] = [];
    const fps = updateFpsSamples(samples, -0.016);
    expect(fps).toBe(0);
    expect(samples.length).toBe(0);
  });
});
