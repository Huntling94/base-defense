# HANDOVER — Prior Project Context

> This document summarizes what was built and learned in Project 1 (Bullet Survivors) to provide context for Project 2 (Base Defense).

## Project 1: Bullet Survivors (Complete)

A fully playable Vampire Survivors-style 2D auto-shooter built with TypeScript, Canvas 2D, and Vite. No game framework — raw Canvas API throughout.

**Live at:** https://huntling94.github.io/bullet-survivor-game/
**Repo:** https://github.com/Huntling94/bullet-survivor-game

### What was built

| # | Feature | Key concepts |
|---|---------|-------------|
| F-001 | Canvas + game loop with delta time | requestAnimationFrame, delta time, update/render separation |
| F-002 | Player movement with camera follow | Input handling, entity pattern, camera transform, diagonal normalization |
| F-003 | Enemy spawning and wave system | Enemy AI, invincibility frames, collision detection, data-driven entities |
| F-004 | Projectile system with auto-aim | Object pooling, auto-aim targeting, projectile lifecycle, pierce mechanic |
| F-005 | XP gems, leveling, upgrade selection | Magnetic pickup, XP curve, upgrade system, game pause state |
| F-006 | Juice: screen shake, particles, damage numbers | Screen shake, particle system, hit flash, knockback, time freeze |
| F-007 | Polish: enemy variety, wave scaling, game over | 4 enemy types, wave stat scaling, restart mechanism |

**204 tests** | **~22KB bundle** | **7 implementation briefs**

### What Will learned

1. **Delta time** — frame-rate-independent movement, clamping to prevent explosions
2. **Game feel / juice** — screen shake, particles, flash, knockback, freeze frames
3. **Object pools** — acquire/release lifecycle, swap-with-last for O(1)
4. **Update/render separation** — testable game logic without a browser
5. **Camera systems** — world→screen transform, smooth follow, shake
6. **Data-driven design** — one class, many configs, adding types without code changes
7. **Dependency injection** — interfaces for testability, concrete classes for production
8. **Collision detection** — circle-circle with distance², hit results for effects
9. **Wave spawning** — continuous with wave milestones, stat scaling, cluster spawning

### How these transfer to Base Defense

| Bullet Survivors pattern | Base Defense equivalent |
|-------------------------|----------------------|
| Entity system (Player, Enemy, Projectile) | Tower, Wall, Enemy, Projectile — same shape |
| Data-driven configs (EnemyConfig) | TowerConfig, EnemyConfig, WallConfig |
| Object pooling | Tower projectiles, particles |
| Wave spawner with scaling | Wave definitions with enemy composition |
| Collision detection (distance²) | "Is enemy within tower range?" |
| Update/render separation | Identical pattern |
| Juice effects (particles, shake, numbers) | Tower shot effects, explosion particles, gold numbers |
| Camera (follow, shake) | Pan/zoom camera (player controls camera) |

### Lessons learned (carry forward)

| # | Lesson | Prevention Rule |
|---|--------|-----------------|
| 1 | Camera-follow on blank background makes movement invisible | Always include a visual reference frame |
| 2 | Non-null assertions blocked by ESLint strict | Use `as T` casts or helper functions |
| 3 | Float precision in timer tests | Use extra frames to push past thresholds |
| 4 | Unstaged files cause lint-staged failures | Stage all modified files before committing |

## Design decisions already made for Base Defense

1. **Open field, no fixed paths** — enemies pathfind dynamically, player builds anywhere
2. **Player is a combat unit** — WASD movement, can fight directly and collect gold (genre hybrid)
3. **Walls can be broken** — enemies target and destroy walls, forcing reinforcement
4. **Per-enemy-type AI behaviors** — configured in EnemyConfig, not hardcoded:
   - "charge player" — pathfinds to player, attacks blocking structures
   - "wall breaker" — targets nearest wall first
   - "weak spot scout" — evaluates wall health, targets weakest point
   - "horde" — accumulates at spawn, then all charge together
5. **A* pathfinding is mandatory** — dynamic paths recalculate when walls are built/destroyed
6. **Will is creative director** — makes design decisions, Claude advises and implements

## What's next

Start with scaffolding (F-001), then grid system (F-003) — the foundation for tower/wall placement. See CLAUDE.md for the full implementation order.
