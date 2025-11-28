export interface Door {
  id: string;
  type: 'rollup' | 'personnel';
  wall: 'front' | 'back' | 'left' | 'right';
  position: number;
  width: number;
  height: number;
  leanToId?: string;
  leanToWall?: 'front' | 'back' | 'left' | 'right';
}

export interface Window {
  id: string;
  wall: 'front' | 'back' | 'left' | 'right';
  position: number;
  width: number;
  height: number;
  leanToId?: string;
  leanToWall?: 'front' | 'back' | 'left' | 'right';
}

export interface LeanTo {
  id: string;
  type: 'enclosed' | 'open' | 'gable';
  wall: 'front' | 'back' | 'left' | 'right';
  width: number;
  length: number;
  pitch: number;
  height: number;
  walls: { front: boolean; back: boolean; left: boolean; right: boolean };
  isOpen: boolean;
  position: number;
  wraparound: boolean;
  wraparoundCorner?: 'left' | 'right' | 'both';
  parentId?: string;
  gableAttachmentSide?: 'front' | 'back' | 'left' | 'right';
  enclosure?: 'fully-enclosed' | 'fully-open' | 'customize';
}

export interface BuildingConfig {
  width: number;
  length: number;
  height: number;
  roofStyle: 'gable' | 'single-slope';
  roofPitch: number;
  wallColor: string;
  roofColor: string;
  trimColor: string;
  doors: Array<{ 
    id: string; 
    type: 'rollup' | 'personnel'; 
    position: number; 
    width: number; 
    height: number;
    wall?: 'front' | 'back' | 'left' | 'right';
    leanToId?: string;
    leanToWall?: 'front' | 'back' | 'left' | 'right';
  }>;
  windows: Array<{ 
    id: string; 
    position: number; 
    width: number; 
    height: number;
    wall?: 'front' | 'back' | 'left' | 'right';
    leanToId?: string;
    leanToWall?: 'front' | 'back' | 'left' | 'right';
  }>;
  leanTos: LeanTo[];
  wallEnclosure?: 'fully-enclosed' | 'fully-open' | 'gable-ends' | 'customize';
  customWalls?: { front: boolean; back: boolean; left: boolean; right: boolean };
}
