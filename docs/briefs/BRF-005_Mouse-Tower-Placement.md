# BRF-005: Mouse Input + Tower Placement

## Objective

Add mouse tracking to the input system and build the tower placement flow: select a tower type, see a placement preview on the grid, and click to place it.

**What it delivers:** Mouse position tracking, a tower selection UI, a ghost preview that snaps to tiles and shows validity, click-to-place with validation, and basic tower rendering on the grid.

**What it doesn't deliver:** No tower shooting (F-007), no economy/costs (F-009), no upgrades (F-012). Towers are placed for free and sit inert on the grid.

**Why now:** The grid and camera exist. Players need to interact with the world via mouse — this is the first feature that combines all three coordinate spaces (screen → world → grid) in one flow. Every future interaction (selling towers, selecting enemies, UI buttons) builds on this mouse → coordinate conversion pipeline.

## Concepts Introduced

### Screen → World → Grid: The Three-Space Conversion Chain

This is the first time all three coordinate systems work together in one interaction. When the player clicks the canvas:

1. **Screen space:** The browser gives us pixel `(clientX, clientY)` relative to the canvas. This is where the mouse physically is on the monitor.

2. **World space:** We convert using `camera.screenToWorld(screenX, screenY)`. This accounts for where the camera is looking — a click at screen `(400, 300)` means different world positions depending on camera scroll.

3. **Grid space:** We convert using `grid.worldToGrid(worldX, worldY)`. This snaps the continuous world position to a discrete tile `(row, col)` — the tile the player clicked on.

The reverse chain is used for rendering the placement preview:

- We know which tile the mouse is hovering (grid space)
- Convert to world space with `grid.gridToWorld(row, col)` for the tile center
- The `ctx.translate()` camera transform handles world → screen automatically

This chain is the backbone of every mouse interaction in the game going forward. F-005 establishes it.

### Hit Testing and Placement Validation

"Hit testing" means answering "what did the player click on?" In a grid game, this is simple: convert click → tile, check what's on that tile. No pixel-perfect collision detection needed.

Placement validation chains multiple checks:

1. **In bounds?** — `grid.isInBounds(row, col)` — did they click inside the world?
2. **Terrain buildable?** — `TERRAIN_CONFIG[tile.terrain].buildable` — is this grass/sand (yes) or rock (no)?
3. **Tile empty?** — `!grid.isOccupied(row, col)` — is something already built here?

The preview shows this validity visually: green ghost = valid, red ghost = invalid. The player gets feedback before committing.

### Ghost Preview Pattern

The "ghost" is a semi-transparent version of the tower rendered at the mouse's snapped tile position. It follows the mouse in real-time, snapping from tile to tile. This is the standard pattern in every builder game (Factorio, RimWorld, They Are Billions).

The ghost is purely visual — no game state changes until the player clicks. This is the "preview before commit" pattern, which prevents misclicks from wasting resources (important once economy exists in F-009).

## Design Decisions

### DD-1: Mouse Input Extension

**Problem:** The InputManager tracks keyboard state. Where does mouse tracking go?

**Decision:** Extend `InputManager` to also track mouse position and button state. Add `mouseScreenX`, `mouseScreenY`, and `isMouseDown(button)`. Mouse position updates on `mousemove`, buttons on `mousedown`/`mouseup`.

**Rationale:** Mouse input is just another input channel — no reason to split it into a separate class. The InputManager already handles `blur` (clearing state when focus is lost), which applies equally to mouse. Keeping it in one place means the Game class passes one input object around.

**Consequence:** InputManager grows slightly but stays cohesive. All input queries go through one object.

### DD-2: Tower Selection via Number Keys

**Problem:** How does the player choose which tower type to place?

**Decision:** Number keys (1-5) select a tower type. The selected type is shown in a HUD element. Pressing the same number or Escape deselects. Mouse click places only when a tower type is selected.

**Rationale:** Number key selection is the fastest input method for TD games. It keeps hands on keyboard (WASD movement) while allowing quick tower switching. A click-based toolbar UI can be added later as an alternative, but number keys are the primary input.

**Consequence:** The placement system needs a "selected tower type or null" state. When null, clicks do nothing on the grid.

### DD-3: Tower Type Data Structure

**Problem:** What defines a tower type for placement purposes?

**Decision:** Data-driven `TowerConfig` with name, cost (for future economy), range, color, and size. A registry of tower configs keyed by `StructureKind` or a tower ID. For F-005, only the visual properties matter (color, size) — combat stats come in F-007.

