import { StructureKind } from '../systems/grid';

export interface TowerConfig {
  readonly name: string;
  readonly kind: StructureKind;
  readonly color: string;
  readonly range: number; // in pixels
  readonly cost: number; // for future economy
  readonly size: { rows: number; cols: number };
  readonly maxHealth: number;
}

export const TOWER_CONFIGS: TowerConfig[] = [
  {
    name: 'Arrow Tower',
    kind: StructureKind.Tower,
    color: '#4caf50',
    range: 128,
    cost: 50,
    size: { rows: 1, cols: 1 },
    maxHealth: 100,
  },
  {
    name: 'Cannon',
    kind: StructureKind.Tower,
    color: '#ff9800',
    range: 96,
    cost: 80,
    size: { rows: 1, cols: 1 },
    maxHealth: 120,
  },
  {
    name: 'Ice Tower',
    kind: StructureKind.Tower,
    color: '#03a9f4',
    range: 112,
    cost: 60,
    size: { rows: 1, cols: 1 },
    maxHealth: 80,
  },
  {
    name: 'Sniper',
    kind: StructureKind.Tower,
    color: '#9c27b0',
    range: 224,
    cost: 120,
    size: { rows: 1, cols: 1 },
    maxHealth: 60,
  },
  {
    name: 'Gold Mine',
    kind: StructureKind.Tower,
    color: '#ffd700',
    range: 0,
    cost: 100,
    size: { rows: 1, cols: 1 },
    maxHealth: 80,
  },
];
