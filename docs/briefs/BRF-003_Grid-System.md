# BRF-003: Grid System + Tile Rendering

## Objective

Build the spatial grid that everything in the game is placed on — towers, walls, enemies pathfind across it. This is the foundational data structure for the entire game.

**What it delivers:** A grid of tiles that renders visually, with functions to convert between world coordinates (pixels) and grid coordinates (row/col), and a data model for what occupies each tile.

**What it doesn't deliver:** No placement interaction (that's F-005), no pathfinding (F-006), no entities. Just the grid structure, rendering, and coordinate math.

**Why now:** Every future feature needs the grid. Towers snap to it. Walls occupy it. Enemies pathfind on it. The camera views it. It must be solid before anything else builds on top.

## Concepts Introduced

This feature introduces **grid/tile systems** — the first new concept from Will's learning list for this project.

### Discrete vs Continuous Space

In Bullet Survivors, everything lived in **continuous space** — an enemy could be at position `(142.7, 389.2)`, any fractional pixel on the field. That's great for smooth movement, but tower defense needs **discrete placement**. When you click to place a tower, it shouldn't land at `(142.7, 389.2)` — it should **snap** to the nearest tile. The grid makes this possible by dividing the world into a fixed lattice of equally-sized cells.

This is the same idea as a chess board: pieces don't sit between squares. The grid constrains where things can go, and that constraint is what creates strategy. "Do I put the cannon here or one tile to the right?" is a meaningful choice because positions are discrete and finite.

### Two Coordinate Systems and Converting Between Them

With a grid, you now have **two ways to describe a position**:

1. **World coordinates (pixels):** `(x, y)` — continuous. Where things actually render on the canvas. A projectile at `(500.3, 299.8)`.
2. **Grid coordinates (row, col):** discrete. Which tile something occupies. Tile `(9, 15)` means "10th row, 16th column."

You constantly convert between them:

- **World → Grid** (when the player clicks the canvas, which tile did they click?):
  `col = floor(x / TILE_SIZE)`, `row = floor(y / TILE_SIZE)`
  Example: click at pixel `(100, 200)` with 32px tiles → tile `(6, 3)`

