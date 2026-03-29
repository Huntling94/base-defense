# BRF-004: Player Movement + Camera Follow

## Objective

Add a player character that moves with WASD in continuous world space, and a camera that follows the player so the viewport scrolls across the grid world.

**What it delivers:** A visible player entity on the grid, keyboard-driven movement, and a camera that keeps the player centered while clamping to world edges. The grid renderer updates to only draw visible tiles.

**What it doesn't deliver:** No player combat, no collision with structures, no terrain speed effects. Just movement and camera.

**Why now:** The grid exists but there's no way to see most of it — the world is 2048×1536 but the canvas only shows the top-left corner. The player + camera unlocks exploration of the whole map, and is required before mouse interaction (F-005) since clicks need screen→world conversion via the camera offset.

## Concepts Introduced

### Camera as a Viewport into World Space

You already built a camera in Bullet Survivors with follow, shake, and smoothing. This project adds a twist: **the camera must translate between three coordinate spaces**, not two.

In Bullet Survivors, you had:

- **World space** — where entities live
- **Screen space** — where pixels draw on the canvas

Now with the grid, there are three:

- **World space** — continuous pixel coordinates. Player at `(500.3, 720.1)`.
- **Grid space** — discrete tile coordinates. Tile `(22, 15)`.
- **Screen space** — what the player sees on their monitor. Pixel `(400, 300)` on screen.

The camera's job is converting between world and screen:

- `worldToScreen(worldX, worldY)` = `(worldX - camera.x, worldY - camera.y)` — used when rendering
- `screenToWorld(screenX, screenY)` = `(screenX + camera.x, screenY + camera.y)` — used when the player clicks (F-005)

The camera position represents the **top-left corner of the viewport** in world space. When the camera is at `(200, 100)`, the screen shows world pixels from `(200, 100)` to `(200 + canvasWidth, 100 + canvasHeight)`.

### Canvas translate() — The Efficient Way to Offset

Rather than subtracting the camera offset from every single draw call, Canvas 2D has `ctx.translate(-camera.x, -camera.y)`. This shifts the entire coordinate system so all subsequent draw calls render at the correct screen position automatically. You `save()` the context state before, `translate()`, draw everything in world coordinates, then `restore()` to reset. The FPS counter and UI draw after the restore — they're in screen space, not world space.

This is the standard pattern in 2D game engines. It means the grid renderer doesn't need to know about the camera at all — it just draws at world coordinates, and the canvas transform handles the offset.

### Viewport Culling

The grid is 64×48 tiles = 3072 tiles. The screen might show ~30×20 = 600 tiles at a time. Drawing all 3072 every frame wastes effort. **Viewport culling** means calculating which tiles are visible and only drawing those. The camera position tells us the visible range: `startCol = floor(camera.x / TILE_SIZE)`, `endCol = ceil((camera.x + canvasWidth) / TILE_SIZE)`, and similarly for rows.

This is a simple optimization that scales well — even if the world were 10x bigger, we'd still only draw what's on screen.

## Design Decisions

### DD-1: Player as a Continuous-Space Entity

**Problem:** Should the player snap to tiles or move freely?

**Decision:** Free continuous movement in world space. The player has an `(x, y)` position, not a `(row, col)`.

**Rationale:** The player is a combat unit (hybrid fighter + builder), not a cursor. Smooth WASD movement feels responsive and matches the Bullet Survivors experience. The player queries the grid for context (which tile am I on?) but isn't constrained to tile centers.

**Consequence:** Player movement, collision, and rendering all use world coordinates. Grid snapping only applies to structure placement (F-005), not player position.

### DD-2: Camera Follow with Smoothing

**Problem:** Should the camera snap instantly to the player or lag behind?

**Decision:** Smooth follow using lerp, same pattern as Bullet Survivors.

**Rationale:** Instant follow feels robotic. Lerp-based smoothing gives a cinematic feel where the camera "catches up" to the player. Will already understands this pattern. The smoothing factor is a tunable constant.

**Consequence:** Camera position is updated each frame: `camera.x = lerp(camera.x, target.x, smoothing * dt)`. The `* dt` makes it frame-rate independent.

### DD-3: Camera Clamping to World Bounds

**Problem:** What happens when the player walks to the edge of the world?

**Decision:** Clamp camera so it never shows space outside the world. Player movement is also clamped to world bounds.

**Rationale:** Showing empty space beyond the grid is ugly and confusing. Clamping is simple and gives a clear "edge of the world" feel. The player shouldn't walk off the map either.

**Consequence:** Camera clamp: `camera.x` stays in `[0, WORLD_WIDTH - canvasWidth]`. Player clamp: position stays within `[0, WORLD_WIDTH]` and `[0, WORLD_HEIGHT]`.

### DD-4: Input System Design

**Problem:** How to track which keys are held down?

