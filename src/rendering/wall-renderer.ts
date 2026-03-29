import { TILE_SIZE, StructureKind } from '../systems/grid';
import type { Grid } from '../systems/grid';
import type { Camera } from '../systems/camera';
import { WALL_CONFIG } from '../entities/walls';

export class WallRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
    const endCol = Math.min(grid.cols, Math.ceil((camera.x + canvasWidth) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
    const endRow = Math.min(grid.rows, Math.ceil((camera.y + canvasHeight) / TILE_SIZE));

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const tile = grid.getTile(r, c)!;
        if (!tile.structureRef || !tile.structureRef.isAnchor) continue;

        const structure = tile.structureRef.structure;
        if (structure.kind !== StructureKind.Wall) continue;

        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        // Wall fill
        ctx.fillStyle = WALL_CONFIG.color;
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        // Wall border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

        // Health bar for damaged walls
        if (structure.health < structure.maxHealth) {
          const healthPct = structure.health / structure.maxHealth;
          const barWidth = TILE_SIZE - 8;
          const barHeight = 3;
          const barX = x + 4;
          const barY = y + TILE_SIZE - 7;

          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          ctx.fillStyle = healthPct > 0.5 ? '#4caf50' : healthPct > 0.25 ? '#ff9800' : '#f44336';
          ctx.fillRect(barX, barY, barWidth * healthPct, barHeight);
        }
      }
    }
  }
}
