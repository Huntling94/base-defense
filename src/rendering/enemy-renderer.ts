import type { Enemy } from '../entities/enemy';

export class EnemyRenderer {
  render(ctx: CanvasRenderingContext2D, enemies: Enemy[]): void {
    for (const enemy of enemies) {
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.config.radius, 0, Math.PI * 2);
      ctx.fillStyle = enemy.config.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}
