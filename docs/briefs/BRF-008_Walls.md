# BRF-008: Walls + Path Recalculation

## Objective

Add placeable wall structures that block enemy movement and force path recalculation. Enemies that can't path around walls attack and destroy them, opening a new route.

**What it delivers:** Wall placement via keybind, wall rendering, enemies attacking walls when their path is blocked, wall destruction triggering path recalculation, and the strategic dynamic of "build walls to funnel enemies into tower kill zones."

**What it doesn't deliver:** No wall-specific enemy behaviors yet (wall breaker, weak spot scout — those come in F-011). No wall upgrades (F-012). All enemies use the same basic "attack if blocking" logic.

**Why now:** Towers shoot, but enemies walk straight past them if there's open space. Walls create the defensive geometry that makes tower placement strategic. Without walls, tower range is the only tool for defense. With walls, you control enemy pathing — the core of tower defense strategy.

## Concepts Introduced

### Defensive Geometry — Funneling and Kill Zones

This is the strategic concept that makes TD games deep. By placing walls, you force enemies to take longer paths that pass through your tower coverage zones. A single tower covering an open field is weak — the same tower covering a narrow corridor created by walls is devastating.

The key insight: walls are valuable not because they block enemies, but because they **redirect** enemies. A wall that forces 20 enemies to walk past 3 towers creates far more value than the wall's own health points. This is why path recalculation is critical — when you place a wall, enemies must find new routes, and those new routes should pass through your defenses.

### Enemies Attacking Structures

When an enemy's path is completely blocked (A\* returns null), it can't reach the player by walking. Instead of giving up, it should attack the nearest blocking structure (wall or tower) to create a path. This creates the tension: walls buy time, not permanent safety. Build walls too thin and enemies break through quickly. Build walls too thick and you waste resources that could be towers.

For F-008, this is a simple behavior: if `findPath` returns null, the enemy moves toward the nearest wall/structure and attacks it. When the structure's health reaches 0, it's removed from the grid, paths become stale, and enemies recalculate.

### Path Recalculation on Structure Destruction

We already recalculate paths when structures are placed (enemies reroute around new walls). Now we also recalculate when structures are destroyed (enemies find newly opened paths). This is the same `pathStale` mechanism — just triggered by destruction instead of placement.

## Design Decisions

### DD-1: Wall Placement via Dedicated Key

**Problem:** Towers use keys 1-5. How do players place walls?

**Decision:** Key `Q` enters "wall placement mode." While in wall mode, clicking places walls. Number keys switch back to tower selection. Escape deselects everything.

**Rationale:** Walls are a distinct category from towers — they don't have multiple types (yet), so a single key is cleaner than adding them to the number row. `Q` is adjacent to WASD (easy to reach) and is conventionally used for quick-access items in games. This also sets up the pattern for future structure categories (traps, decorations).

**Consequence:** PlacementSystem gains a concept of "placement category" (tower vs wall) alongside the specific config index.

### DD-2: Wall Config

**Problem:** What defines a wall?

**Decision:** A single `WallConfig` with health, cost, color. Walls are always 1×1, don't shoot, don't have range. Simpler than tower configs.

**Rationale:** Walls are structurally simpler than towers. One config for now. Wall variety (reinforced walls, gates) can come in F-011.

**Consequence:** Wall placement uses `WallConfig` instead of `TowerConfig`. The `Structure` on the grid has `kind: StructureKind.Wall`.

### DD-3: Enemy Wall-Attacking Behavior

**Problem:** What do enemies do when no path exists?

**Decision:** When `findPath` returns null, the enemy finds the nearest structure (using a simple grid scan from its current position) and moves toward it. When adjacent, it deals damage per second. When the structure dies, it's removed from the grid and all paths are marked stale.

**Rationale:** This is the simplest wall-breaking behavior. It doesn't require the enemy behavior system from CLAUDE.md (wall breaker, weak spot scout) — those are per-enemy-type behaviors for F-011. For F-008, all enemies use the same fallback: "if I can't path, break the nearest thing."

