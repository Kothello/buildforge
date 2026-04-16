import type { BuildingConfig, Door, Window, WallSide, DoorType, LeanTo, LeanToType, CustomWalls, WallEnclosure } from './types';

const MIN_GAP = 1.0; // minimum feet between openings
const TRIM_WIDTH = 0.3;

/** Pick the wall facing the camera based on position */
export function pickVisibleWall(cam: { x: number; y: number; z: number } | null): WallSide {
  if (!cam) return 'front';
  const ax = Math.abs(cam.x);
  const az = Math.abs(cam.z);
  if (ax > az) return cam.x > 0 ? 'right' : 'left';
  return cam.z > 0 ? 'back' : 'front';
}

export function getWallAxisLength(wall: WallSide, config: BuildingConfig): number {
  return (wall === 'front' || wall === 'back') ? config.width : config.length;
}

/**
 * Pick lean-to wall facing the camera.
 * Returns { leanToId, leanToWall } if a lean-to wall is the closest match, else null.
 */
export function pickLeanToWall(
  config: BuildingConfig, cam: { x: number; y: number; z: number } | null
): { leanToId: string; leanToWall: WallSide } | null {
  if (!cam || !config.leanTos || config.leanTos.length === 0) return null;

  const mainDist = Math.sqrt(cam.x * cam.x + cam.z * cam.z);
  let best: { leanToId: string; leanToWall: WallSide; score: number } | null = null;

  for (const lt of config.leanTos) {
    // Approximate lean-to center position in world space
    let cx = 0, cz = 0;
    const parentLen = (lt.wall === 'front' || lt.wall === 'back') ? config.width : config.length;
    const offset = -parentLen / 2 + lt.position * parentLen;

    if (lt.wall === 'front') { cx = offset; cz = -config.length / 2 - lt.width / 2; }
    else if (lt.wall === 'back') { cx = offset; cz = config.length / 2 + lt.width / 2; }
    else if (lt.wall === 'left') { cx = -config.width / 2 - lt.width / 2; cz = offset; }
    else { cx = config.width / 2 + lt.width / 2; cz = offset; }

    const distToLt = Math.sqrt((cam.x - cx) ** 2 + (cam.z - cz) ** 2);
    if (distToLt >= mainDist * 0.75) continue;

    const dx = cam.x - cx;
    const dz = cam.z - cz;
    const mag = Math.sqrt(dx * dx + dz * dz);
    if (mag === 0) continue;
    const nx = dx / mag, nz = dz / mag;

    // Determine which face of the lean-to box the camera is closest to
    const candidates: Array<[WallSide, number]> = [
      ['front', -nz],
      ['back', nz],
      ['left', -nx],
      ['right', nx],
    ];
    for (const [side, score] of candidates) {
      if (score > 0.5 && (!best || score > best.score)) {
        best = { leanToId: lt.id, leanToWall: side, score };
      }
    }
  }

  return best ? { leanToId: best.leanToId, leanToWall: best.leanToWall } : null;
}

/** Get wall axis length for either a main wall or a lean-to wall */
export function getLeanToWallAxisLength(
  config: BuildingConfig, leanToId: string, leanToWall: WallSide
): number {
  const lt = (config.leanTos || []).find(x => x.id === leanToId);
  if (!lt) return 10;
  return (leanToWall === 'front' || leanToWall === 'back') ? lt.length : lt.width;
}

/** Clamp position so opening fits within wall bounds (with trim gap) */
export function clampToBounds(
  wall: WallSide, position: number, openingWidth: number, config: BuildingConfig,
  leanToId?: string, leanToWall?: WallSide
): number {
  const axis = leanToId && leanToWall
    ? getLeanToWallAxisLength(config, leanToId, leanToWall)
    : getWallAxisLength(wall, config);
  const minPos = TRIM_WIDTH + MIN_GAP;
  const maxPos = axis - TRIM_WIDTH - MIN_GAP - openingWidth;
  if (maxPos < minPos) return minPos;
  return Math.min(maxPos, Math.max(minPos, position));
}

/** Check if two openings overlap */
function overlaps(a: { position: number; width: number }, b: { position: number; width: number }): boolean {
  const aStart = a.position;
  const aEnd = a.position + a.width;
  const bStart = b.position - MIN_GAP;
  const bEnd = b.position + b.width + MIN_GAP;
  return aStart < bEnd && aEnd > bStart;
}

