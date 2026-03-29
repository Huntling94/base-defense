# BRF-003: Grid System + Tile Rendering

## Objective

Build the spatial grid that everything in the game is placed on — towers, walls, enemies pathfind across it. This is the foundational data structure for the entire game.

**What it delivers:** A grid of tiles that renders visually, with functions to convert between world coordinates (pixels) and grid coordinates (row/col), and a data model for what occupies each tile.

**What it doesn't deliver:** No placement interaction (that's F-005), no pathfinding (F-006), no entities. Just the grid structure, rendering, and coordinate math.

**Why now:** Every future feature needs the grid. Towers snap to it. Walls occupy it. Enemies pathfind on it. The camera views it. It must be solid before anything else builds on top.

## Design Decisions

### DD-1: Grid Data Structure

**Problem:** How do we represent what's on each tile? Options: 2D array of enums, 2D array of objects, Map with string keys, flat 1D array.

**Decision:** 2D array of `Tile` objects (`Tile[][]`), accessed as `grid[row][col]`.

**Rationale:** Row-major 2D array is the most intuitive mapping to a visual grid. Each `Tile` object holds its type (empty, wall, tower) and a reference to any entity on it. Object per tile gives us room to add properties later (health for walls, tower reference) without restructuring. A flat 1D array is faster for large grids but less readable — our grid is small enough (~40×30 tiles) that readability wins.

**Consequence:** Grid access is `O(1)`. Memory is negligible. Future entity placement just sets the tile's occupant.

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
- Define `TileType` enum (Empty, Wall, Tower)
- Define `Tile` interface with `type` and optional entity reference
- Implement `worldToGrid(x, y)` → `{row, col}`
- Implement `gridToWorld(row, col)` → `{x, y}` (returns center of tile)
- Implement `isInBounds(row, col)` → boolean
- Implement `getTile(row, col)` and `setTileType(row, col, type)`
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
- **getTile/setTileType:** Set a type, read it back. Out-of-bounds access doesn't crash.

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
5. Tiles can be read and written by type
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

export enum TileType {
  Empty = 0,
  Wall = 1,
  Tower = 2,
}

export interface Tile {
  type: TileType;
}

export interface GridCoord {
  row: number;
  col: number;
}

export interface WorldPos {
  x: number;
  y: number;
}

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
        this.tiles[r][c] = { type: TileType.Empty };
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

  setTileType(row: number, col: number, type: TileType): void {
    if (!this.isInBounds(row, col)) return;
    this.tiles[row][col].type = type;
  }
}
```

```typescript
// src/rendering/grid-renderer.ts

export class GridRenderer {
  render(ctx: CanvasRenderingContext2D, grid: Grid): void {
    // For each visible tile:
    //   - Fill with base color (slight alternation for readability)
    //   - Draw grid lines
    //   - Color occupied tiles by type
  }
}
```