- **Grid → World** (where do I draw the tower that's on tile (6, 3)?):
  `x = col * TILE_SIZE + TILE_SIZE/2`, `y = row * TILE_SIZE + TILE_SIZE/2`
  The `+ TILE_SIZE/2` gives the **center** of the tile — that's where you'd draw the sprite.

The round-trip must be lossless: converting grid → world → grid must return the same tile. This is guaranteed by `floor()` — any pixel within a 32px tile maps back to the same row/col.

### Coordinate Snapping

"Snapping" is what happens when you convert a continuous position to a discrete one. The player's mouse is at pixel `(107, 215)`. That's somewhere inside tile `(6, 3)`. When we show the placement preview, we don't draw it at `(107, 215)` — we snap to the tile center `(112, 208)`. This gives the satisfying "locking into place" feel of every grid-based builder game.

### The row/col vs x/y Trap

The one conceptual gotcha: **row and col are "backwards" from x and y**. `x` is horizontal and comes first. But `row` is vertical (like y) and comes first in array access: `grid[row][col]`. This is because rows are the outer array (each row is an array of columns). The brief enforces this through distinct types — `GridCoord` has `row, col` fields, `WorldPos` has `x, y` fields — so the compiler catches mix-ups.

### Why Games Use Grids

Grids aren't just for placement — they're the backbone for multiple systems:

- **Pathfinding (A\*):** operates on tiles, asking "can I walk through this cell?" Yes/no per tile.
- **Collision:** "is this tile occupied?" is O(1) lookup instead of checking against every entity.
- **Spatial reasoning for AI:** enemies can evaluate wall thickness by counting occupied tiles in a direction.
- **Rendering optimization:** only draw tiles visible in the camera viewport, not the entire world.

Every grid-based game (Factorio, RimWorld, Dwarf Fortress, Civilization) uses this same fundamental structure. The specifics differ, but the pattern — discrete cells, coordinate conversion, tile state — is universal.

## Design Decisions

### DD-1: Grid Data Structure

**Problem:** How do we represent what's on each tile? A simple enum (`Empty | Wall | Tower`) won't work because: (1) it conflates terrain with occupancy — a tower on sand loses the sand info; (2) it can't express multi-tile structures sharing one health pool; (3) AI enemies need to read structure health through tiles, which an enum can't provide.

**Decision:** 2D array of `Tile` objects (`Tile[][]`), accessed as `grid[row][col]`. Each tile has two layers:

- **Terrain layer** (`terrain: Terrain`) — permanent ground type (grass, sand, rock). Set at map creation, never changes during gameplay. Affects movement speed, buildability.
- **Structure layer** (`structureRef: StructureRef | null`) — what's built on this tile. Points to a shared `Structure` object. Null means empty — no separate "empty" enum needed.

For **multi-tile structures** (e.g., a 2×2 fortress), all occupied tiles store a `StructureRef` pointing to the same `Structure` object. The `isAnchor` flag on the ref marks the top-left tile, so iteration can skip non-anchors to avoid processing the same structure multiple times. For pathfinding, every occupied tile blocks movement regardless of anchor status — just check `structureRef !== null`.

**Characters (player, enemies) are NOT stored on tiles.** They exist in continuous world space and query the grid for context (terrain speed modifier, "is this tile blocked?"). This avoids problems with entities being between tiles during movement, or multiple enemies crossing the same tile.

**Rationale:** Row-major 2D array is the most intuitive mapping to a visual grid. Object per tile supports the layered architecture. A flat 1D array is faster for large grids but less readable — our grid is small enough (~64×48 tiles) that readability wins.

**Consequence:** Grid access is `O(1)`. Memory is negligible. The `Structure` interface is defined as a contract in F-003 but implemented in later features (F-005 placement, F-008 walls with health). Tile emptiness is determined by `structureRef === null` — single source of truth, no sync hazard.

### DD-2: Tile Size

**Problem:** How big is each tile in world pixels?

**Decision:** 32×32 pixels. Stored as a constant, easy to change.

**Rationale:** 32px is a classic tile size — small enough to allow tactical placement variety (a 960px-wide view shows 30 tiles across), large enough to see individual tiles clearly. Powers of 2 align well with pixel art if we add sprites later.

**Consequence:** Grid dimensions are derived from world size: `cols = floor(worldWidth / TILE_SIZE)`, `rows = floor(worldHeight / TILE_SIZE)`.

### DD-3: World Size vs Canvas Size

**Problem:** Should the grid match the canvas (screen) or be a fixed-size world that the camera views?

**Decision:** Fixed world size, independent of canvas. The world is larger than the screen — the camera (F-004) will pan across it.

**Rationale:** A fixed world creates strategic constraints. You have finite space to build in. Screen-sized grids would change the playfield when the player resizes their browser, which breaks gameplay. A larger world also sets up camera movement, which is already familiar from Bullet Survivors.

**Consequence:** We need world-to-screen and screen-to-world coordinate conversion (essential for mouse interaction in F-005). The camera system (F-004) will handle the viewport offset.

### DD-4: Grid Rendering Style

**Problem:** How should the grid look visually?

**Decision:** Subtle grid lines on a dark background. Alternating tile colors (very slight) for readability. Occupied tiles get distinct colors based on type.

**Rationale:** The grid needs to be visible enough to guide placement but not so prominent that it distracts from gameplay. Subtle alternating shading (like a chess board but barely visible) helps players count tiles for range estimation.

**Consequence:** Pure canvas rendering — no sprites needed yet. Easy to restyle later.

### DD-5: Data-Driven Terrain Config

**Problem:** Terrain types affect gameplay (movement speed, buildability). Where does this logic live? Option A: conditionals scattered through code (`if terrain === Sand, speed *= 0.7`). Option B: a config object per terrain type with properties that systems read.

**Decision:** Data-driven config. Each `Terrain` enum value maps to a `TerrainConfig` with `movementMultiplier`, `buildable`, and `color`.

**Rationale:** Same data-driven pattern Will learned in Bullet Survivors for enemy/weapon configs. Adding a new terrain type (lava, ice, swamp) means adding one config entry — no logic changes anywhere. Movement code reads `TERRAIN_CONFIG[tile.terrain].movementMultiplier` instead of branching on enum values. The renderer reads `color` from config instead of hardcoding.

**Consequence:** Terrain behavior is centralized and declarative. Walkability and buildability are separate booleans — a rocky outcrop can be walkable but unbuildable, creating natural choke points like in They Are Billions.

## File Changes

| File                             | Action                                                            | Risk                             |
| -------------------------------- | ----------------------------------------------------------------- | -------------------------------- |
| `src/systems/grid.ts`            | **Create** — Grid class with tile data, coordinate conversion     | High — this is a core contract   |
| `src/systems/grid.test.ts`       | **Create** — tests for coordinate conversion, tile access, bounds | Low                              |
| `src/rendering/grid-renderer.ts` | **Create** — draws the grid to canvas                             | Low — visual only, no game logic |
| `src/game.ts`                    | **Modify** — create Grid, pass to renderer in render()            | Low                              |

## Implementation Plan

### Commit 1: Grid data model + coordinate math

- Create `Grid` class with `Tile[][]` storage
- Define `Terrain` enum (Grass, Sand, Rock) with data-driven `TerrainConfig`
- Define `StructureKind` enum (Wall, Tower)
- Define `Structure` interface (contract only — kind, anchor, size, health, maxHealth)
- Define `StructureRef` interface (structure reference + isAnchor flag)
- Define `Tile` interface with `terrain` and `structureRef` layers
- Define `GridCoord` and `WorldPos` types
- Implement `worldToGrid(x, y)` → `{row, col}`
- Implement `gridToWorld(row, col)` → `{x, y}` (returns center of tile)
- Implement `isInBounds(row, col)` → boolean
- Implement `getTile(row, col)` and `isOccupied(row, col)`
- Tests for all coordinate conversion and bounds checking

### Commit 2: Grid rendering + Game integration

- Create `GridRenderer` that draws grid lines and tile fills
- Subtle alternating tile shading for readability
- Wire Grid into Game: create in constructor, render each frame
- Verify visually with dev server

## Test Strategy

- **worldToGrid:** Known pixel positions map to correct row/col. Edge cases: tile boundaries, negative coords, out-of-bounds.
- **gridToWorld:** Row/col returns correct pixel center. Round-trip: `worldToGrid(gridToWorld(r, c))` returns `{r, c}`.
- **isInBounds:** Returns true for valid coords, false for negatives and overflow.
- **getTile/isOccupied:** Read tile data, check occupancy. Out-of-bounds access doesn't crash.

## Risks & Mitigations

| Risk                                                  | Severity | Likelihood | Mitigation                                                                                                |
| ----------------------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| Grid coordinate convention confusion (x/y vs row/col) | High     | Medium     | Strict convention: `row` = vertical (y-axis), `col` = horizontal (x-axis). Document and enforce in types. |
| World size doesn't feel right                         | Low      | Medium     | World size is a constant — trivial to tune. Start with 64×48 tiles (2048×1536 pixels).                    |

## Acceptance Criteria

1. Grid renders visually with subtle tile lines
2. `worldToGrid` and `gridToWorld` convert correctly (tested)
3. Round-trip conversion is lossless: `worldToGrid(gridToWorld(r, c))` === `{r, c}`
4. `isInBounds` correctly validates coordinates (tested)
5. Tiles have terrain and structureRef layers; occupancy check works
6. Grid dimensions are configurable via constants
7. `npm run build` passes, all tests pass

## Solution Design

```typescript
// src/systems/grid.ts

export const TILE_SIZE = 32;
export const GRID_COLS = 64;
export const GRID_ROWS = 48;
export const WORLD_WIDTH = GRID_COLS * TILE_SIZE; // 2048
export const WORLD_HEIGHT = GRID_ROWS * TILE_SIZE; // 1536

// ---- Terrain — permanent ground layer, data-driven ----

export enum Terrain {
  Grass = 'grass',
  Sand = 'sand',
  Rock = 'rock',
}

export interface TerrainConfig {
  movementMultiplier: number; // 1.0 = normal, 0.6 = slow, 0.0 = impassable
  buildable: boolean; // can structures be placed on this terrain?
  color: string; // base render color
  colorAlt: string; // alternating shade for checkerboard readability
}

export const TERRAIN_CONFIG: Record<Terrain, TerrainConfig> = {
  [Terrain.Grass]: {
    movementMultiplier: 1.0,
    buildable: true,
    color: '#2a3a2a',
    colorAlt: '#253525',
  },
  [Terrain.Sand]: {
    movementMultiplier: 0.6,
    buildable: true,
    color: '#3a3520',
    colorAlt: '#35301c',
  },
  [Terrain.Rock]: {
    movementMultiplier: 0.8,
    buildable: false,
    color: '#3a3a3a',
    colorAlt: '#353535',
  },
};

// ---- Structure types — contract defined now, implemented later ----

export enum StructureKind {
  Wall = 'wall',
  Tower = 'tower',
}

export interface Structure {
  readonly kind: StructureKind;
  readonly anchor: GridCoord; // top-left tile of a multi-tile structure
  readonly size: { rows: number; cols: number }; // 1x1 for most, 2x2 for fortress, etc.
  health: number;
  readonly maxHealth: number;
}

export interface StructureRef {
  readonly structure: Structure; // shared — multi-tile structures share one object
  readonly isAnchor: boolean; // true for top-left tile only
}

// ---- Tile — the two-layer contract ----

export interface Tile {
  readonly terrain: Terrain; // permanent, set at map creation
  structureRef: StructureRef | null; // null = empty, no separate enum needed
}

// ---- Coordinate types ----

export interface GridCoord {
  row: number;
  col: number;
}

export interface WorldPos {
  x: number;
  y: number;
}

// ---- Grid class ----

export class Grid {
  readonly rows: number;
  readonly cols: number;
  private tiles: Tile[][];

  constructor(rows = GRID_ROWS, cols = GRID_COLS) {
    this.rows = rows;
    this.cols = cols;
    this.tiles = [];
    for (let r = 0; r < rows; r++) {
      this.tiles[r] = [];
      for (let c = 0; c < cols; c++) {
        this.tiles[r][c] = { terrain: Terrain.Grass, structureRef: null };
      }
    }
  }

  /** Convert world pixel position to grid coordinates. */
  worldToGrid(x: number, y: number): GridCoord {
    return {
      row: Math.floor(y / TILE_SIZE),
      col: Math.floor(x / TILE_SIZE),
    };
  }

  /** Convert grid coordinates to world pixel position (center of tile). */
  gridToWorld(row: number, col: number): WorldPos {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  isInBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  getTile(row: number, col: number): Tile | null {
    if (!this.isInBounds(row, col)) return null;
    return this.tiles[row][col];
  }

  /** Check if a tile is occupied by a structure. */
  isOccupied(row: number, col: number): boolean {
    const tile = this.getTile(row, col);
    return tile !== null && tile.structureRef !== null;
  }
}
```

```typescript
// src/rendering/grid-renderer.ts

export class GridRenderer {
  render(ctx: CanvasRenderingContext2D, grid: Grid): void {
    // For each visible tile:
    //   - Fill with terrain-based color (slight alternation for readability)
    //   - Draw grid lines
    //   - Color occupied tiles by structure kind
  }
}
```
