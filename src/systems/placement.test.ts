// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { PlacementSystem } from './placement';
import { Grid, Terrain, StructureKind, TILE_SIZE } from './grid';
import { Camera } from './camera';
import { InputManager } from './input';
import { TOWER_CONFIGS } from '../entities/towers';
import type { Structure, StructureRef } from './grid';

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  return canvas;
}

function pressKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

function releaseKey(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { key }));
}

describe('PlacementSystem', () => {
  let placement: PlacementSystem;
  let grid: Grid;
  let camera: Camera;
  let input: InputManager;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    placement = new PlacementSystem();
    grid = new Grid(10, 10);
    camera = new Camera();
    canvas = createCanvas();
    input = new InputManager(canvas);
  });

  describe('validation', () => {
    it('returns true for empty buildable tile', () => {
      expect(placement.validate(grid, 0, 0)).toBe(true);
    });

    it('returns false for out-of-bounds tile', () => {
      expect(placement.validate(grid, -1, 0)).toBe(false);
      expect(placement.validate(grid, 10, 0)).toBe(false);
    });

    it('returns false for occupied tile', () => {
      const structure: Structure = {
        kind: StructureKind.Tower,
        anchor: { row: 0, col: 0 },
        size: { rows: 1, cols: 1 },
        health: 100,
        maxHealth: 100,
        configIndex: 0,
      };
      const tile = grid.getTile(0, 0)!;
      tile.structureRef = { structure, isAnchor: true };

      expect(placement.validate(grid, 0, 0)).toBe(false);
    });

    it('returns false for unbuildable terrain', () => {
      // Rock terrain is not buildable
      // We need to modify the tile's terrain — getTile returns the actual tile object
      // Since terrain is readonly on the interface, we cast for testing
      const tile = grid.getTile(1, 1)! as { terrain: Terrain; structureRef: StructureRef | null };
      tile.terrain = Terrain.Rock;

      expect(placement.validate(grid, 1, 1)).toBe(false);
    });
  });

  describe('selection', () => {
    it('starts with no selection', () => {
      expect(placement.state.category).toBeNull();
      expect(placement.state.selectedIndex).toBeNull();
    });

    it('selects tower type on number key press', () => {
      pressKey('1');
      placement.update(input, camera, grid);
      expect(placement.state.category).toBe('tower');
      expect(placement.state.selectedIndex).toBe(0);
      releaseKey('1');
    });

    it('selects wall mode on Q key', () => {
      pressKey('q');
      placement.update(input, camera, grid);
      expect(placement.state.category).toBe('wall');
      releaseKey('q');
    });

    it('deselects on pressing same number key', () => {
      pressKey('1');
      placement.update(input, camera, grid);
      releaseKey('1');
      expect(placement.state.category).toBe('tower');

      pressKey('1');
      placement.update(input, camera, grid);
      releaseKey('1');
      expect(placement.state.category).toBeNull();
    });

    it('deselects on Escape', () => {
      pressKey('1');
      placement.update(input, camera, grid);
      releaseKey('1');
      expect(placement.state.category).toBe('tower');

      pressKey('Escape');
      placement.update(input, camera, grid);
      releaseKey('Escape');
      expect(placement.state.category).toBeNull();
    });

    it('getSelectedConfig returns config when selected', () => {
      pressKey('2');
      placement.update(input, camera, grid);
      releaseKey('2');

      const config = placement.getSelectedConfig();
      expect(config).not.toBeNull();
      expect(config!.name).toBe(TOWER_CONFIGS[1].name);
    });

    it('getSelectedConfig returns null when nothing selected', () => {
      expect(placement.getSelectedConfig()).toBeNull();
    });
  });

  describe('hover tracking', () => {
    it('sets hoverTile to null when nothing is selected', () => {
      placement.update(input, camera, grid);
      expect(placement.state.hoverTile).toBeNull();
    });

    it('tracks hovered tile when tower is selected', () => {
      pressKey('1');
      placement.update(input, camera, grid);
      releaseKey('1');

      // Mouse at pixel (TILE_SIZE * 3 + 5, TILE_SIZE * 2 + 5) should hover tile (2, 3)
      const event = new MouseEvent('mousemove', { clientX: 0, clientY: 0 });
      Object.defineProperty(event, 'offsetX', { value: TILE_SIZE * 3 + 5 });
      Object.defineProperty(event, 'offsetY', { value: TILE_SIZE * 2 + 5 });
      canvas.dispatchEvent(event);

      placement.update(input, camera, grid);
      expect(placement.state.hoverTile).toEqual({ row: 2, col: 3 });
    });
  });

  describe('placement execution', () => {
    it('places tower on valid left click', () => {
      // Select tower type 1
      pressKey('1');
      placement.update(input, camera, grid);
      releaseKey('1');

      // Move mouse to tile (2, 3)
      const moveEvent = new MouseEvent('mousemove', { clientX: 0, clientY: 0 });
      Object.defineProperty(moveEvent, 'offsetX', { value: TILE_SIZE * 3 + 5 });
      Object.defineProperty(moveEvent, 'offsetY', { value: TILE_SIZE * 2 + 5 });
      canvas.dispatchEvent(moveEvent);

      // Click
      canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      placement.update(input, camera, grid);

      // Verify tile is now occupied
      expect(grid.isOccupied(2, 3)).toBe(true);
      const tile = grid.getTile(2, 3)!;
      expect(tile.structureRef!.isAnchor).toBe(true);
      expect(tile.structureRef!.structure.kind).toBe(TOWER_CONFIGS[0].kind);
      expect(tile.structureRef!.structure.health).toBe(TOWER_CONFIGS[0].maxHealth);
    });

    it('does not place on invalid tile', () => {
      // Make tile unbuildable
      const tile = grid.getTile(2, 3)! as { terrain: Terrain; structureRef: StructureRef | null };
      tile.terrain = Terrain.Rock;

      pressKey('1');
      placement.update(input, camera, grid);
      releaseKey('1');

      const moveEvent = new MouseEvent('mousemove', { clientX: 0, clientY: 0 });
      Object.defineProperty(moveEvent, 'offsetX', { value: TILE_SIZE * 3 + 5 });
      Object.defineProperty(moveEvent, 'offsetY', { value: TILE_SIZE * 2 + 5 });
      canvas.dispatchEvent(moveEvent);

      canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      placement.update(input, camera, grid);

      expect(grid.isOccupied(2, 3)).toBe(false);
    });
  });
});
