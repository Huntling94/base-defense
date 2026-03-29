import { Grid, TERRAIN_CONFIG, TILE_SIZE, StructureKind } from './grid';
import type { Camera } from './camera';
import type { InputManager } from './input';
import type { GridCoord, Structure } from './grid';
import { TOWER_CONFIGS } from '../entities/towers';
import type { TowerConfig } from '../entities/towers';
import { WALL_CONFIG } from '../entities/walls';

export type PlacementCategory = 'tower' | 'wall';

export interface PlacementState {
  category: PlacementCategory | null;
  selectedIndex: number | null; // tower config index (only meaningful when category === 'tower')
  hoverTile: GridCoord | null;
  isValid: boolean;
}

const TOWER_KEYS = ['1', '2', '3', '4', '5'];

export class PlacementSystem {
  readonly state: PlacementState = {
    category: null,
    selectedIndex: null,
    hoverTile: null,
    isValid: false,
  };
  placedThisFrame: boolean = false;
  lastPlacedRow: number = 0;
  lastPlacedCol: number = 0;
  lastPlacedConfigIndex: number = 0;
  lastPlacedCategory: PlacementCategory = 'tower';

  update(input: InputManager, camera: Camera, grid: Grid): void {
    this.placedThisFrame = false;
    this.handleSelection(input);

    if (this.state.category === null) {
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
      this.placeStructure(grid, this.state.hoverTile.row, this.state.hoverTile.col);
      this.placedThisFrame = true;
      this.lastPlacedRow = this.state.hoverTile.row;
      this.lastPlacedCol = this.state.hoverTile.col;
      this.lastPlacedConfigIndex = this.state.selectedIndex ?? 0;
      this.lastPlacedCategory = this.state.category;
    }
  }

  private handleSelection(input: InputManager): void {
    if (input.isKeyDown('escape')) {
      this.state.category = null;
      this.state.selectedIndex = null;
      return;
    }

    // Q key toggles wall mode
    if (input.isKeyDown('q')) {
      if (this.state.category === 'wall') {
        this.state.category = null;
        this.state.selectedIndex = null;
      } else {
        this.state.category = 'wall';
        this.state.selectedIndex = null;
      }
      return;
    }

    // Number keys select tower type
    for (let i = 0; i < TOWER_KEYS.length; i++) {
      if (input.isKeyDown(TOWER_KEYS[i]) && i < TOWER_CONFIGS.length) {
        if (this.state.category === 'tower' && this.state.selectedIndex === i) {
          this.state.category = null;
          this.state.selectedIndex = null;
        } else {
          this.state.category = 'tower';
          this.state.selectedIndex = i;
        }
        return;
      }
    }
  }

  getSelectedConfig(): TowerConfig | null {
    if (this.state.category !== 'tower' || this.state.selectedIndex === null) return null;
    return TOWER_CONFIGS[this.state.selectedIndex];
  }

  getSelectedName(): string | null {
    if (this.state.category === 'wall') return WALL_CONFIG.name;
    if (this.state.category === 'tower' && this.state.selectedIndex !== null) {
      return TOWER_CONFIGS[this.state.selectedIndex].name;
    }
    return null;
  }

  validate(grid: Grid, row: number, col: number): boolean {
    if (!grid.isInBounds(row, col)) return false;
    const tile = grid.getTile(row, col)!;
    if (!TERRAIN_CONFIG[tile.terrain].buildable) return false;
    if (grid.isOccupied(row, col)) return false;
    return true;
  }

  private placeStructure(grid: Grid, row: number, col: number): void {
    if (this.state.category === 'tower' && this.state.selectedIndex !== null) {
      this.placeTower(grid, row, col, this.state.selectedIndex);
    } else if (this.state.category === 'wall') {
      this.placeWall(grid, row, col);
    }
  }

  private placeTower(grid: Grid, row: number, col: number, configIndex: number): void {
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

  private placeWall(grid: Grid, row: number, col: number): void {
    const structure: Structure = {
      kind: StructureKind.Wall,
      anchor: { row, col },
      size: { rows: 1, cols: 1 },
      health: WALL_CONFIG.health,
      maxHealth: WALL_CONFIG.health,
      configIndex: -1, // walls don't use TOWER_CONFIGS
    };
    const tile = grid.getTile(row, col)!;
    tile.structureRef = { structure, isAnchor: true };
  }

  getSelectedRange(): number {
    const config = this.getSelectedConfig();
    return config ? config.range : 0;
  }

  getHoverWorldPos(): { x: number; y: number } | null {
    if (this.state.hoverTile === null) return null;
    return {
      x: this.state.hoverTile.col * TILE_SIZE + TILE_SIZE / 2,
      y: this.state.hoverTile.row * TILE_SIZE + TILE_SIZE / 2,
    };
  }
}
