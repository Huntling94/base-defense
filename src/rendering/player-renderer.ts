import type { Player } from '../entities/player';

const PLAYER_COLOR = '#4fc3f7';
const PLAYER_OUTLINE = '#0288d1';

export class PlayerRenderer {
  render(ctx: CanvasRenderingContext2D, player: Player): void {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = PLAYER_COLOR;
    ctx.fill();
    ctx.strokeStyle = PLAYER_OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
