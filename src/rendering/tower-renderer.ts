import { TILE_SIZE, StructureKind } from '../systems/grid';
import type { Grid } from '../systems/grid';
import type { Camera } from '../systems/camera';
import { TOWER_CONFIGS } from '../entities/towers';

const TOWER_PADDING = 6;

export class TowerRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    camera: Camera,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    // Viewport culling — same as grid renderer
    const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE));
    const endCol = Math.min(grid.cols, Math.ceil((camera.x + canvasWidth) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE));
    const endRow = Math.min(grid.rows, Math.ceil((camera.y + canvasHeight) / TILE_SIZE));

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const tile = grid.getTile(r, c)!;
        if (!tile.structureRef || !tile.structureRef.isAnchor) continue;

        const structure = tile.structureRef.structure;
        if (structure.kind !== StructureKind.Tower) continue;

        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        const config = TOWER_CONFIGS[structure.configIndex];
        const color = config ? config.color : '#888';

        ctx.fillStyle = color;
        ctx.fillRect(
          x + TOWER_PADDING,
          y + TOWER_PADDING,
          TILE_SIZE - TOWER_PADDING * 2,
          TILE_SIZE - TOWER_PADDING * 2,
        );

        // Tower outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          x + TOWER_PADDING,
          y + TOWER_PADDING,
          TILE_SIZE - TOWER_PADDING * 2,
          TILE_SIZE - TOWER_PADDING * 2,
        );
      }
    }
  }
}
