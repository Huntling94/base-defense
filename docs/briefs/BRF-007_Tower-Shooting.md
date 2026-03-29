# BRF-007: Tower Shooting + Targeting AI

## Objective

Make towers actively defend by auto-firing projectiles at enemies within range. Each tower type has a targeting priority and fire rate. Projectiles travel toward enemies, deal damage, and enemies die when health reaches zero.

**What it delivers:** Tower combat loop (detect enemy → pick target → fire projectile → deal damage → enemy death), targeting priorities, projectile entities, and the first gameplay feedback of "towers actually doing something."

**What it doesn't deliver:** No splash damage for cannons yet (just single-target for all). No slow effect for ice towers yet. No gold drops on death (F-009). These behaviors come with tower/enemy variety in F-011.

**Why now:** We have towers on the grid and enemies walking past them. Without shooting, the game has no defense loop. This feature turns inert structures into active defenders and closes the core gameplay cycle: build → defend → adapt.

## Concepts Introduced

### Tower Targeting AI — Choosing Who to Shoot

Each tower scans for enemies within its range and picks one to fire at. The choice of _which_ enemy to target is a strategic decision that differs by tower type. Common targeting priorities in TD games:

- **Closest:** Target the enemy nearest to the tower. Simple, works well for short-range towers.
- **First:** Target the enemy furthest along its path (closest to reaching the player). Focuses fire on the most immediate threat.
- **Strongest:** Target the enemy with the highest current health. Focuses on tough enemies.
- **Weakest:** Target the enemy with the lowest current health. Finishes off damaged enemies quickly.

For F-007, we implement **closest** as the default targeting for all tower types. The targeting priority becomes a configurable field on `TowerConfig` in F-011 when we differentiate tower behaviors.

### Range Detection — distance squared

To check if an enemy is within a tower's range, we compare the distance between them against the tower's range radius. The naive approach is:

```
distance = sqrt((towerX - enemyX)² + (towerY - enemyY)²)
if distance <= range → in range
```

But `sqrt` is expensive when called for every tower × every enemy every frame. The optimization: compare **squared distances** instead. Since `sqrt` preserves ordering, `dist² <= range²` gives the same answer without the square root:

```
distSq = (towerX - enemyX)² + (towerY - enemyY)²
if distSq <= range * range → in range
```

This is a standard game dev optimization you'll see everywhere.

### Projectiles as Pooled Entities

Projectiles are created when a tower fires and destroyed when they hit an enemy or travel too far. In a busy game, this means hundreds of create/destroy cycles per second. Object pooling (which you know from Bullet Survivors) avoids garbage collection spikes by reusing projectile objects.

For F-007, we'll use a simple array (create/filter) since enemy counts are low. We can add pooling in the juice pass if needed.

### Fire Rate as Cooldown

Towers don't fire every frame — they have a fire rate expressed as "shots per second" in the config, converted to a cooldown timer. Each tower tracks time since last shot. When the cooldown expires and a target is in range, it fires and resets the timer.

This requires per-tower state beyond what `Structure` currently holds. We'll track tower combat state (cooldown timer, current target) separately from the grid's `Structure` data, since `Structure` is a placement contract and combat is a runtime concern.

## Design Decisions

### DD-1: Combat State Separate from Structure

**Problem:** Towers need per-instance state (cooldown timer, target reference) that doesn't belong on the `Structure` interface. Where does it go?

**Decision:** A `TowerInstance` runtime object that pairs a grid position with combat state. A `TowerManager` system maintains an array of `TowerInstance` objects, synchronized with the grid.

**Rationale:** The `Structure` interface on the grid tile is a placement/spatial contract — it tells you what's built where. Combat state (cooldown, targeting) is runtime behavior that doesn't belong on the grid. Separating them keeps the grid clean and makes tower combat independently testable.

**Consequence:** When a tower is placed, a `TowerInstance` is created. When a tower is destroyed (future), the instance is removed. The grid and the instance array must stay in sync.

### DD-2: Projectile Behavior

**Problem:** Should projectiles be hitscan (instant) or travel through space?

**Decision:** Traveling projectiles with speed, direction, and collision detection.

**Rationale:** Traveling projectiles are more visually satisfying — you see the shot fly. They also create gameplay depth: fast enemies might dodge slow projectiles (not implemented now, but the architecture supports it). Hitscan is simpler but feels flat.

**Consequence:** Projectiles need position, velocity, and lifetime. Each frame: move, check collision with enemies, remove on hit or timeout.

