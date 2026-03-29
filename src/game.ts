import { Grid, WORLD_WIDTH, WORLD_HEIGHT, StructureKind } from './systems/grid';
import { Camera } from './systems/camera';
import { InputManager } from './systems/input';
import { PlacementSystem } from './systems/placement';
import { TowerManager } from './systems/tower-manager';
import { Spawner } from './systems/spawner';
import { findPath } from './systems/pathfinding';
import { Player } from './entities/player';
import type { Enemy } from './entities/enemy';
import type { Projectile } from './entities/projectile';
import { updateProjectile } from './entities/projectile';
import { GridRenderer } from './rendering/grid-renderer';
import { PlayerRenderer } from './rendering/player-renderer';
import { TowerRenderer } from './rendering/tower-renderer';
import { PlacementRenderer } from './rendering/placement-renderer';
import { EnemyRenderer } from './rendering/enemy-renderer';
import { ProjectileRenderer } from './rendering/projectile-renderer';
import { WallRenderer } from './rendering/wall-renderer';

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
  private placement: PlacementSystem;
  private towerManager: TowerManager;
  private spawner: Spawner;

  // Entities
  private player: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];

  // Renderers
  private gridRenderer: GridRenderer;
  private playerRenderer: PlayerRenderer;
  private towerRenderer: TowerRenderer;
  private placementRenderer: PlacementRenderer;
  private enemyRenderer: EnemyRenderer;
  private projectileRenderer: ProjectileRenderer;
  private wallRenderer: WallRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.grid = new Grid();
    this.camera = new Camera();
    this.input = new InputManager(canvas);
    this.placement = new PlacementSystem();
    this.towerManager = new TowerManager();
    this.spawner = new Spawner();

    // Spawn player at world center
    this.player = new Player(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);

    this.gridRenderer = new GridRenderer();
    this.playerRenderer = new PlayerRenderer();
    this.towerRenderer = new TowerRenderer();
    this.placementRenderer = new PlacementRenderer();
    this.enemyRenderer = new EnemyRenderer();
    this.projectileRenderer = new ProjectileRenderer();
    this.wallRenderer = new WallRenderer();
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
    this.placement.update(this.input, this.camera, this.grid);

    // Handle newly placed structure
    if (this.placement.placedThisFrame) {
      if (this.placement.lastPlacedCategory === 'tower') {
        this.towerManager.registerTower(
          this.placement.lastPlacedRow,
          this.placement.lastPlacedCol,
          this.placement.lastPlacedConfigIndex,
        );
      }

      // Mark all enemy paths as stale
      for (const enemy of this.enemies) {
        enemy.pathStale = true;
      }
    }

    // Spawn enemies
    this.spawner.update(dt, this.enemies, this.grid, this.player);

    // Update enemies
    const playerTile = this.grid.worldToGrid(this.player.x, this.player.y);
    for (const enemy of this.enemies) {
      if (enemy.pathStale || !enemy.hasPath()) {
        const enemyTile = this.grid.worldToGrid(enemy.x, enemy.y);
        const path = findPath(this.grid, enemyTile, playerTile);
        if (path) {
          enemy.setPath(path);
        } else {
          enemy.pathStale = false;
        }
      }
      enemy.update(dt, this.grid);
    }

    // Tower combat
    this.towerManager.update(dt, this.enemies, this.projectiles, this.grid);

    // Update projectiles
    for (const proj of this.projectiles) {
      updateProjectile(proj, dt, this.enemies);
    }

    // Structure destruction cleanup
    this.cleanupDeadStructures();

    // Cleanup: remove dead projectiles and dead/arrived enemies
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.enemies = this.enemies.filter((e) => !e.arrived && e.health > 0);
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
    this.towerRenderer.render(ctx, this.grid, camera, canvas.width, canvas.height);
    this.wallRenderer.render(ctx, this.grid, camera, canvas.width, canvas.height);
    this.placementRenderer.render(ctx, this.placement);
    this.projectileRenderer.render(ctx, this.projectiles);
    this.enemyRenderer.render(ctx, this.enemies);
    this.playerRenderer.render(ctx, this.player);

    // Restore to screen space
    ctx.restore();

    // Screen-space UI (unaffected by camera)
    this.renderFps();
    this.renderCameraMode();
    this.renderSelectedTower();
    this.renderEnemyCount();
  }

  private cleanupDeadStructures(): void {
    let structureDestroyed = false;

    // Scan visible area for dead structures (could optimize with a structure list later)
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const tile = this.grid.getTile(r, c)!;
        if (!tile.structureRef) continue;

        const structure = tile.structureRef.structure;
        if (structure.health > 0) continue;

        // Remove from grid
        if (structure.kind === StructureKind.Tower) {
          this.towerManager.removeTower(r, c);
        }
        tile.structureRef = null;
        structureDestroyed = true;
      }
    }

    if (structureDestroyed) {
      for (const enemy of this.enemies) {
        enemy.pathStale = true;
      }
    }
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

  private renderSelectedTower(): void {
    const name = this.placement.getSelectedName();
    if (!name) return;

    const { ctx } = this;
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Selected: ${name} (Esc to cancel)`, 8, this.canvas.height - 8);
  }

  private renderEnemyCount(): void {
    const { ctx } = this;
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(`Enemies: ${this.enemies.length}`, this.canvas.width - 8, 8);
  }
}
