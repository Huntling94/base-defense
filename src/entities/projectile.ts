import type { Enemy } from './enemy';
import type { TowerConfig } from './towers';

const PROJECTILE_RADIUS = 3;
const PROJECTILE_LIFETIME = 3;

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  lifetime: number;
  alive: boolean;
  color: string;
}

export function createProjectile(
  x: number,
  y: number,
  target: Enemy,
  config: TowerConfig,
): Projectile {
  const dx = target.x - x;
  const dy = target.y - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = config.projectileSpeed;

  return {
    x,
    y,
    vx: dist > 0 ? (dx / dist) * speed : 0,
    vy: dist > 0 ? (dy / dist) * speed : 0,
    damage: config.damage,
    radius: PROJECTILE_RADIUS,
    lifetime: PROJECTILE_LIFETIME,
    alive: true,
    color: config.color,
  };
}

export function updateProjectile(proj: Projectile, dt: number, enemies: Enemy[]): void {
  if (!proj.alive) return;

  proj.x += proj.vx * dt;
  proj.y += proj.vy * dt;
  proj.lifetime -= dt;

  if (proj.lifetime <= 0) {
    proj.alive = false;
    return;
  }

  for (const enemy of enemies) {
    if (enemy.health <= 0) continue;
    const dx = enemy.x - proj.x;
    const dy = enemy.y - proj.y;
    const distSq = dx * dx + dy * dy;
    const hitDist = proj.radius + enemy.config.radius;
    if (distSq <= hitDist * hitDist) {
      enemy.health -= proj.damage;
      proj.alive = false;
      return;
    }
  }
}
