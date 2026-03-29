import { Grid, TERRAIN_CONFIG, TILE_SIZE } from './grid';
import type { Camera } from './camera';
import type { InputManager } from './input';
import type { GridCoord, Structure } from './grid';
import { TOWER_CONFIGS } from '../entities/towers';
import type { TowerConfig } from '../entities/towers';

export interface PlacementState {
  selectedIndex: number | null;
  hoverTile: GridCoord | null;
  isValid: boolean;
}

const SELECTION_KEYS = ['1', '2', '3', '4', '5'];

export class PlacementSystem {
  readonly state: PlacementState = {
    selectedIndex: null,
    hoverTile: null,
    isValid: false,
  };
  placedThisFrame: boolean = false;

  update(input: InputManager, camera: Camera, grid: Grid): void {
    this.placedThisFrame = false;
    this.handleSelection(input);

    if (this.state.selectedIndex === null) {
      this.state.hoverTile = null;
      this.state.isValid = false;
      return;
    }

    // Convert mouse screen → world → grid
    const world = camera.screenToWorld(input.mouseScreenX, input.mouseScreenY);
    const gridCoord = grid.worldToGrid(world.x, world.y);

    if (grid.isInBounds(gridCoord.row, gridCoord.col)) {
      this.state.hoverTile = gridCoord;
      this.state.isValid = this.validate(grid, gridCoord.row, gridCoord.col);
    } else {
      this.state.hoverTile = null;
      this.state.isValid = false;
    }

    // Place on valid left click
    if (input.wasMousePressed(0) && this.state.isValid && this.state.hoverTile !== null) {
      this.place(
        grid,
        this.state.hoverTile.row,
        this.state.hoverTile.col,
        this.state.selectedIndex,
      );
      this.placedThisFrame = true;
    }
  }

  private handleSelection(input: InputManager): void {
    // Escape deselects
    if (input.isKeyDown('escape')) {
      this.state.selectedIndex = null;
      return;
    }

    // Number keys select/toggle tower type
    for (let i = 0; i < SELECTION_KEYS.length; i++) {
      if (input.isKeyDown(SELECTION_KEYS[i]) && i < TOWER_CONFIGS.length) {
        this.state.selectedIndex = this.state.selectedIndex === i ? null : i;
        return;
      }
    }
  }

  getSelectedConfig(): TowerConfig | null {
    if (this.state.selectedIndex === null) return null;
    return TOWER_CONFIGS[this.state.selectedIndex];
  }

  validate(grid: Grid, row: number, col: number): boolean {
    if (!grid.isInBounds(row, col)) return false;
    const tile = grid.getTile(row, col)!;
    if (!TERRAIN_CONFIG[tile.terrain].buildable) return false;
    if (grid.isOccupied(row, col)) return false;
    return true;
  }

  private place(grid: Grid, row: number, col: number, configIndex: number): void {
    const config = TOWER_CONFIGS[configIndex];
    const structure: Structure = {
      kind: config.kind,
      anchor: { row, col },
      size: config.size,
      health: config.maxHealth,
      maxHealth: config.maxHealth,
      configIndex,
    };
    const tile = grid.getTile(row, col)!;
    tile.structureRef = { structure, isAnchor: true };
  }

  /** Get the range of the selected tower in pixels, for preview rendering. */
  getSelectedRange(): number {
    const config = this.getSelectedConfig();
    return config ? config.range : 0;
  }

  /** Get the world-space center of the hovered tile, for preview rendering. */
  getHoverWorldPos(): { x: number; y: number } | null {
    if (this.state.hoverTile === null) return null;
    return {
      x: this.state.hoverTile.col * TILE_SIZE + TILE_SIZE / 2,
      y: this.state.hoverTile.row * TILE_SIZE + TILE_SIZE / 2,
    };
  }
}
