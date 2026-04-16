export type RoofStyle = 'gable' | 'single-slope';
export type WallSide = 'front' | 'back' | 'left' | 'right';
export type DoorType = 'rollup' | 'personnel';
export type WallEnclosure = 'fully-enclosed' | 'fully-open' | 'gable-ends' | 'customize';
export type LeanToType = 'enclosed' | 'open' | 'gable';

export interface Door {
  id: string;
  type: DoorType;
  wall: WallSide;
  position: number;
  width: number;
  height: number;
  leanToId?: string;        // if set, opening is on this lean-to's wall
  leanToWall?: WallSide;    // which of the lean-to's walls
}

export interface Window {
  id: string;
  wall: WallSide;
  position: number;
  width: number;
  height: number;
  leanToId?: string;
  leanToWall?: WallSide;
}

export interface LeanTo {
  id: string;
  type: LeanToType;
  wall: WallSide;          // which main building wall it attaches to
  width: number;            // extension depth from main wall
  length: number;           // length along the main wall
  height: number;           // starting height (matches main wall)
  pitch: number;            // roof pitch
  position: number;         // 0-1 position along the main wall
  walls: { front: boolean; back: boolean; left: boolean; right: boolean };
  // --- Advanced features ---
  parentId?: string;        // if set, attaches to another lean-to instead of main building
  wraparound?: boolean;     // if true, extends around a corner
  wraparoundCorner?: 'left' | 'right' | 'both';  // which corner(s) to wrap
  gableAttachmentSide?: WallSide;  // for 'gable' type: which way the gable ridge is oriented
}

export interface CustomWalls {
  front: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

export interface BuildingConfig {
  width: number;
  length: number;
  height: number;
  roofStyle: RoofStyle;
  roofPitch: number;
  wallColor: string;
  roofColor: string;
  trimColor: string;
  doors: Door[];
  windows: Window[];
  wallEnclosure?: WallEnclosure;
  customWalls?: CustomWalls;
  leanTos?: LeanTo[];
}

export interface BuildingSpecs {
  width: number;
  length: number;
  height: number;
  roofStyle: string;
  roofPitch: number;
  wallColor: string;
  roofColor: string;
  trimColor: string;
  doorsCount: number;
  windowsCount: number;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: Partial<BuildingConfig>;
}

export const STEEL_PRESETS: Preset[] = [
  {
    id: 'garage-40x60',
    name: '40x60 Garage',
    description: '2,400 sq ft garage with 2 rollup doors',
    config: {
      width: 40, length: 60, height: 14, roofStyle: 'gable', roofPitch: 3,
      wallColor: '#6B7280', roofColor: '#374151', trimColor: '#F9FAFB',
      doors: [
        { id: 'd1', type: 'rollup', wall: 'front', position: 10, width: 12, height: 12 },
        { id: 'd2', type: 'rollup', wall: 'front', position: 28, width: 12, height: 12 },
        { id: 'd3', type: 'personnel', wall: 'right', position: 5, width: 3, height: 7 },
      ],
      windows: [
        { id: 'w1', wall: 'left', position: 15, width: 3, height: 4 },
        { id: 'w2', wall: 'left', position: 35, width: 3, height: 4 },
      ],
    },
  },
  {
    id: 'warehouse-60x100',
    name: '60x100 Warehouse',
    description: '6,000 sq ft clear-span warehouse',
    config: {
      width: 60, length: 100, height: 20, roofStyle: 'gable', roofPitch: 2,
      wallColor: '#9CA3AF', roofColor: '#F9FAFB', trimColor: '#1F2937',
      doors: [
        { id: 'd1', type: 'rollup', wall: 'front', position: 15, width: 14, height: 14 },
        { id: 'd2', type: 'rollup', wall: 'front', position: 35, width: 14, height: 14 },
        { id: 'd3', type: 'personnel', wall: 'left', position: 5, width: 3, height: 7 },
        { id: 'd4', type: 'personnel', wall: 'right', position: 5, width: 3, height: 7 },
      ],
      windows: [],
    },
  },
  {
    id: 'barndominium-40x60',
    name: '40x60 Barndominium',
    description: '2,400 sq ft live/work barndominium',
    config: {
      width: 40, length: 60, height: 16, roofStyle: 'gable', roofPitch: 4,
      wallColor: '#78350F', roofColor: '#1F2937', trimColor: '#F9FAFB',
      doors: [
        { id: 'd1', type: 'rollup', wall: 'front', position: 5, width: 10, height: 10 },
        { id: 'd2', type: 'personnel', wall: 'front', position: 25, width: 3, height: 7 },
        { id: 'd3', type: 'personnel', wall: 'back', position: 20, width: 3, height: 7 },
      ],
      windows: [
        { id: 'w1', wall: 'front', position: 30, width: 4, height: 5 },
        { id: 'w2', wall: 'front', position: 36, width: 4, height: 5 },
        { id: 'w3', wall: 'left', position: 10, width: 3, height: 4 },
        { id: 'w4', wall: 'left', position: 25, width: 3, height: 4 },
        { id: 'w5', wall: 'left', position: 40, width: 3, height: 4 },
        { id: 'w6', wall: 'right', position: 15, width: 3, height: 4 },
        { id: 'w7', wall: 'right', position: 35, width: 3, height: 4 },
      ],
    },
  },
  {
    id: 'workshop-30x40',
    name: '30x40 Workshop',
    description: '1,200 sq ft personal workshop',
    config: {
      width: 30, length: 40, height: 12, roofStyle: 'single-slope', roofPitch: 2,
      wallColor: '#4B5563', roofColor: '#6B7280', trimColor: '#D1D5DB',
      doors: [
        { id: 'd1', type: 'rollup', wall: 'front', position: 8, width: 10, height: 10 },
        { id: 'd2', type: 'personnel', wall: 'right', position: 5, width: 3, height: 7 },
      ],
      windows: [
        { id: 'w1', wall: 'left', position: 10, width: 3, height: 4 },
        { id: 'w2', wall: 'left', position: 25, width: 3, height: 4 },
        { id: 'w3', wall: 'back', position: 15, width: 3, height: 4 },
      ],
    },
  },
];

export const DEFAULT_CONFIG: BuildingConfig = {
  width: 40,
  length: 60,
  height: 14,
  roofStyle: 'gable',
  roofPitch: 3,
  wallColor: '#9CA3AF',
  roofColor: '#4B5563',
  trimColor: '#F9FAFB',
  doors: [],
  windows: [],
  wallEnclosure: 'fully-enclosed',
  customWalls: { front: true, back: true, left: true, right: true },
  leanTos: [],
};

export const ROLLUP_SIZES = [
  { width: 10, height: 8, label: "10' x 8'" },
  { width: 10, height: 10, label: "10' x 10'" },
  { width: 12, height: 12, label: "12' x 12'" },
  { width: 12, height: 14, label: "12' x 14'" },
  { width: 14, height: 14, label: "14' x 14'" },
];

export const WALL_COLORS = [
  { value: '#6B7280', label: 'Charcoal' },
  { value: '#9CA3AF', label: 'Light Gray' },
  { value: '#F9FAFB', label: 'White' },
  { value: '#78350F', label: 'Burnished Slate' },
  { value: '#1E3A5F', label: 'Hawaiian Blue' },
  { value: '#7F1D1D', label: 'Rustic Red' },
  { value: '#14532D', label: 'Forest Green' },
  { value: '#451A03', label: 'Dark Bronze' },
  { value: '#1F2937', label: 'Black' },
];
