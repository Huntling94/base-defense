# HANDOVER — Base Defense

> Session handover document. Updated each session with what was built, decisions made, and what's next.

## Project 1 Context (Bullet Survivors)

See the repo at https://github.com/Huntling94/bullet-survivor-game. Will built a complete 2D auto-shooter and learned: delta time, game feel/juice, object pools, update/render separation, camera systems, data-driven entities, collision detection, wave spawning.

## Current State (as of Session 1)

**Live at:** https://huntling94.github.io/base-defense/
**Repo:** https://github.com/Huntling94/base-defense

### Features Complete (F-001 through F-008)

| #     | Feature                                                 | Key Files                                                                       |
| ----- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| F-001 | Scaffolding (TS, Vite, Vitest, ESLint, Prettier, Husky) | `package.json`, `tsconfig.json`, `.husky/pre-commit`                            |
| F-002 | Canvas + game loop with delta time                      | `src/game.ts` — Game class, FPS counter                                         |
| F-003 | Grid system + tile rendering                            | `src/systems/grid.ts` — Grid, Tile, Terrain, Structure interfaces               |
| F-004 | Player movement + camera follow                         | `src/entities/player.ts`, `src/systems/camera.ts`, `src/systems/input.ts`       |
| F-005 | Mouse input + tower placement                           | `src/systems/placement.ts` — PlacementSystem with tower/wall modes              |
| F-006 | Enemies + A\* pathfinding                               | `src/systems/pathfinding.ts`, `src/entities/enemy.ts`, `src/systems/spawner.ts` |
| F-007 | Tower shooting + targeting AI                           | `src/systems/tower-manager.ts`, `src/entities/projectile.ts`                    |
| F-008 | Walls + path recalculation                              | `src/entities/walls.ts`, wall rendering, enemy structure-attacking              |

**121 tests passing** | **~20KB bundle** | **8 implementation briefs in `docs/briefs/`**

### Architecture Overview

```
src/
  main.ts              — Entry point, creates Game
  game.ts              — Game loop orchestrator, wires all systems
  math.ts              — clamp, lerp utilities
  systems/
    grid.ts            — Grid class, Tile/Terrain/Structure/StructureRef types, TERRAIN_CONFIG
    camera.ts          — Camera with follow/free-look modes, coordinate conversion
    input.ts           — InputManager — keyboard + mouse tracking
    placement.ts       — PlacementSystem — tower/wall selection, validation, placement
    pathfinding.ts     — A* pure function with terrain costs
    spawner.ts         — Timer-based enemy spawning from edges
    tower-manager.ts   — TowerInstance tracking, targeting, firing
  entities/
    player.ts          — WASD movement, structure collision
    enemy.ts           — Path following, structure attacking fallback
    towers.ts          — TowerConfig data (5 types)
    walls.ts           — WallConfig data
    projectile.ts      — Projectile creation, movement, collision
  rendering/
    grid-renderer.ts   — Terrain tiles with viewport culling
    player-renderer.ts — Blue circle
    enemy-renderer.ts  — Red circles
    tower-renderer.ts  — Colored squares per tower type
    wall-renderer.ts   — Brown tiles with health bars
    placement-renderer.ts — Ghost preview with validity coloring
    projectile-renderer.ts — Colored dots
  utils/
    binary-heap.ts     — Min-heap for A* priority queue
```

### Key Design Decisions Made

1. **Two-layer tile architecture** — `terrain` (permanent: grass/sand/rock) + `structureRef` (nullable: tower/wall). Characters NOT on tiles — they exist in continuous world space.
2. **Data-driven terrain** — `TERRAIN_CONFIG` with movementMultiplier, buildable, colors. Adding terrain = adding config.
3. **Multi-tile structure support** — Structure has `anchor`, `size`, `isAnchor` for future 2×2+ buildings. All 1×1 for now.
4. **configIndex on Structure** — any system looks up tower properties via `TOWER_CONFIGS[structure.configIndex]`.
5. **Lazy path invalidation** — enemies get `pathStale = true` when grid changes, recompute on next frame.
6. **Enemy attack fallback** — when A\* returns null, enemies find and attack nearest structure.
7. **Camera follow + free-look** — WASD moves player, arrow keys pan camera independently, Space snaps back.
8. **Player collides with structures** — circle-vs-AABB collision resolution.
9. **PlacementCategory** — Q for walls, 1-5 for towers. Separate modes in PlacementSystem.

### Controls

| Key        | Action                     |
| ---------- | -------------------------- |
| WASD       | Move player                |
| 1-5        | Select tower type          |
| Q          | Select wall placement      |
| Escape     | Deselect                   |
| Left click | Place structure            |
| Arrow keys | Free camera pan            |
| Space      | Snap camera back to player |

### CI/CD

- GitHub Actions deploys to Pages on every push to master
- Pre-commit hook runs: tsc → vitest → lint-staged (eslint + prettier)
- `.npmrc` has `legacy-peer-deps=true` (TypeScript 6 + typescript-eslint peer conflict)
- CI uses `npm install --force` then `npm install jsdom` (jsdom is optional peer dep of vitest, silently skipped otherwise — see L-001)

### Lessons Learned

| #     | Lesson                                                      | Prevention                           |
| ----- | ----------------------------------------------------------- | ------------------------------------ |
| L-001 | Optional peer deps of vitest (jsdom) silently skipped on CI | Add explicit install step in CI      |
| L-002 | Enemies spawned outside grid bounds got no path             | Always spawn at valid grid positions |

## What's Next: F-009 Economy System

The plan is written at `.claude/plans/staged-jingling-giraffe.md`. Summary:

1. **Gold tracking** — add `gold: number` to Game, start at ~200, display in HUD
2. **Purchase validation** — PlacementSystem checks gold before placing, deducts cost
3. **Enemy gold drops** — add `goldValue` to EnemyConfig, award gold when enemies die
4. **Gold Mine passive income** — add `incomePerSecond` to TowerConfig, Gold Mines generate gold over time
5. **Sell/refund** — right-click structure to sell for 50% refund

**Key files to modify:** `game.ts`, `placement.ts`, `enemy.ts` (EnemyConfig), `towers.ts` (TowerConfig)

All tower/wall costs are already defined in configs — they just aren't checked yet.

### Remaining Features After F-009

| #     | Feature                              | Status      |
| ----- | ------------------------------------ | ----------- |
| F-010 | Build/wave phase state machine       | Not started |
| F-011 | Tower variety + enemy variety        | Not started |
| F-012 | Tower + player upgrades              | Not started |
| F-013 | Juice pass                           | Not started |
| F-014 | Polish (game over, restart, balance) | Not started |

### Planned Improvements (from Will)

- **Build menu** (WC3-style clickable panel) — planned for F-009/F-010 when costs are visible
- **Tower sprites** to replace colored squares — planned for F-013 juice pass
