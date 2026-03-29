import type { Projectile } from '../entities/projectile';

export class ProjectileRenderer {
  render(ctx: CanvasRenderingContext2D, projectiles: Projectile[]): void {
    for (const proj of projectiles) {
      if (!proj.alive) continue;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fillStyle = proj.color;
      ctx.fill();
    }
  }
}
