export const MAX_DELTA_TIME = 0.1;
export const FPS_SAMPLE_COUNT = 60;

/** Cap delta time to prevent spiral-of-death when tab is backgrounded. */
export function capDeltaTime(rawDt: number): number {
  return Math.min(rawDt, MAX_DELTA_TIME);
}

/** Calculate rolling average FPS from a samples array. Mutates the array. */
export function updateFpsSamples(samples: number[], dt: number): number {
  if (dt <= 0) return samples.length > 0 ? average(samples) : 0;

  samples.push(1 / dt);
  if (samples.length > FPS_SAMPLE_COUNT) {
    samples.shift();
  }

  return average(samples);
}

function average(arr: number[]): number {
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

import { Grid } from './systems/grid';
import { GridRenderer } from './rendering/grid-renderer';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime: number = 0;
  private firstFrame: boolean = true;
  private fpsSamples: number[] = [];
  private currentFps: number = 0;
  private grid: Grid;
  private gridRenderer: GridRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.grid = new Grid();
    this.gridRenderer = new GridRenderer();
  }

  start(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame((time) => this.loop(time));
  }

  private loop(currentTime: number): void {
    // First frame: just record the time, don't simulate a huge dt
    if (this.firstFrame) {
      this.lastTime = currentTime;
      this.firstFrame = false;
    }

    // currentTime is in milliseconds from requestAnimationFrame
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Cap dt to prevent spiral-of-death (e.g., tab was backgrounded)
    const dt = capDeltaTime(rawDt);

    this.update(dt);
    this.render();
    this.currentFps = updateFpsSamples(this.fpsSamples, dt);

    requestAnimationFrame((time) => this.loop(time));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private update(_dt: number): void {
    // Future: update all systems (grid, entities, economy, etc.)
  }

  private render(): void {
    const { ctx, canvas } = this;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render grid
    this.gridRenderer.render(ctx, this.grid);

    // FPS counter (always last — on top of everything)
    this.renderFps();
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private renderFps(): void {
    const { ctx } = this;
    ctx.fillStyle = '#00ff00';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`FPS: ${Math.round(this.currentFps)}`, 8, 8);
  }
}