**Consequence:** Enemies need new state: `attackTarget` (a grid coordinate they're moving toward to attack). The update loop gains a branch: if path exists → follow it, if not → attack nearest structure.

### DD-4: Structure Destruction and Grid Cleanup

**Problem:** When a wall (or tower) is destroyed, how is it cleaned up?

**Decision:** When `structure.health <= 0`, remove the `structureRef` from the tile, mark all enemy paths stale. If it was a tower, also remove it from `TowerManager.towers`.

**Rationale:** The grid is the source of truth for what's built where. Removing the structureRef makes the tile walkable again. Path staleness triggers recalculation on the next frame.

**Consequence:** Need a cleanup pass in the game loop that checks for dead structures. TowerManager needs a method to remove a tower by position.

## File Changes

| File                             | Action                                                     | Risk              |
| -------------------------------- | ---------------------------------------------------------- | ----------------- |
| `src/entities/walls.ts`          | **Create** — WallConfig data                               | Low — data only   |
| `src/systems/placement.ts`       | **Modify** — add wall placement mode via Q key             | Low               |
| `src/entities/enemy.ts`          | **Modify** — add structure-attacking fallback behavior     | Medium            |
| `src/entities/enemy.test.ts`     | **Modify** — tests for attack behavior                     | Low               |
| `src/rendering/wall-renderer.ts` | **Create** — draws walls on the grid                       | Low — visual only |
| `src/systems/tower-manager.ts`   | **Modify** — add removeTower method                        | Low               |
| `src/game.ts`                    | **Modify** — structure destruction cleanup, wall rendering | Low               |

## Implementation Plan

### Commit 1: Wall config + placement

- Create `WallConfig` with health, cost, color
- Extend PlacementSystem: Q key selects wall mode, places walls with `StructureKind.Wall`
- Path invalidation already triggers on `placedThisFrame` — works for walls too

### Commit 2: Wall rendering

- Create `WallRenderer` — draws walls as filled tiles with a distinct visual style
- Wire into Game render loop

### Commit 3: Enemy wall-attacking + structure destruction

- When `findPath` returns null: enemy scans for nearest structure, moves toward it, attacks when adjacent
- Structure health decreases from enemy attacks
- Dead structures removed from grid tiles
- Dead towers removed from TowerManager
- All enemy paths marked stale on structure destruction
- Tests for attack behavior

## Test Strategy

- **Wall placement:** Place wall via Q key, verify tile has `StructureKind.Wall` structureRef.
- **Path blocking:** Place walls to block a path, verify `findPath` returns null or routes around.
- **Enemy attack:** When path blocked, verify enemy moves toward nearest structure. Verify structure takes damage.
- **Structure destruction:** Reduce structure health to 0, verify it's removed from tile. Verify paths marked stale.
- **TowerManager cleanup:** Destroy a tower, verify it's removed from TowerManager.towers array.

## Risks & Mitigations

| Risk                                                                  | Severity | Likelihood | Mitigation                                                                                                 |
| --------------------------------------------------------------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| Enemies flicker between pathing and attacking                         | Medium   | Medium     | Use hysteresis: once attacking, keep attacking until structure dies or path opens                          |
| Players wall off the entire map, enemies can never reach              | Low      | Medium     | Acceptable for now — enemies will attack walls. Future: prevent placement that fully encloses spawn points |
| Structure destruction causes frame spike from mass path recalculation | Low      | Low        | Lazy recompute via pathStale flag, same as tower placement                                                 |

## Acceptance Criteria

1. Q key selects wall placement mode
2. Walls render visibly distinct from towers
3. Walls block enemy pathing (enemies route around them)
4. When no path exists, enemies move toward and attack the nearest structure
5. Attacked structures lose health and are destroyed at health <= 0
6. Destroyed structures are removed from the grid
7. Enemy paths recalculate when structures are destroyed
8. Destroyed towers are removed from TowerManager
9. All tests pass, `npm run build` passes

## Solution Design

```typescript
// src/entities/walls.ts

export interface WallConfig {
  readonly name: string;
  readonly health: number;
  readonly cost: number;
  readonly color: string;
}

export const WALL_CONFIG: WallConfig = {
  name: 'Wall',
  health: 200,
  cost: 10,
  color: '#8d6e63',
};
```

```typescript
// src/systems/placement.ts — extensions

export type PlacementCategory = 'tower' | 'wall' | null;

// In PlacementState:
export interface PlacementState {
  category: PlacementCategory;
  selectedIndex: number | null; // tower config index (only for towers)
  hoverTile: GridCoord | null;
  isValid: boolean;
}

// Q key sets category to 'wall', number keys set to 'tower' + index
// Place creates Structure with appropriate StructureKind
```

```typescript
// src/entities/enemy.ts — attack fallback

export class Enemy {
  // ... existing fields ...
  attackTarget: GridCoord | null = null; // tile being attacked
  private attackDamage: number = 10; // damage per second to structures
  private attackRange: number = TILE_SIZE; // must be within 1 tile

  update(dt: number, grid: Grid): void {
    if (this.arrived) return;

    // If has path, follow it (existing behavior)
    if (this.hasPath() && !this.pathStale) {
      this.followPath(dt, grid);
      return;
    }

    // If no path and has attack target, move toward and attack it
    if (this.attackTarget) {
      this.attackStructure(dt, grid);
      return;
    }

    // No path, no target: find nearest structure to attack
    this.attackTarget = this.findNearestStructure(grid);
  }
}
```

```typescript
// src/rendering/wall-renderer.ts

export class WallRenderer {
  render(ctx, grid, camera, canvasWidth, canvasHeight): void {
    // Viewport culling, iterate visible tiles
    // Draw walls as filled tiles with brick-like color
    // Optionally show health bar for damaged walls
  }
}
```