/** Find the next available gap on a wall for a new opening */
export function findSlot(
  wall: WallSide, openingWidth: number, config: BuildingConfig, excludeId?: string,
  leanToId?: string, leanToWall?: WallSide
): number | null {
  const axis = leanToId && leanToWall
    ? getLeanToWallAxisLength(config, leanToId, leanToWall)
    : getWallAxisLength(wall, config);

  const matchesContext = (opening: { wall: WallSide; leanToId?: string; leanToWall?: WallSide; id: string }) => {
    if (opening.id === excludeId) return false;
    if (leanToId) {
      return opening.leanToId === leanToId && opening.leanToWall === leanToWall;
    }
    return !opening.leanToId && opening.wall === wall;
  };

  const existing = [
    ...config.doors.filter(matchesContext),
    ...config.windows.filter(matchesContext),
  ];

  const candidates = [0.5, 0.25, 0.75, 0.35, 0.65, 0.15, 0.85];
  for (const ratio of candidates) {
    const pos = clampToBounds(wall, axis * ratio - openingWidth / 2, openingWidth, config, leanToId, leanToWall);
    const testOpening = { position: pos, width: openingWidth };
    if (!existing.some(e => overlaps(testOpening, e))) {
      return pos;
    }
  }

  const minPos = TRIM_WIDTH + MIN_GAP;
  const maxPos = axis - TRIM_WIDTH - MIN_GAP - openingWidth;
  const step = 0.5;
  for (let pos = minPos; pos <= maxPos; pos += step) {
    const testOpening = { position: pos, width: openingWidth };
    if (!existing.some(e => overlaps(testOpening, e))) {
      return pos;
    }
  }
  return null;
}

/** Find nearest valid (non-overlapping) position for an opening being dragged */
export function resolveNonOverlap(
  wall: WallSide, position: number, openingWidth: number, excludeId: string, config: BuildingConfig,
  leanToId?: string, leanToWall?: WallSide
): number {
  const clamped = clampToBounds(wall, position, openingWidth, config, leanToId, leanToWall);

  const matchesContext = (o: { wall: WallSide; leanToId?: string; leanToWall?: WallSide; id: string }) => {
    if (o.id === excludeId) return false;
    if (leanToId) return o.leanToId === leanToId && o.leanToWall === leanToWall;
    return !o.leanToId && o.wall === wall;
  };

  const existing = [
    ...config.doors.filter(matchesContext),
    ...config.windows.filter(matchesContext),
  ];

  const testOpening = { position: clamped, width: openingWidth };
  if (!existing.some(e => overlaps(testOpening, e))) return clamped;

  const axis = leanToId && leanToWall
    ? getLeanToWallAxisLength(config, leanToId, leanToWall)
    : getWallAxisLength(wall, config);
  const maxPos = axis - TRIM_WIDTH - MIN_GAP - openingWidth;
  const minPos = TRIM_WIDTH + MIN_GAP;

  for (let delta = 0.5; delta < axis; delta += 0.5) {
    const right = Math.min(maxPos, clamped + delta);
    const left = Math.max(minPos, clamped - delta);
    const tryPos = (p: number) => !existing.some(e => overlaps({ position: p, width: openingWidth }, e));
    if (tryPos(right)) return right;
    if (tryPos(left)) return left;
  }
  return clamped;
}

/** Add a new door — targets a lean-to wall if camera is facing one */
export function addDoor(
  config: BuildingConfig, type: DoorType, cameraAngle: { x: number; y: number; z: number } | null
): BuildingConfig | { error: string } {
  const leanToTarget = pickLeanToWall(config, cameraAngle);
  const wall = leanToTarget ? leanToTarget.leanToWall : pickVisibleWall(cameraAngle);
  const attachWall = leanToTarget ? (config.leanTos || []).find(lt => lt.id === leanToTarget.leanToId)?.wall || wall : wall;
  const size = type === 'rollup'
    ? { width: 10, height: Math.min(10, config.height - 2) }
    : { width: 3, height: 7 };

  const position = findSlot(wall, size.width, config, undefined, leanToTarget?.leanToId, leanToTarget?.leanToWall);
  if (position === null) return { error: 'Wall is full — remove items or switch walls' };

  const newDoor: Door = {
    id: `${type}-${Date.now()}`,
    type,
    wall: leanToTarget ? attachWall : wall,
    position,
    ...size,
    ...(leanToTarget ? { leanToId: leanToTarget.leanToId, leanToWall: leanToTarget.leanToWall } : {}),
  };
  return { ...config, doors: [...config.doors, newDoor] };
}

/** Add a new window — same lean-to awareness as doors */
export function addWindow(
  config: BuildingConfig, cameraAngle: { x: number; y: number; z: number } | null
): BuildingConfig | { error: string } {
  const leanToTarget = pickLeanToWall(config, cameraAngle);
  const wall = leanToTarget ? leanToTarget.leanToWall : pickVisibleWall(cameraAngle);
  const attachWall = leanToTarget ? (config.leanTos || []).find(lt => lt.id === leanToTarget.leanToId)?.wall || wall : wall;

  const position = findSlot(wall, 3, config, undefined, leanToTarget?.leanToId, leanToTarget?.leanToWall);
  if (position === null) return { error: 'Wall is full — remove items or switch walls' };

  const newWindow: Window = {
    id: `win-${Date.now()}`,
    wall: leanToTarget ? attachWall : wall,
    position,
    width: 3,
    height: 4,
    ...(leanToTarget ? { leanToId: leanToTarget.leanToId, leanToWall: leanToTarget.leanToWall } : {}),
  };
  return { ...config, windows: [...config.windows, newWindow] };
}

