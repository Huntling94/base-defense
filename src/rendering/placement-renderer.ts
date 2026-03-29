import { TILE_SIZE } from '../systems/grid';
import type { PlacementSystem } from '../systems/placement';
import { WALL_CONFIG } from '../entities/walls';

const VALID_COLOR = 'rgba(76, 175, 80, 0.4)';
const INVALID_COLOR = 'rgba(244, 67, 54, 0.4)';
const RANGE_COLOR = 'rgba(255, 255, 255, 0.1)';
const RANGE_BORDER_COLOR = 'rgba(255, 255, 255, 0.25)';

export class PlacementRenderer {
  render(ctx: CanvasRenderingContext2D, placement: PlacementSystem): void {
    const { state } = placement;
    if (state.category === null || state.hoverTile === null) return;

    const worldPos = placement.getHoverWorldPos();
    if (!worldPos) return;

    const tileX = state.hoverTile.col * TILE_SIZE;
    const tileY = state.hoverTile.row * TILE_SIZE;

    // Draw ghost tile
    ctx.fillStyle = state.isValid ? VALID_COLOR : INVALID_COLOR;
    ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);

    // Draw structure icon
    const padding = 6;
    if (state.category === 'tower') {
      const config = placement.getSelectedConfig();
      ctx.fillStyle = state.isValid ? (config ? config.color : '#888') : 'rgba(244, 67, 54, 0.6)';
      ctx.fillRect(
        tileX + padding,
        tileY + padding,
        TILE_SIZE - padding * 2,
        TILE_SIZE - padding * 2,
      );

      // Range circle for towers
      if (config && config.range > 0) {
        ctx.beginPath();
        ctx.arc(worldPos.x, worldPos.y, config.range, 0, Math.PI * 2);
        ctx.fillStyle = RANGE_COLOR;
        ctx.fill();
        ctx.strokeStyle = RANGE_BORDER_COLOR;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (state.category === 'wall') {
      ctx.fillStyle = state.isValid ? WALL_CONFIG.color : 'rgba(244, 67, 54, 0.6)';
      ctx.fillRect(tileX + 2, tileY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
  }
}
