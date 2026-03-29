# CLAUDE.md — Base Defense

> Open-field base defense hybrid: tower defense + base building + action. Project 2 of 5 in a game dev learning pathway.

## Purpose

This is a **learning project** and a **co-design project**. Will learned game dev fundamentals in Project 1 (Bullet Survivors). Now he takes the creative director role — shaping the game's design, making strategic decisions, and directing the AI to implement his vision. New concepts are still explained step-by-step, but Will drives the "what" and "why" while Claude handles the "how."

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — Production build
- `npx tsc --noEmit` — Type-check (run before every commit)
- `npm test` — Run Vitest suite

## Tech stack

- TypeScript strict mode
- Vite for build/dev
- HTML Canvas 2D (`<canvas>` element, `getContext('2d')`)
- **No game framework.** Raw Canvas API. Will needs to understand the fundamentals, not learn a framework.
- Vitest for tests (game logic only, not rendering)

## Essential context

- **Read `HANDOVER.md` at session start.** It has session history, decisions made, what's next.
- **Read `docs/tower-defense-strategy.html`** for the full game/product strategy document.
- This project builds on Bullet Survivors (Project 1). Will already understands: delta time, update/render separation, object pooling, data-driven entities, collision detection, camera systems, game feel/juice.

## Owner working style (non-negotiable)

Will is a strategy consultant with a CS background learning game development. He built a 32-session financial analytics platform, a 6-session 3D ecosystem simulator (Radiate), and a complete 2D auto-shooter (Bullet Survivors) with previous Claude Code instances. These preferences are proven across 40+ sessions:

### Decision-making

- **Brief before code.** No medium+ feature without an implementation brief and explicit approval. Use `/plan`.
- **Explain the why.** Will is learning game dev. Explain new concepts, patterns, and trade-offs when they arise. Connect everything to the "why."
- **Challenge assumptions.** Present options with trade-offs, not defaults. When Will asks "how do others do this?" — survey approaches genuinely.
- **Will is the creative director.** Unlike Bullet Survivors (prescriptive), this project is co-designed. Will makes game design decisions (tower types, economy balance, enemy behaviors, map feel). Claude implements and advises.
- **This is a learning exercise.** Code quality matters but the primary deliverable is Will's understanding. Optimise for teachability over elegance.

### Communication

- **Step-by-step reasoning in chat.** When explaining how something works, walk through the logic concretely with examples.
- **No demo language.** Never say "as a demo" or "for demonstration purposes." Everything built is real, production-intent code.
- **Post-implementation explanation.** After building a feature, explain: what was built, which pattern was chosen, what alternative was rejected and why. This builds Will's mental model.

### Quality governance

> Claude is the sole developer. There is no human code reviewer.
> Quality is enforced through automated gates and structured process.

#### Implementation briefs (BRF)

Before any medium or large feature, write a brief document at `docs/briefs/BRF-NNN_Title.md`. The brief must include:

1. **Objective** — what it delivers, what it doesn't, why now
2. **Design decisions** — numbered, each with Problem / Decision / Rationale / Consequence
3. **File changes** — which files are created/modified, with risk assessment
4. **Implementation plan** — commit sequence with scope per commit
5. **Test strategy** — what gets tested and how
6. **Risks & mitigations** — severity, likelihood, mitigation for each risk
7. **Acceptance criteria** — numbered checklist
8. **Solution design** — interfaces, class signatures, key logic functions with explanations

Wait for explicit owner approval ("go ahead", "approved", "proceed") before implementing.

For small changes (< 30 minutes, single file, obvious approach), a brief chat description is sufficient — no formal BRF document needed.

#### Automated gates (pre-commit)

Set up Husky + lint-staged with:

| Gate        | Tool               | What it catches                     |
| ----------- | ------------------ | ----------------------------------- |
| Type safety | `tsc --noEmit`     | Type errors, strict mode violations |
| Tests       | `vitest run`       | Regressions                         |
| Lint        | `eslint`           | Code smells, unused vars            |
| Format      | `prettier --check` | Style inconsistency                 |

If any gate fails, the commit is rejected. Fix the root cause — never bypass.

#### Process quality