**Decision:** A simple `InputManager` class that tracks key state via `keydown`/`keyup` events. Exposes `isKeyDown(key)` method.

**Rationale:** Polling key state each frame (not reacting to events) is the standard game input pattern. It handles simultaneous keys naturally — holding W+D moves diagonally. We'll reuse this for future inputs (space to shoot, number keys for tower selection, etc.).

**Consequence:** Movement code reads `input.isKeyDown('w')` each frame, not event callbacks. Diagonal movement needs normalization to prevent faster diagonal speed (the classic `sqrt(2)` problem).

### DD-5: Free Camera Mode for Scouting

**Problem:** The player needs to scout the map — check defenses, plan builds, see incoming enemies — without physically walking the player character there (which exposes them to danger).

**Decision:** Two camera modes: **follow** (default) and **free look**. Arrow keys pan the camera independently of the player. Space snaps the camera back to follow mode.

**Rationale:** This is how They Are Billions and RimWorld handle it — the camera is its own entity that defaults to following the player but can detach for scouting. Arrow keys for camera / WASD for player is a clean split with no conflicts. Space as the "snap back" key is intuitive and conventional.

**Consequence:** The Camera class gets a `mode` field (`'follow' | 'free'`). In follow mode, it tracks the player. In free mode, arrow keys move the camera target directly. Pressing Space sets mode back to follow. The player keeps moving in the world regardless of camera mode — the camera is just a viewport.

## File Changes

| File                               | Action                                                                      | Risk                                         |
| ---------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| `src/systems/input.ts`             | **Create** — InputManager with key tracking                                 | Low — simple utility                         |
| `src/systems/input.test.ts`        | **Create** — tests for key state tracking                                   | Low                                          |
| `src/systems/camera.ts`            | **Create** — Camera with follow, smoothing, clamping, coordinate conversion | Medium — coordinate conversion is a contract |
| `src/systems/camera.test.ts`       | **Create** — tests for clamping, coordinate conversion                      | Low                                          |
| `src/entities/player.ts`           | **Create** — Player entity with position and movement                       | Low — implementation detail                  |
| `src/entities/player.test.ts`      | **Create** — tests for movement, clamping, diagonal normalization           | Low                                          |
| `src/rendering/player-renderer.ts` | **Create** — draws the player                                               | Low — visual only                            |
| `src/rendering/grid-renderer.ts`   | **Modify** — add viewport culling                                           | Low                                          |
| `src/game.ts`                      | **Modify** — wire player, camera, input into update/render                  | Low                                          |

## Implementation Plan

### Commit 1: Input manager

- Create `InputManager` with `keydown`/`keyup` listeners and `isKeyDown(key)` method
- Tests for key state tracking

### Commit 2: Camera system

- Create `Camera` class with follow and free-look modes
- Arrow keys pan camera independently (free mode), Space snaps back to player (follow mode)
- Smooth lerp in both modes, world bounds clamping
- `worldToScreen()` and `screenToWorld()` conversion methods
- Tests for clamping, coordinate conversion, and mode switching

### Commit 3: Player entity

- Create `Player` with world-space position and `update(dt, input)` method
- WASD movement with speed constant
- Diagonal normalization
- World bounds clamping
- Tests for movement and clamping

### Commit 4: Rendering + Game integration

- Create `PlayerRenderer` — draws a simple shape at the player's world position
- Update `GridRenderer` with viewport culling
- Wire everything into `Game`: create player/camera/input, update each frame, render with `ctx.translate()`
- Apply camera transform before world rendering, restore before UI rendering

## Test Strategy

- **InputManager:** Simulate keydown/keyup events, verify `isKeyDown` state changes correctly
- **Camera clamping:** Set camera to various positions, verify it clamps to world bounds for given canvas dimensions
- **Camera coordinate conversion:** Round-trip `worldToScreen(screenToWorld(x, y))` returns same values
- **Camera modes:** Verify arrow key input switches to free mode, Space returns to follow mode
- **Player movement:** Given input state and dt, verify position changes correctly. Verify diagonal normalization. Verify world bounds clamping.

## Risks & Mitigations

| Risk                                     | Severity | Likelihood | Mitigation                                                                        |
| ---------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------- |
| Camera jitter from floating-point drift  | Low      | Low        | Floor camera position to whole pixels before rendering to avoid sub-pixel shimmer |
| Diagonal movement feels too fast/slow    | Low      | Medium     | Normalize direction vector. Speed constant is easily tunable.                     |
| Grid rendering breaks with camera offset | Medium   | Low        | Viewport culling uses camera position — test with camera at various positions     |

## Acceptance Criteria