**Rationale:** Same data-driven pattern as `TerrainConfig` and future `EnemyConfig`. Adding a new tower type = adding a config entry. The config is the single source of truth for tower properties.

**Consequence:** Tower configs are implementation details — freely changeable without affecting contracts.

### DD-4: Placement System Architecture

**Problem:** Where does placement logic live? In the Game class directly, or in its own system?

**Decision:** A `PlacementSystem` class that owns the selection state, validation logic, and placement execution. Game passes it input, camera, and grid each frame.

**Rationale:** Placement is complex enough to warrant its own class — it has state (selected tower, hover position, validity), logic (validation), and will grow (multi-tile placement, sell mode, upgrade mode). Keeping it in Game would bloat the orchestrator.

**Consequence:** Clean separation. Game just calls `placement.update()` and `placement.render()`.

### DD-5: Multi-Tile Tower Placement

**Problem:** The Structure interface supports multi-tile structures via `size` and `isAnchor`. How does placement handle this?

**Decision:** For F-005, all towers are 1×1. The placement system validates and places a single tile. Multi-tile placement validation (checking all tiles in the footprint are buildable and empty) will be added when we introduce multi-tile structures.

**Rationale:** 1×1 placement is simpler and gets the full pipeline working. The Structure interface already supports multi-tile — we just don't exercise it yet. Adding multi-tile later means looping over the footprint in the validation and placement methods, not restructuring.

**Consequence:** The placement code will need a small extension for multi-tile, but the architecture supports it now.

## File Changes

| File                                  | Action                                                             | Risk                |
| ------------------------------------- | ------------------------------------------------------------------ | ------------------- |
| `src/systems/input.ts`                | **Modify** — add mouse position and button tracking                | Low                 |
| `src/systems/input.test.ts`           | **Modify** — add mouse input tests                                 | Low                 |
| `src/systems/placement.ts`            | **Create** — PlacementSystem with selection, validation, placement | Medium — new system |
| `src/systems/placement.test.ts`       | **Create** — tests for validation and placement logic              | Low                 |
| `src/entities/towers.ts`              | **Create** — TowerConfig data and tower type registry              | Low — data only     |
| `src/rendering/placement-renderer.ts` | **Create** — ghost preview and range circle rendering              | Low — visual only   |
| `src/rendering/tower-renderer.ts`     | **Create** — renders placed towers on the grid                     | Low — visual only   |
| `src/game.ts`                         | **Modify** — wire PlacementSystem into update/render               | Low                 |

## Implementation Plan

### Commit 1: Mouse input tracking

- Add `mouseScreenX`, `mouseScreenY`, `isMouseDown(button)`, `wasMousePressed(button)` to InputManager
- Track via `mousemove`, `mousedown`, `mouseup` on the canvas
- `wasMousePressed` returns true only on the frame the button was pressed (edge detection, not held state)
- Tests for mouse state tracking

### Commit 2: Tower config data

- Create `TowerConfig` interface and tower type registry
- Define initial tower types: Arrow Tower, Cannon, Ice Tower, Sniper, Gold Mine
- Each config has: name, color, range, cost (unused until F-009), size (1×1 for now)

### Commit 3: Placement system

- Create `PlacementSystem` class
- Selection: number keys 1-5 select tower type, Escape/same key deselects
- Hover: convert mouse screen pos → world → grid to find hovered tile
- Validation: check in bounds, terrain buildable, tile empty
- Placement: on valid left click, create Structure and set tile's structureRef
- Tests for validation logic and placement

### Commit 4: Rendering + Game integration

- Create `PlacementRenderer` — draws ghost preview (green/red based on validity), range circle
- Create `TowerRenderer` — draws placed towers as colored squares/circles on their tiles
- Wire PlacementSystem into Game: update with input/camera/grid, render in world space
- Add HUD text showing selected tower type

## Test Strategy

- **Mouse input:** Simulate mousemove/mousedown/mouseup events, verify position and button state tracking. Test `wasMousePressed` edge detection.
- **Placement validation:** Create grid, set various terrain types and occupancy, verify validation returns correct results for each case.
- **Placement execution:** Place a tower, verify tile's structureRef is set correctly with proper Structure fields and isAnchor.
- **Selection:** Verify number key toggles selection, Escape clears it.

## Risks & Mitigations

