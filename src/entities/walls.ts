export interface WallConfig {
  readonly name: string;
  readonly health: number;
  readonly cost: number;
  readonly color: string;
}

export const WALL_CONFIG: WallConfig = {
  name: 'Wall',
  health: 200,
  cost: 10,
  color: '#8d6e63',
};
