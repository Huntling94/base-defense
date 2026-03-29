import { Grid, TILE_SIZE, TERRAIN_CONFIG } from '../systems/grid';

const GRID_LINE_COLOR = 'rgba(255, 255, 255, 0.06)';

export class GridRenderer {
  render(ctx: CanvasRenderingContext2D, grid: Grid): void {
    // Draw tile fills with terrain-based colors
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const tile = grid.getTile(r, c)!;
        const config = TERRAIN_CONFIG[tile.terrain];
        const isAlt = (r + c) % 2 === 1;

        ctx.fillStyle = isAlt ? config.colorAlt : config.color;
        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw grid lines
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;

    // Vertical lines
    for (let c = 0; c <= grid.cols; c++) {
      const x = c * TILE_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, grid.rows * TILE_SIZE);
      ctx.stroke();
    }

    // Horizontal lines
    for (let r = 0; r <= grid.rows; r++) {
      const y = r * TILE_SIZE;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(grid.cols * TILE_SIZE, y);
      ctx.stroke();
    }
  }
}