1. **Mandatory lessons learned.** Any rework gets a row in the Lessons Learned table in this file. No silent fixes.
2. **Session handovers.** Offer a handover summary at end of each session (what was built, decisions made, what's next). Update `HANDOVER.md`.
3. **Feature registry.** Track completed features in this file.

#### Velocity/robustness heuristic

> "Can we change this later without rewriting what depends on it?"

| Answer                                  | Action                                   | Examples                                                                    |
| --------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| **No** — it's a contract                | Slow down. Brief first. Test thoroughly. | Game loop, grid system, entity system, state machine, pathfinding interface |
| **Yes** — it's an implementation detail | Move fast. Refactor freely later.        | Tower stats, enemy colors, gold amounts, UI layout, particle configs        |

## Architecture

```
src/
  main.ts          — Entry point, canvas setup, game loop
  game.ts          — Game state machine, update/render orchestration
  entities/        — Player, towers, walls, enemies, projectiles
  systems/         — Grid, pathfinding, collision, spawning, economy, camera
  effects/         — Particles, damage numbers, screen shake, flash
  rendering/       — Sprite drawing, range circles, placement preview
  utils/           — Math helpers, vector2, object pool
  ui/              — HUD, tower selection panel, upgrade menus
```

**Key principle:** Game state is separate from rendering. `update(dt)` modifies state, `render(ctx)` draws it. Never mix.

## Game design

### Genre

Open-field base defense hybrid. Not a traditional lane-based TD. Enemies spawn from outside and charge at the player, walls, or structures. The player builds towers and walls freely anywhere on the field, fights directly as a combat unit, and manages an economy.

Closest references: They Are Billions, Mindustry, with a Bullet Survivors-style controllable player character.

### Core loop

1. **Build phase** — place towers, build walls, upgrade structures, buy units
2. **Wave phase** — enemies spawn and charge, towers auto-fire, player fights directly
3. **Earn** — enemies drop gold on death, economy structures generate passive income
4. **Evaluate** — what leaked through? Where are the weak spots?
5. **Adapt** — reinforce, expand, upgrade. Repeat.

### Enemy AI behaviors (per-type, configured in EnemyConfig)

| Behavior            | Description                                                              | Strategic role                                      |
| ------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| **Charge player**   | Pathfinds to player, attacks blocking structures on the way              | Direct pressure — forces player to stay mobile      |
| **Wall breaker**    | Targets nearest wall/structure first, only goes for player if path clear | Forces wall reinforcement, punishes thin perimeters |
| **Weak spot scout** | Evaluates wall health/thickness, targets weakest point                   | Rewards even defense distribution, punishes neglect |
| **Horde**           | Accumulates at spawn until threshold count, then all charge together     | Punishes over-extension, rewards reserve capacity   |

Each enemy type has a `behavior` field in its config that determines which AI strategy it uses. New behaviors = new difficulty curve. The player must adapt defenses to counter each behavior type.

### Entities

- **Player:** Controllable combat unit. WASD movement. Can fight enemies directly and collect gold. Hybrid role: builder + fighter.
- **Towers:** Placed on grid. Auto-fire at enemies in range. Types: shooter, splash, slow, sniper, economy.
- **Walls:** Placed on grid. Block enemy pathing. Have health — enemies can break through.
- **Enemies:** Spawn outside the field, use A\* pathfinding to reach targets. Data-driven configs with behavior strategies.
- **Projectiles:** From towers and player. Object-pooled.

### Economy

- **Kill gold:** Each enemy drops gold on death. Scales with difficulty.
- **Passive income:** Economy structures (gold collectors) generate gold per wave.
- **Spending:** New towers, walls, upgrades, player upgrades.
- **Sell/refund:** Towers can be sold for partial refund.

### Tower types (initial set — Will to refine)

| Type            | Role                | Behavior                                     |
| --------------- | ------------------- | -------------------------------------------- |
| **Arrow tower** | Single-target DPS   | Shoots nearest enemy, fast fire rate         |
| **Cannon**      | Splash damage       | Slow fire rate, area damage                  |
| **Ice tower**   | Crowd control       | Slows enemies in range, no direct damage     |
| **Sniper**      | Long range priority | Huge range, high damage, very slow fire rate |
| **Gold mine**   | Economy             | Generates gold per wave, no combat ability   |

### Map design

Open field with grid overlay. No fixed paths. Player places structures anywhere. Enemies pathfind dynamically using A\*. When walls are placed or destroyed, paths recalculate.

## Code conventions

- TypeScript strict mode. No `any`.
- Use `Vector2` class for all positions/velocities (carry from Bullet Survivors).
- All time in seconds (not milliseconds). Delta time passed to every update.
- Object pool pattern for projectiles, particles, and damage numbers.
- Constants in SCREAMING_SNAKE_CASE at top of files.
- Vitest for tests. Test co-location: `<module>.test.ts` next to `<module>.ts`.
- Git: imperative commit messages, < 72 chars. Small focused commits.
- `npm run build` must pass before declaring work complete.

## Implementation order

Build in this order, each step playable:

1. **Scaffolding** — TypeScript, Vite, Vitest, ESLint, Prettier, Husky (same as Bullet Survivors)
2. **Canvas + game loop** — delta time, FPS counter, grid rendering
3. **Grid system** — tile map, coordinate snapping, grid ↔ world conversion
4. **Player movement** — WASD on the grid/field, camera follow
5. **Mouse input + tower placement** — click to place towers on grid, placement preview, range visualization
6. **Enemies + pathfinding** — A\* on the grid, enemies pathfind to player/structures, wave spawning
7. **Tower shooting** — auto-fire at enemies in range, targeting priority, projectiles
8. **Walls + path recalculation** — place walls, enemies pathfind around them, wall health
9. **Economy** — gold drops, gold display, tower/wall costs, buy/sell
10. **Build/wave phase state machine** — phase transitions, build phase timer or manual start
11. **Tower variety + enemy variety** — data-driven configs, multiple tower/enemy types
12. **Upgrades** — tower upgrade tiers, player upgrades
13. **Juice pass** — particles, damage numbers, screen shake, placement effects
14. **Polish** — game over, restart, wave scaling, balance tuning

## Design principles

1. **Strategy is the product.** Every decision should feel meaningful — no one right answer.
2. **State before rendering.** Game logic works without a screen. Rendering is a view of state.
3. **Explain before implement.** Every new pattern gets a "why" explanation in chat.
4. **Brief before code.** Speed makes discipline more important, not less.
5. **Will directs, Claude implements.** Will makes design decisions. Claude advises and builds.

## What Will already knows (from Bullet Survivors)

1. Why delta time matters and how to use it correctly
2. What "game feel" means and how to implement it (screen shake, particles, flash, freeze frames)
3. How object pools work and why games use them
4. The update/render separation pattern
5. How camera systems work (follow, shake, smoothing)
6. Data-driven entity design (one class, many configs)
7. Dependency injection for testability (interfaces vs concrete classes)
8. Collision detection (circle-circle, distance²)
9. Wave spawning with difficulty scaling

## What Will will learn in this project

1. **Grid/tile systems** — placing structures on a grid, coordinate snapping, grid ↔ world conversion
2. **Pathfinding (A\*)** — enemies finding routes around obstacles dynamically
3. **Game state machines** — build phase vs wave phase vs game over, formal state transitions
4. **Mouse/click interaction** — hit-testing, hover states, drag previews, screen → world → grid conversion
5. **Economy systems** — resource tracking, purchase validation, cost/benefit decisions
6. **Tower targeting AI** — priority selection (first, closest, strongest, weakest)
7. **Range visualization** — showing tower range on hover/placement, information design
8. **AI behavior strategies** — per-entity-type decision-making configured via data

## Lessons learned

| #     | Lesson                                                                                                     | Root Cause                                                                                           | Prevention Rule                                                                         |
| ----- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| L-001 | Optional peer deps of vitest (jsdom) are silently skipped by npm on CI even when listed in devDependencies | npm prioritizes optional peer dep status over devDependencies listing                                | When adding an optional peer dep as a devDependency, add an explicit install step in CI |
| L-002 | Enemies spawned outside grid bounds got no path and were invisible                                         | Spawner used negative world coords; worldToGrid returned out-of-bounds tiles; findPath returned null | Always spawn entities at valid grid positions, not outside the grid                     |

## Feature registry

| #     | Feature                                                 | Status      |
| ----- | ------------------------------------------------------- | ----------- |
| F-001 | Scaffolding (TS, Vite, Vitest, ESLint, Prettier, Husky) | Complete    |
| F-002 | Canvas + game loop with delta time                      | Complete    |
| F-003 | Grid system + tile rendering                            | Complete    |
| F-004 | Player movement + camera follow                         | Complete    |
| F-005 | Mouse input + tower placement                           | Complete    |
| F-006 | Enemies + A\* pathfinding                               | Complete    |
| F-007 | Tower shooting + targeting AI                           | Complete    |
| F-008 | Walls + path recalculation                              | Not started |
| F-009 | Economy system                                          | Not started |
| F-010 | Build/wave phase state machine                          | Not started |
| F-011 | Tower variety + enemy variety                           | Not started |
| F-012 | Tower + player upgrades                                 | Not started |
| F-013 | Juice pass                                              | Not started |
| F-014 | Polish (game over, restart, balance)                    | Not started |

## Learning pathway context

This is Project 2 of 5:

1. **Bullet Survivors** (complete) — game loop, entities, collision, juice, upgrades
2. **Base Defense** ← you are here — grid systems, pathfinding, state machines, economy, mouse interaction
3. Shader Sketchbook (GLSL art, shader fluency)
4. Tiny Hamlet (isometric builder, simulation + art direction)
5. Little World (3D diorama, visual polish capstone)

After all 5, Will returns to Radiate (3D evolution ecosystem sim) with full game dev fluency.
