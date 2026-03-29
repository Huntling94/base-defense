# BRF-006: Enemies + A\* Pathfinding

## Objective

Add enemies that spawn outside the field, pathfind toward the player using A\*, and move along the computed path. Placing towers dynamically changes which tiles are blocked, triggering path recalculation.

**What it delivers:** An A\* pathfinding implementation on the grid, enemy entities that follow computed paths, basic spawning, and the infrastructure for enemies to interact with the grid.

**What it doesn't deliver:** No tower shooting (F-007), no enemy combat or health loss (F-007), no walls (F-008), no gold drops (F-009), no wave system (F-010). Enemies reach the player and... just stop. The pathfinding is the deliverable.

**Why now:** The grid exists, towers can be placed. Without enemies, towers have nothing to defend against. A\* is the core technical challenge — every subsequent feature (shooting, walls, waves, enemy variety) depends on enemies being able to navigate the grid.

## Concepts Introduced

### A\* Pathfinding — How Enemies Navigate

A\* (A-star) is the standard pathfinding algorithm for grid-based games. It finds the shortest path between two tiles while avoiding obstacles. You'll encounter it in every game that has units navigating around things — RTS games, tower defense, RPGs.

#### The core idea

A\* explores tiles outward from the start, prioritizing tiles that look "promising" — closer to the goal. It maintains two scores for each tile:

- **g-cost:** The actual distance traveled from start to this tile. This is known exactly.
- **h-cost (heuristic):** An _estimate_ of the remaining distance from this tile to the goal. This is a guess.
- **f-cost = g + h:** The total estimated cost. A\* always explores the tile with the lowest f-cost next.

The heuristic is what makes A* efficient. Without it, you'd explore outward uniformly in all directions (that's Dijkstra's algorithm). With a good heuristic, A* "leans toward" the goal, skipping tiles in the wrong direction.

#### Step by step

1. Start with the start tile in an "open set" (tiles to explore)
2. Pick the tile with the lowest f-cost from the open set
3. If it's the goal, we're done — trace back through parents to get the path
4. Otherwise, check each neighbor (up, down, left, right):
   - Skip if blocked (occupied or impassable terrain)
   - Calculate the g-cost to reach this neighbor through the current tile
   - If this path is better than any previously found path to this neighbor, update it
   - Add the neighbor to the open set
5. If the open set is empty, there's no valid path

#### Manhattan distance as heuristic

On a grid where movement is 4-directional (no diagonals), the optimal heuristic is **Manhattan distance**: `|row1 - row2| + |col1 - col2|`. It counts the minimum number of tiles you'd need to traverse in a straight line (with only cardinal movement). It never overestimates, which is required for A\* to find optimal paths.

#### Movement cost and terrain

Not all tiles cost the same to traverse. Sand has `movementMultiplier: 0.6`, meaning enemies move 40% slower on sand. In A* terms, crossing a sand tile costs `1 / 0.6 ≈ 1.67` instead of `1.0`. A* will prefer paths through grass over sand when both are available — this is how terrain influences strategy.

### Path Invalidation — What Happens When You Build

When you place a tower, a previously-valid path might now be blocked. Enemies following that path need to recalculate. There are two approaches:

1. **Recompute immediately:** Every enemy recalculates its path when the grid changes. Simple but can spike CPU if there are 100 enemies and you place a tower.
2. **Lazy recompute:** Mark paths as stale. Each enemy recalculates on its next waypoint check. Spreads the cost across frames.

We'll use lazy recompute — it's simpler and the per-frame cost is negligible for our enemy counts.

### Enemies as Continuous-Space Entities on a Discrete Grid

Like the player, enemies exist in world space (continuous `x, y`) but navigate in grid space (discrete `row, col`). A\* returns a sequence of grid coordinates (waypoints). The enemy smoothly moves from waypoint to waypoint in world space, converting each grid coord to world pixels via `gridToWorld`.

When the enemy reaches a waypoint (distance < threshold), it advances to the next one. This creates smooth movement along the path rather than teleporting tile to tile.

## Design Decisions

### DD-1: 4-Directional vs 8-Directional Movement

**Problem:** Should enemies move in 4 directions (cardinal only) or 8 (including diagonals)?

**Decision:** 4-directional for now.