### DD-3: Damage and Death

**Problem:** How do enemies take damage and die?

**Decision:** Projectile hits subtract damage from `enemy.health`. When health reaches 0, the enemy is removed from the array. No death animation for now (juice pass).

**Rationale:** Simplest possible damage model. Complexity (armor, resistances, damage types) can be layered on later via config.

**Consequence:** The enemy health property (already on `Enemy`) becomes meaningful. Currently enemies are removed when they arrive — now they're also removed when health ≤ 0.

### DD-4: Tower Config Extensions

**Problem:** TowerConfig needs combat stats (fire rate, damage, projectile speed) that it doesn't currently have.

**Decision:** Add `fireRate`, `damage`, and `projectileSpeed` to `TowerConfig`. Gold Mine has `fireRate: 0` (doesn't shoot).

**Rationale:** Keeps the data-driven pattern. All tower behavior is defined in config.

**Consequence:** Tower configs grow but remain implementation details — freely changeable.

### DD-5: Storing Config Index on Structure

**Problem:** TowerRenderer currently matches towers to configs by comparing `maxHealth` — fragile. TowerManager also needs to know which config a tower uses.

**Decision:** Add a `configIndex` field to `Structure` so any system can look up the tower's config directly.

**Rationale:** Single source of truth. No fragile matching heuristics. Every system that needs tower properties (rendering, combat, UI) reads `TOWER_CONFIGS[structure.configIndex]`.

**Consequence:** Small change to Structure interface. TowerRenderer simplifies. Breaking change is minimal since Structure is only created in PlacementSystem.

## File Changes

| File                                   | Action                                                            | Risk                 |
| -------------------------------------- | ----------------------------------------------------------------- | -------------------- |
| `src/systems/grid.ts`                  | **Modify** — add `configIndex` to Structure interface             | Low — small addition |
| `src/systems/placement.ts`             | **Modify** — pass configIndex when creating Structure             | Low                  |
| `src/entities/towers.ts`               | **Modify** — add fireRate, damage, projectileSpeed to TowerConfig | Low                  |
| `src/systems/tower-manager.ts`         | **Create** — TowerInstance tracking, targeting, firing            | Medium — new system  |
| `src/systems/tower-manager.test.ts`    | **Create** — tests for targeting and firing                       | Low                  |
| `src/entities/projectile.ts`           | **Create** — Projectile entity with movement and collision        | Low                  |
| `src/rendering/projectile-renderer.ts` | **Create** — draws projectiles                                    | Low — visual only    |
| `src/rendering/tower-renderer.ts`      | **Modify** — use configIndex for color lookup                     | Low                  |
| `src/game.ts`                          | **Modify** — wire TowerManager and projectiles                    | Low                  |

## Implementation Plan

### Commit 1: Structure configIndex + TowerConfig combat stats

- Add `configIndex: number` to Structure interface
- Update PlacementSystem to pass configIndex when placing
- Add `fireRate`, `damage`, `projectileSpeed` to TowerConfig with values for all 5 types
- Update TowerRenderer to use configIndex for color lookup
- Update existing tests

### Commit 2: TowerManager with targeting

- Create `TowerInstance` with position, configIndex, cooldown timer
- Create `TowerManager` that maintains instance array synced with grid
- Targeting: scan enemies, pick closest within range using distance²
- Fire rate: cooldown timer per tower, fires when ready and target available
- Tests for targeting (in-range, out-of-range, closest selection)

### Commit 3: Projectiles + damage

- Create `Projectile` entity with position, velocity, damage, lifetime
- Projectile update: move toward target position, check collision with enemies
- On hit: subtract damage from enemy health
- Enemy death: remove from array when health ≤ 0
- Tests for projectile movement and collision

### Commit 4: Rendering + Game integration

- Create `ProjectileRenderer` — draws projectiles as small fast-moving dots
- Wire TowerManager into Game update (after enemy update, before cleanup)
- Wire projectile update and rendering
- Update enemy cleanup to also remove dead enemies (health ≤ 0)

## Test Strategy

- **Targeting:** Place tower, position enemies at various distances. Verify closest is selected. Verify out-of-range enemies are ignored. Verify Gold Mine (range 0) doesn't target.
- **Fire rate:** Advance time, verify tower fires at correct interval. Verify cooldown resets after firing.
- **Projectile movement:** Create projectile with velocity, advance time, verify position changes.
- **Damage:** Projectile hits enemy, verify health decreases. Verify enemy with health ≤ 0 is removed.
- **Distance squared:** Unit test for the distance² helper function.

## Risks & Mitigations

| Risk                                      | Severity | Likelihood | Mitigation                                                                 |
| ----------------------------------------- | -------- | ---------- | -------------------------------------------------------------------------- |
| TowerInstance array out of sync with grid | Medium   | Low        | TowerManager registers on placement. Future: listen for tower destruction. |
| Projectile misses fast enemy              | Low      | Low        | Projectiles track target position, not predictive aim. Acceptable for now. |
| Performance with many towers × enemies    | Low      | Low        | distance² avoids sqrt. Grid is small. Profile later if needed.             |

## Acceptance Criteria

1. Towers auto-fire projectiles at enemies within range
2. Projectiles travel visibly toward enemies
3. Enemies take damage when hit and die at health ≤ 0
4. Towers respect fire rate cooldown
5. Gold Mine towers don't fire (fireRate 0)
6. Targeting picks the closest enemy in range
7. Dead enemies are removed from the game
8. configIndex on Structure enables clean config lookup
9. All tests pass, `npm run build` passes

## Solution Design

```typescript
// Addition to src/systems/grid.ts — Structure interface
export interface Structure {
  readonly kind: StructureKind;
  readonly anchor: GridCoord;
  readonly size: { rows: number; cols: number };
  health: number;
  readonly maxHealth: number;
  readonly configIndex: number; // NEW — index into TOWER_CONFIGS
}
```

```typescript
// Addition to src/entities/towers.ts — TowerConfig
export interface TowerConfig {
  // ... existing fields ...
  readonly fireRate: number; // shots per second (0 = doesn't shoot)
  readonly damage: number; // per projectile
  readonly projectileSpeed: number; // pixels per second
}
```

```typescript
// src/systems/tower-manager.ts

export interface TowerInstance {
  row: number;
  col: number;
  configIndex: number;
  cooldown: number; // seconds until next shot
}

export class TowerManager {
  towers: TowerInstance[] = [];

  registerTower(row: number, col: number, configIndex: number): void { ... }

  update(dt: number, enemies: Enemy[], projectiles: Projectile[], grid: Grid): void {
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      if (tower.cooldown > 0) continue;

      const config = TOWER_CONFIGS[tower.configIndex];
      if (config.fireRate <= 0) continue;

      // Find closest enemy in range
      const target = this.findTarget(tower, config, enemies, grid);
      if (!target) continue;

      // Fire projectile
      tower.cooldown = 1 / config.fireRate;
      const towerPos = grid.gridToWorld(tower.row, tower.col);
      projectiles.push(new Projectile(towerPos.x, towerPos.y, target, config));
    }
  }

  private findTarget(tower: TowerInstance, config: TowerConfig, enemies: Enemy[], grid: Grid): Enemy | null {
    const towerPos = grid.gridToWorld(tower.row, tower.col);
    const rangeSq = config.range * config.range;
    let closest: Enemy | null = null;
    let closestDistSq = Infinity;

    for (const enemy of enemies) {
      const dx = enemy.x - towerPos.x;
      const dy = enemy.y - towerPos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= rangeSq && distSq < closestDistSq) {
        closest = enemy;
        closestDistSq = distSq;
      }
    }
    return closest;
  }
}
```

```typescript
// src/entities/projectile.ts

const PROJECTILE_RADIUS = 3;
const PROJECTILE_LIFETIME = 3; // seconds

export class Projectile {
  x: number;
  y: number;
  readonly damage: number;
  readonly speed: number;
  readonly radius: number = PROJECTILE_RADIUS;
  private vx: number;
  private vy: number;
  private lifetime: number = PROJECTILE_LIFETIME;
  alive: boolean = true;

  constructor(x: number, y: number, target: Enemy, config: TowerConfig) {
    this.x = x;
    this.y = y;
    this.damage = config.damage;
    this.speed = config.projectileSpeed;
    // Calculate velocity toward target
    const dx = target.x - x;
    const dy = target.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;
  }

  update(dt: number, enemies: Enemy[]): void {
    if (!this.alive) return;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.alive = false;
      return;
    }

    // Check collision with enemies
    for (const enemy of enemies) {
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distSq = dx * dx + dy * dy;
      const hitDist = this.radius + enemy.config.radius;
      if (distSq <= hitDist * hitDist) {
        enemy.health -= this.damage;
        this.alive = false;
        return;
      }
    }
  }
}
```