export function moveDoor(config: BuildingConfig, doorId: string, newPosition: number): BuildingConfig {
  const door = config.doors.find(d => d.id === doorId);
  if (!door) return config;
  const resolved = resolveNonOverlap(
    door.wall, newPosition, door.width, doorId, config,
    door.leanToId, door.leanToWall
  );
  return {
    ...config,
    doors: config.doors.map(d => d.id === doorId ? { ...d, position: resolved } : d),
  };
}

export function moveWindow(config: BuildingConfig, winId: string, newPosition: number): BuildingConfig {
  const win = config.windows.find(w => w.id === winId);
  if (!win) return config;
  const resolved = resolveNonOverlap(
    win.wall, newPosition, win.width, winId, config,
    win.leanToId, win.leanToWall
  );
  return {
    ...config,
    windows: config.windows.map(w => w.id === winId ? { ...w, position: resolved } : w),
  };
}

export function deleteDoor(config: BuildingConfig, doorId: string): BuildingConfig {
  return { ...config, doors: config.doors.filter(d => d.id !== doorId) };
}

export function deleteWindow(config: BuildingConfig, winId: string): BuildingConfig {
  return { ...config, windows: config.windows.filter(w => w.id !== winId) };
}

export function resizeDoor(
  config: BuildingConfig, doorId: string, newWidth: number, newHeight: number
): BuildingConfig {
  return {
    ...config,
    doors: config.doors.map(d => {
      if (d.id !== doorId) return d;
      // Re-clamp position if new width overflows
      const newPos = clampToBounds(d.wall, d.position, newWidth, config);
      return { ...d, width: newWidth, height: newHeight, position: newPos };
    }),
  };
}

/** Add a new lean-to attached to a given wall (or to a parent lean-to) */
export function addLeanTo(
  config: BuildingConfig, type: LeanToType, wall: WallSide, parentId?: string
): BuildingConfig {
  const parent = parentId ? (config.leanTos || []).find(lt => lt.id === parentId) : null;
  const parentLen = parent
    ? ((wall === 'front' || wall === 'back') ? parent.length : parent.width)
    : ((wall === 'front' || wall === 'back') ? config.width : config.length);
  const defaultLength = Math.min(20, Math.max(6, parentLen - 4));
  const newLeanTo: LeanTo = {
    id: `leanto-${Date.now()}`,
    type,
    wall,
    width: 12,
    length: defaultLength,
    height: parent ? parent.height : config.height,
    pitch: 2,
    position: 0.5,
    walls: {
      front: type !== 'open',
      back: type !== 'open',
      left: type !== 'open',
      right: type !== 'open',
    },
    wraparound: false,
    ...(parentId ? { parentId } : {}),
    ...(type === 'gable' ? { gableAttachmentSide: wall } : {}),
  };
  return { ...config, leanTos: [...(config.leanTos || []), newLeanTo] };
}

export function updateLeanTo(
  config: BuildingConfig, leanToId: string, updates: Partial<LeanTo>
): BuildingConfig {
  return {
    ...config,
    leanTos: (config.leanTos || []).map(lt =>
      lt.id === leanToId ? { ...lt, ...updates } : lt
    ),
  };
}

export function deleteLeanTo(config: BuildingConfig, leanToId: string): BuildingConfig {
  // Cascade: remove child lean-tos, openings on this lean-to, and openings on children
  const childIds = new Set<string>();
  const collectChildren = (id: string) => {
    for (const lt of config.leanTos || []) {
      if (lt.parentId === id) {
        childIds.add(lt.id);
        collectChildren(lt.id);
      }
    }
  };
  childIds.add(leanToId);
  collectChildren(leanToId);

  return {
    ...config,
    leanTos: (config.leanTos || []).filter(lt => !childIds.has(lt.id)),
    doors: config.doors.filter(d => !d.leanToId || !childIds.has(d.leanToId)),
    windows: config.windows.filter(w => !w.leanToId || !childIds.has(w.leanToId)),
  };
}

/** Set wall enclosure mode */
export function setWallEnclosure(
  config: BuildingConfig, mode: WallEnclosure
): BuildingConfig {
  const customWalls: CustomWalls = mode === 'fully-enclosed'
    ? { front: true, back: true, left: true, right: true }
    : mode === 'fully-open'
      ? { front: false, back: false, left: false, right: false }
      : mode === 'gable-ends'
        ? { front: true, back: true, left: false, right: false }
        : (config.customWalls || { front: true, back: true, left: true, right: true });
  return { ...config, wallEnclosure: mode, customWalls };
}

export function toggleCustomWall(
  config: BuildingConfig, side: WallSide
): BuildingConfig {
  const current = config.customWalls || { front: true, back: true, left: true, right: true };
  return {
    ...config,
    wallEnclosure: 'customize',
    customWalls: { ...current, [side]: !current[side] },
  };
}