| Risk                                               | Severity | Likelihood | Mitigation                                                                                                 |
| -------------------------------------------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| Mouse position incorrect in free camera mode       | Medium   | Low        | screenToWorld conversion uses camera.x/y regardless of mode — already handles this                         |
| Click registers on placement AND movement/combat   | Medium   | Medium     | Placement only activates when a tower type is selected. Future combat click will check "no tower selected" |
| Canvas mouse events conflict with browser defaults | Low      | Medium     | `preventDefault()` on mouse events to prevent text selection, context menus                                |

## Acceptance Criteria

1. Mouse position is tracked and available via InputManager
2. Number keys 1-5 select tower types, Escape deselects
3. Ghost preview shows on the hovered tile when a tower is selected
4. Preview is green on valid tiles, red on invalid (occupied or unbuildable terrain)
5. Range circle shows around the ghost preview
6. Left click on a valid tile places the tower
7. Placed towers render visibly on the grid
8. Placement is blocked on occupied tiles and unbuildable terrain
9. HUD shows which tower type is selected
10. All tests pass, `npm run build` passes

## Solution Design

```typescript
// src/systems/input.ts — additions

export class InputManager {
  // ... existing key tracking ...
  mouseScreenX: number = 0;
  mouseScreenY: number = 0;
  private mouseButtons: Set<number> = new Set();
  private mouseButtonsPressed: Set<number> = new Set(); // edge-detected

  constructor(canvas: HTMLCanvasElement) {
    // ... existing key listeners ...
    canvas.addEventListener('mousemove', (e) => {
      this.mouseScreenX = e.offsetX;
      this.mouseScreenY = e.offsetY;
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouseButtons.add(e.button);
      this.mouseButtonsPressed.add(e.button);
      e.preventDefault();
    });
    canvas.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  isMouseDown(button: number = 0): boolean {
    return this.mouseButtons.has(button);
  }

  /** True only on the frame the button was first pressed. */
  wasMousePressed(button: number = 0): boolean {
    return this.mouseButtonsPressed.has(button);
  }

  /** Call at end of each frame to reset edge-detected state. */
  endFrame(): void {
    this.mouseButtonsPressed.clear();
  }
}
```

```typescript
// src/entities/towers.ts

export interface TowerConfig {
  readonly name: string;
  readonly color: string;
  readonly range: number; // in pixels
  readonly cost: number; // for future economy
  readonly size: { rows: number; cols: number };
}

export const TOWER_CONFIGS: TowerConfig[] = [
  { name: 'Arrow Tower', color: '#4caf50', range: 128, cost: 50, size: { rows: 1, cols: 1 } },
  { name: 'Cannon', color: '#ff9800', range: 96, cost: 80, size: { rows: 1, cols: 1 } },
  { name: 'Ice Tower', color: '#03a9f4', range: 112, cost: 60, size: { rows: 1, cols: 1 } },
  { name: 'Sniper', color: '#9c27b0', range: 224, cost: 120, size: { rows: 1, cols: 1 } },
  { name: 'Gold Mine', color: '#ffd700', range: 0, cost: 100, size: { rows: 1, cols: 1 } },
];
```

```typescript
// src/systems/placement.ts

export interface PlacementState {
  selectedIndex: number | null; // index into TOWER_CONFIGS, or null
  hoverTile: GridCoord | null; // which tile the mouse is over
  isValid: boolean; // can we place here?
}

export class PlacementSystem {
  state: PlacementState = { selectedIndex: null, hoverTile: null, isValid: false };

  update(input: InputManager, camera: Camera, grid: Grid): void {
    // Handle tower selection (number keys 1-5, Escape to deselect)
    // Convert mouse position: screen → world → grid
    // Validate placement at hovered tile
    // On left click + valid: place tower
  }

  private validate(grid: Grid, row: number, col: number): boolean {
    // Check: in bounds, terrain buildable, not occupied
  }

  private place(grid: Grid, row: number, col: number, configIndex: number): void {
    // Create Structure, set tile.structureRef
  }
}
```

```typescript
// src/rendering/placement-renderer.ts

export class PlacementRenderer {
  render(ctx: CanvasRenderingContext2D, state: PlacementState, grid: Grid): void {
    if (state.selectedIndex === null || state.hoverTile === null) return;
    // Draw ghost tower (green if valid, red if invalid)
    // Draw range circle (semi-transparent)
  }
}
```

```typescript
// src/rendering/tower-renderer.ts

export class TowerRenderer {
  render(ctx: CanvasRenderingContext2D, grid: Grid): void {
    // Iterate visible tiles, draw placed towers based on their StructureRef
    // Use tower config color, draw centered on tile
  }
}
```