**Rationale:** 8-directional is more natural-looking but adds complexity: diagonal moves must check corner-cutting (an enemy shouldn't slide diagonally between two adjacent walls). 4-directional is simpler, produces clear grid-aligned paths, and is easier to reason about for a first implementation. We can add 8-directional later by extending the neighbor lookup.

**Consequence:** Paths will look slightly "steppy" on diagonals. This is visually acceptable and common in the genre.

### DD-2: Pathfinding as a Standalone Module

**Problem:** Where does A\* live? On the Grid? On the Enemy? In its own module?

**Decision:** Standalone `pathfinding.ts` module with a pure function: `findPath(grid, start, goal) → GridCoord[] | null`.

**Rationale:** A\* is reusable — multiple enemies call it, tests can call it without instantiating Game. Keeping it as a pure function (input: grid state, output: path) makes it trivially testable. It reads the grid but doesn't modify it.

**Consequence:** Clean separation. Enemies call `findPath`, get a list of waypoints, follow them. The function doesn't care who's calling or why.

### DD-3: Enemy Data-Driven Config

**Problem:** How to define different enemy types?

**Decision:** Data-driven `EnemyConfig` with speed, health, color, radius. Same pattern as `TowerConfig` and `TerrainConfig`. For F-006, we define one enemy type ("Basic"). More types come in F-011.

**Rationale:** Consistent data-driven pattern across the project. Will already understands this from Bullet Survivors.

**Consequence:** Adding enemy types later is just adding config entries.

### DD-4: Spawning Strategy for F-006

**Problem:** How do enemies get into the world? The wave system is F-010.

**Decision:** Simple timer-based spawning for testing. Spawn an enemy every N seconds from a random edge of the map. This is a placeholder that F-010 replaces with proper wave logic.

**Rationale:** We need enemies on screen to test pathfinding and prepare for F-007 (shooting). A simple spawn timer achieves this without building the full wave system.

**Consequence:** Spawning code is disposable — explicitly temporary until F-010.

### DD-5: What Happens When an Enemy Reaches the Player

**Problem:** F-006 doesn't include combat. What do enemies do when they arrive?

**Decision:** Enemies that reach the player simply stop and are removed after a brief pause. No damage, no health loss. This lets us see that pathfinding works correctly without needing the combat system.

**Rationale:** The deliverable is pathfinding, not combat. We need to see enemies arrive to verify paths are correct. Removing them prevents pile-ups.

**Consequence:** F-007 will add actual damage and death mechanics.

### DD-6: Priority Queue Implementation

**Problem:** A\* needs a priority queue (min-heap) for the open set to efficiently get the lowest f-cost tile. JavaScript doesn't have a built-in one.

**Decision:** Simple binary heap implementation in `utils/binary-heap.ts`.

**Rationale:** A sorted array with `splice` is O(n) insertion. For grids our size (64×48 = 3072 tiles), this is fine for a few enemies but will be slow with many enemies pathfinding simultaneously. A binary heap gives O(log n) insertion and extraction. It's a small, well-understood data structure (~40 lines).

**Consequence:** Reusable for any future priority-based system.

## File Changes

| File                              | Action                                           | Risk                          |
| --------------------------------- | ------------------------------------------------ | ----------------------------- |
| `src/utils/binary-heap.ts`        | **Create** — Binary heap for A\* open set        | Low — standard data structure |
| `src/utils/binary-heap.test.ts`   | **Create** — tests for heap operations           | Low                           |
| `src/systems/pathfinding.ts`      | **Create** — A\* implementation as pure function | High — core contract          |
| `src/systems/pathfinding.test.ts` | **Create** — tests for pathfinding correctness   | Low                           |
| `src/entities/enemy.ts`           | **Create** — Enemy entity with path following    | Medium                        |
| `src/entities/enemy.test.ts`      | **Create** — tests for enemy movement            | Low                           |
| `src/systems/spawner.ts`          | **Create** — Simple timer-based enemy spawning   | Low — temporary               |
| `src/rendering/enemy-renderer.ts` | **Create** — draws enemies                       | Low — visual only             |
| `src/game.ts`                     | **Modify** — wire enemies, spawner, pathfinding  | Low                           |

## Implementation Plan

### Commit 1: Binary heap

- Create `BinaryHeap<T>` with insert, extractMin, size, isEmpty
- Accepts a comparator function for ordering
- Tests for insert, extract, ordering, edge cases

### Commit 2: A\* pathfinding

- Create `findPath(grid, start, goal)` → `GridCoord[] | null`
- 4-directional neighbors, Manhattan distance heuristic
- Terrain movement cost from `TERRAIN_CONFIG[terrain].movementMultiplier`
- Returns null if no path exists
- Tests: straight path, path around obstacle, no path, terrain costs, path through open field

### Commit 3: Enemy entity

- Create `Enemy` class with position, speed, health, path following
- `setPath(path)` stores waypoints, enemy moves toward each in sequence
- `update(dt)` moves enemy toward current waypoint, advances when reached
- `EnemyConfig` data-driven config (one "Basic" type for now)
- Tests for path following, waypoint advancement

### Commit 4: Spawner + rendering + Game integration

- Create `Spawner` with timer-based enemy creation from map edges
- Create `EnemyRenderer` — draws enemies as colored circles
- Wire into Game: update enemies, pathfind to player, render
- Path invalidation: when PlacementSystem places a tower, enemies recompute paths on next update

## Test Strategy

- **Binary heap:** Insert values in random order, extract in sorted order. Edge cases: empty heap, single element, duplicates.
- **A\* pathfinding:**
  - Straight line on open grid (no obstacles)
  - Path around a wall of occupied tiles
  - No valid path (completely blocked) returns null
  - Terrain cost: path prefers grass over sand when both routes are available
  - Start or goal is blocked returns null
- **Enemy path following:** Given a path of waypoints, verify enemy moves toward each and advances correctly. Verify enemy reports "arrived" when reaching final waypoint.

## Risks & Mitigations

| Risk                                          | Severity | Likelihood | Mitigation                                                                                                                             |
| --------------------------------------------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A\* performance with many enemies             | Medium   | Low        | Our grid is small (3072 tiles). A\* with binary heap handles this easily. If needed later, cache paths for enemies with the same goal. |
| Path invalidation causes frame spikes         | Low      | Low        | Lazy recompute — enemies recompute one at a time as they reach waypoints, not all simultaneously                                       |
| No path exists (player completely walled off) | Medium   | Medium     | `findPath` returns null. Enemy stops and waits. In future, wall breakers (F-008) will attack structures to create a path.              |
| Enemy movement jitter at waypoints            | Low      | Medium     | Use a small arrival threshold (e.g., 2px) to snap to waypoint center before advancing                                                  |

## Acceptance Criteria

1. A\* finds correct shortest paths on the grid (tested)
2. A\* returns null when no path exists (tested)
3. A\* respects terrain movement costs (tested)
4. Enemies spawn from map edges
5. Enemies pathfind toward the player and move smoothly along the path
6. Placing a tower causes enemies to recalculate paths
7. Enemies that reach the player are removed
8. Binary heap works correctly (tested)
9. All tests pass, `npm run build` passes

## Solution Design

```typescript
// src/utils/binary-heap.ts

export class BinaryHeap<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  insert(item: T): void {
    /* bubble up */
  }
  extractMin(): T | null {
    /* swap root with last, bubble down */
  }
  get size(): number {
    return this.items.length;
  }
  get isEmpty(): boolean {
    return this.items.length === 0;
  }
}
```

```typescript
// src/systems/pathfinding.ts

import type { Grid, GridCoord } from './grid';

/** Find shortest path from start to goal using A*. Returns null if no path exists. */
export function findPath(grid: Grid, start: GridCoord, goal: GridCoord): GridCoord[] | null {
  // Open set: binary heap sorted by f-cost
  // Closed set: Set<string> of "row,col" keys
  // For each explored tile: track parent, g-cost
  // Neighbors: 4-directional (up, down, left, right)
  // Movement cost: 1 / TERRAIN_CONFIG[terrain].movementMultiplier
  // Heuristic: Manhattan distance
  // Returns path from start to goal (inclusive), or null
}
```

```typescript
// src/entities/enemy.ts

export interface EnemyConfig {
  readonly name: string;
  readonly speed: number;     // pixels per second
  readonly health: number;
  readonly color: string;
  readonly radius: number;
}

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  basic: { name: 'Basic', speed: 80, health: 50, color: '#e53935', radius: 10 },
};

export class Enemy {
  x: number;
  y: number;
  health: number;
  readonly config: EnemyConfig;
  private path: GridCoord[] = [];
  private pathIndex: number = 0;
  arrived: boolean = false;
  pathStale: boolean = false;

  constructor(x: number, y: number, config: EnemyConfig) { ... }

  setPath(path: GridCoord[]): void { ... }

  update(dt: number, grid: Grid): void {
    // If no path or path stale, skip movement (caller should recompute)
    // Move toward current waypoint at speed * terrainMultiplier
    // When within threshold, advance to next waypoint
    // When past last waypoint, set arrived = true
  }
}
```

```typescript
// src/systems/spawner.ts

export class Spawner {
  private timer: number = 0;
  private spawnInterval: number = 2; // seconds between spawns

  update(dt: number, enemies: Enemy[], grid: Grid, player: Player): void {
    this.timer += dt;
    if (this.timer >= this.spawnInterval) {
      this.timer -= this.spawnInterval;
      // Pick random edge position
      // Create enemy
      // Compute initial path to player
      // Add to enemies array
    }
  }
}
```
