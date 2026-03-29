export const TILE_SIZE = 32;
export const GRID_COLS = 64;
export const GRID_ROWS = 48;
export const WORLD_WIDTH = GRID_COLS * TILE_SIZE; // 2048
export const WORLD_HEIGHT = GRID_ROWS * TILE_SIZE; // 1536

// ---- Terrain — permanent ground layer, data-driven ----

export enum Terrain {
  Grass = 'grass',
  Sand = 'sand',
  Rock = 'rock',
}

export interface TerrainConfig {
  movementMultiplier: number; // 1.0 = normal, 0.6 = slow, 0.0 = impassable
  buildable: boolean; // can structures be placed on this terrain?
  color: string; // base render color
  colorAlt: string; // alternating shade for checkerboard readability
}

export const TERRAIN_CONFIG: Record<Terrain, TerrainConfig> = {
  [Terrain.Grass]: {
    movementMultiplier: 1.0,
    buildable: true,
    color: '#2a3a2a',
    colorAlt: '#253525',
  },
  [Terrain.Sand]: {
    movementMultiplier: 0.6,
    buildable: true,
    color: '#3a3520',
    colorAlt: '#35301c',
  },
  [Terrain.Rock]: {
    movementMultiplier: 0.8,
    buildable: false,
    color: '#3a3a3a',
    colorAlt: '#353535',
  },
};

// ---- Structure types — contract defined now, implemented later ----

export enum StructureKind {
  Wall = 'wall',
  Tower = 'tower',
}

export interface Structure {
  readonly kind: StructureKind;
  readonly anchor: GridCoord;
  readonly size: { rows: number; cols: number };
  health: number;
  readonly maxHealth: number;
}

export interface StructureRef {
  readonly structure: Structure;
  readonly isAnchor: boolean;
}

// ---- Tile — the two-layer contract ----

export interface Tile {
  readonly terrain: Terrain;
  structureRef: StructureRef | null;
}

// ---- Coordinate types ----

export interface GridCoord {
  row: number;
  col: number;
}

export interface WorldPos {
  x: number;
  y: number;
}

// ---- Grid class ----

export class Grid {
  readonly rows: number;
  readonly cols: number;
  private tiles: Tile[][];

  constructor(rows = GRID_ROWS, cols = GRID_COLS) {
    this.rows = rows;
    this.cols = cols;
    this.tiles = [];
    for (let r = 0; r < rows; r++) {
      this.tiles[r] = [];
      for (let c = 0; c < cols; c++) {
        this.tiles[r][c] = { terrain: Terrain.Grass, structureRef: null };
      }
    }
  }

  /** Convert world pixel position to grid coordinates. */
  worldToGrid(x: number, y: number): GridCoord {
    return {
      row: Math.floor(y / TILE_SIZE),
      col: Math.floor(x / TILE_SIZE),
    };
  }

  /** Convert grid coordinates to world pixel position (center of tile). */
  gridToWorld(row: number, col: number): WorldPos {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  isInBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  getTile(row: number, col: number): Tile | null {
    if (!this.isInBounds(row, col)) return null;
    return this.tiles[row][col];
  }

  /** Check if a tile is occupied by a structure. */
  isOccupied(row: number, col: number): boolean {
    const tile = this.getTile(row, col);
    return tile !== null && tile.structureRef !== null;
  }
}
