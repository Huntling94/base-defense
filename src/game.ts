import { Grid, WORLD_WIDTH, WORLD_HEIGHT } from './systems/grid';
import { Camera } from './systems/camera';
import { InputManager } from './systems/input';
import { Player } from './entities/player';
import { GridRenderer } from './rendering/grid-renderer';
import { PlayerRenderer } from './rendering/player-renderer';

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

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime: number = 0;
  private firstFrame: boolean = true;
  private fpsSamples: number[] = [];
  private currentFps: number = 0;

  // Systems
  private grid: Grid;
  private camera: Camera;
  private input: InputManager;

  // Entities
  private player: Player;

  // Renderers
  private gridRenderer: GridRenderer;
  private playerRenderer: PlayerRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.grid = new Grid();
    this.camera = new Camera();
    this.input = new InputManager(canvas);

    // Spawn player at world center
    this.player = new Player(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);

    this.gridRenderer = new GridRenderer();
    this.playerRenderer = new PlayerRenderer();
  }

  start(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame((time) => this.loop(time));
  }

  private loop(currentTime: number): void {
    if (this.firstFrame) {
      this.lastTime = currentTime;
      this.firstFrame = false;
    }

    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    const dt = capDeltaTime(rawDt);

    this.update(dt);
    this.render();
    this.currentFps = updateFpsSamples(this.fpsSamples, dt);
    this.input.endFrame();

    requestAnimationFrame((time) => this.loop(time));
  }

  private update(dt: number): void {
    this.player.update(dt, this.input);
    this.camera.update(
      this.player.x,
      this.player.y,
      this.canvas.width,
      this.canvas.height,
      dt,
      this.input,
    );
  }

  private render(): void {
    const { ctx, canvas, camera } = this;

    // Clear entire canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform — everything below draws in world space
    ctx.save();
    ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

    // World-space rendering
    this.gridRenderer.render(ctx, this.grid, camera, canvas.width, canvas.height);
    this.playerRenderer.render(ctx, this.player);

    // Restore to screen space
    ctx.restore();

    // Screen-space UI (unaffected by camera)
    this.renderFps();
    this.renderCameraMode();
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

  private renderCameraMode(): void {
    if (this.camera.mode === 'free') {
      const { ctx } = this;
      ctx.fillStyle = '#ffaa00';
      ctx.font = '14px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('FREE CAM (Space to snap back)', 8, 28);
    }
  }
}