1. Player renders as a visible shape on the grid
2. WASD moves the player smoothly in all 8 directions
3. Diagonal movement is the same speed as cardinal movement
4. Camera follows the player with smooth lerp
5. Camera clamps to world edges — no empty space visible
6. Player cannot move outside world bounds
7. Grid only renders visible tiles (viewport culling)
8. FPS counter stays in screen space (top-left corner, unaffected by camera)
9. Arrow keys pan camera freely (free-look mode)
10. Space snaps camera back to follow the player
11. All tests pass, `npm run build` passes

## Solution Design

```typescript
// src/systems/input.ts

export class InputManager {
  private keys: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key);
  }
}
```

```typescript
// src/systems/camera.ts

import { clamp, lerp } from '../math';
import { WORLD_WIDTH, WORLD_HEIGHT } from './grid';
import type { InputManager } from './input';

const CAMERA_SMOOTHING = 8; // higher = faster catch-up
const CAMERA_PAN_SPEED = 500; // pixels per second in free mode

export type CameraMode = 'follow' | 'free';

export class Camera {
  x: number = 0;
  y: number = 0;
  mode: CameraMode = 'follow';
  private freeTargetX: number = 0;
  private freeTargetY: number = 0;

  /** Update camera each frame. In follow mode, tracks the player. In free mode, arrow keys pan. */
  update(
    playerX: number,
    playerY: number,
    canvasWidth: number,
    canvasHeight: number,
    dt: number,
    input: InputManager,
  ): void {
    // Space snaps back to follow mode
    if (input.isKeyDown(' ')) {
      this.mode = 'follow';
    }

    // Arrow keys switch to free mode and pan
    let panX = 0;
    let panY = 0;
    if (input.isKeyDown('arrowleft')) panX -= 1;
    if (input.isKeyDown('arrowright')) panX += 1;
    if (input.isKeyDown('arrowup')) panY -= 1;
    if (input.isKeyDown('arrowdown')) panY += 1;

    if (panX !== 0 || panY !== 0) {
      if (this.mode === 'follow') {
        // Detach: initialize free target from current camera center
        this.freeTargetX = this.x + canvasWidth / 2;
        this.freeTargetY = this.y + canvasHeight / 2;
      }
      this.mode = 'free';
      this.freeTargetX += panX * CAMERA_PAN_SPEED * dt;
      this.freeTargetY += panY * CAMERA_PAN_SPEED * dt;
    }

    // Determine desired camera position based on mode
    let desiredX: number;
    let desiredY: number;

    if (this.mode === 'follow') {
      desiredX = playerX - canvasWidth / 2;
      desiredY = playerY - canvasHeight / 2;
    } else {
      desiredX = this.freeTargetX - canvasWidth / 2;
      desiredY = this.freeTargetY - canvasHeight / 2;
    }

    // Smooth follow (same smoothing in both modes for consistent feel)
    const t = 1 - Math.exp(-CAMERA_SMOOTHING * dt);
    this.x = lerp(this.x, desiredX, t);
    this.y = lerp(this.y, desiredY, t);

    // Clamp to world bounds
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
```

```typescript
// src/entities/player.ts

import { clamp } from '../math';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../systems/grid';
import type { InputManager } from '../systems/input';

const PLAYER_SPEED = 200; // pixels per second
const PLAYER_RADIUS = 12;

export class Player {
  x: number;
  y: number;
  readonly radius: number = PLAYER_RADIUS;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number, input: InputManager): void {
    let dx = 0;
    let dy = 0;

    if (input.isKeyDown('w')) dy -= 1;
    if (input.isKeyDown('s')) dy += 1;
    if (input.isKeyDown('a')) dx -= 1;
    if (input.isKeyDown('d')) dx += 1;

    // Normalize diagonal movement
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    this.x += dx * PLAYER_SPEED * dt;
    this.y += dy * PLAYER_SPEED * dt;

    // Clamp to world bounds
    this.x = clamp(this.x, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    this.y = clamp(this.y, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
  }
}
```

```typescript
// src/rendering/player-renderer.ts

export class PlayerRenderer {
  render(ctx: CanvasRenderingContext2D, player: Player): void {
    // Draw a simple circle at the player's world position
    // (camera translate is already applied by Game)
  }
}
```

```typescript
// src/rendering/grid-renderer.ts — viewport culling addition

render(ctx: CanvasRenderingContext2D, grid: Grid, camera: Camera, canvasWidth: number, canvasHeight: number): void {
  // Calculate visible tile range from camera position
  const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
  const endCol = Math.min(grid.cols, Math.ceil((camera.x + canvasWidth) / TILE_SIZE));
  const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
  const endRow = Math.min(grid.rows, Math.ceil((camera.y + canvasHeight) / TILE_SIZE));

  // Only iterate visible tiles
  for (let r = startRow; r < endRow; r++) {
    for (let c = startCol; c < endCol; c++) {
      // ... same tile drawing logic, but only for visible range
    }
  }
}
```
