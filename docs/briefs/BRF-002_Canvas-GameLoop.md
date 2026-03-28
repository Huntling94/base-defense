# BRF-002: Canvas + Game Loop with Delta Time

## Objective

Build the core game loop with proper delta time, canvas resizing, and an FPS counter. This is the foundation every future feature depends on — update/render separation, consistent timing, and a responsive canvas.

**What it delivers:** A running game loop that clears and redraws every frame, with delta time passed to update functions and an FPS counter visible on screen.

**What it doesn't deliver:** No gameplay, no entities, no grid. Just the loop infrastructure.

**Why now:** Everything in the implementation order (grid, player, enemies, towers) needs a working game loop. This is step 2 of 14.

## Design Decisions

### DD-1: Fixed vs Variable Delta Time

**Problem:** Games need consistent physics regardless of frame rate. Two approaches: fixed timestep (accumulate time, step in fixed increments) or variable timestep (pass raw dt each frame).

**Decision:** Variable delta time with a cap.

**Rationale:** Fixed timestep is important for physics-heavy games (platformers, networked games) where determinism matters. For a tower defense with grid-based placement and simple projectile movement, variable dt is simpler and sufficient. We cap dt (e.g., at 0.1s) to prevent spiral-of-death when the tab is backgrounded and gets a huge dt spike on return.

**Consequence:** If we ever need deterministic replay or networked sync, we'd need to retrofit fixed timestep. Very unlikely for this game.

### DD-2: Canvas Sizing Strategy

**Problem:** Should the canvas be a fixed size, or resize to fill the browser window?

**Decision:** Fill the browser window, maintaining a minimum logical resolution.

**Rationale:** Fixed size (like the current 960×640) wastes screen space on larger monitors and crops on smaller ones. Filling the window feels more like a real game. We'll track a logical resolution for game coordinate consistency but render at the actual canvas size.

**Consequence:** UI and camera systems need to account for variable canvas dimensions. This is standard practice.

### DD-3: Game Class Structure

**Problem:** Where does game state and orchestration live?

**Decision:** A `Game` class that owns the update/render cycle, holds references to future systems (grid, entities, etc.), and is the single entry point from `main.ts`.

**Rationale:** Keeps `main.ts` thin (just canvas setup + bootstrap). The `Game` class becomes the orchestrator — same pattern Will used in Bullet Survivors. Future systems register with Game rather than floating as globals.

**Consequence:** All future systems (grid, spawner, economy) will be owned by Game and called in its update/render methods.

### DD-4: FPS Counter Implementation

**Problem:** Need visual feedback that the loop is running and performing well.

**Decision:** Simple rolling average FPS counter rendered in the corner. Track frame times over the last N frames, display the average.

**Rationale:** A single-frame FPS counter jitters too much to read. Rolling average (e.g., last 60 frames) gives a stable, readable number. No external libraries needed.

**Consequence:** Minimal overhead. Can be toggled off later if desired.

## File Changes

| File               | Action                                                              | Risk                                                  |
| ------------------ | ------------------------------------------------------------------- | ----------------------------------------------------- |
| `src/main.ts`      | **Modify** — slim down to canvas setup + Game bootstrap             | Low — replacing placeholder code                      |
| `src/game.ts`      | **Create** — Game class with update/render loop                     | Medium — this is a contract, everything depends on it |
| `src/game.test.ts` | **Create** — tests for Game class (dt capping, update/render calls) | Low                                                   |

## Implementation Plan

### Commit 1: Game class with update/render loop

- Create `Game` class with `start()`, `update(dt)`, `render(ctx)` methods
- Implement `requestAnimationFrame` loop with delta time calculation
- Cap delta time at 0.1s to prevent spiral-of-death
- Clear canvas each frame and render background color
- Slim down `main.ts` to canvas setup + `new Game(canvas).start()`

### Commit 2: Canvas resizing + FPS counter

- Add window resize handler that updates canvas dimensions
- Implement rolling average FPS counter (last 60 frames)
- Render FPS in top-left corner
- Add tests for dt capping and FPS calculation logic

## Test Strategy

- **Delta time capping:** Unit test that Game.update caps dt values > 0.1s
- **FPS calculation:** Unit test the rolling average logic with known frame times
- **Update/render separation:** Verify update receives dt, render receives ctx (structural test)

Note: We won't test `requestAnimationFrame` or canvas rendering directly — those are browser APIs. We test the logic that feeds into them.

## Risks & Mitigations

| Risk                                          | Severity | Likelihood | Mitigation                                                                                      |
| --------------------------------------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------- |
| Game class interface changes break downstream | High     | Low        | Keep the interface minimal: `update(dt)` and `render(ctx)`. These two methods are the contract. |
| Canvas resize causes flickering               | Low      | Low        | Use `requestAnimationFrame` for resize handling, don't resize mid-frame                         |

## Acceptance Criteria

1. Canvas fills the browser window and resizes correctly
2. Game loop runs at ~60fps with stable delta time
3. Delta time is capped at 0.1s (no spiral-of-death on tab switch)
4. FPS counter displays in corner with rolling average
5. `npm run build` passes
6. All tests pass
7. Background is cleared and redrawn every frame (no ghosting)

## Solution Design

```typescript
// src/game.ts

const MAX_DELTA_TIME = 0.1; // Cap to prevent spiral-of-death
const FPS_SAMPLE_COUNT = 60; // Rolling average window

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lastTime: number = 0;
  private fpsSamples: number[] = [];
  private currentFps: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  start(): void {
    // Set up resize handler
    // Request first animation frame
  }

  private loop(currentTime: number): void {
    // Calculate dt in seconds, cap it
    // Update game state
    // Render frame
    // Track FPS
    // Request next frame
  }

  private update(dt: number): void {
    // Future: update all systems (grid, entities, economy, etc.)
  }

  private render(): void {
    // Clear canvas
    // Draw background
    // Future: render all systems
    // Draw FPS counter (always last — on top of everything)
  }

  private resize(): void {
    // Set canvas to window dimensions
  }

  private updateFps(dt: number): void {
    // Push 1/dt to samples array
    // Keep only last FPS_SAMPLE_COUNT samples
    // Average them for display
  }
}
```

```typescript
// src/main.ts (simplified)

import { Game } from './game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const game = new Game(canvas);
game.start();
```
