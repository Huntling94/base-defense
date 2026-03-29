import { Grid, TILE_SIZE, TERRAIN_CONFIG } from '../systems/grid';
import type { Camera } from '../systems/camera';

const GRID_LINE_COLOR = 'rgba(255, 255, 255, 0.06)';

export class GridRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    // Viewport culling: only draw visible tiles
    const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
    const endCol = Math.min(grid.cols, Math.ceil((camera.x + canvasWidth) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
    const endRow = Math.min(grid.rows, Math.ceil((camera.y + canvasHeight) / TILE_SIZE));

    // Draw tile fills with terrain-based colors
    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const tile = grid.getTile(r, c)!;
        const config = TERRAIN_CONFIG[tile.terrain];
        const isAlt = (r + c) % 2 === 1;

        ctx.fillStyle = isAlt ? config.colorAlt : config.color;
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw grid lines (only visible range)
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;

    const top = startRow * TILE_SIZE;
    const bottom = endRow * TILE_SIZE;
    const left = startCol * TILE_SIZE;
    const right = endCol * TILE_SIZE;

    // Vertical lines
    for (let c = startCol; c <= endCol; c++) {
      const x = c * TILE_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    // Horizontal lines
    for (let r = startRow; r <= endRow; r++) {
      const y = r * TILE_SIZE;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
  }
}
