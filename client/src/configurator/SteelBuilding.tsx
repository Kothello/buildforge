import { useMemo, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import type { BuildingConfig, WallSide } from './types';

interface SteelBuildingProps {
  config: BuildingConfig;
  highlightedWall?: WallSide | null;
  onDoorClick?: (doorId: string) => void;
  onWindowClick?: (windowId: string) => void;
  onDoorMove?: (doorId: string, newPosition: number) => void;
  onWindowMove?: (winId: string, newPosition: number) => void;
  draggedDoorId?: string | null;
  draggedWindowId?: string | null;
  onDragStart?: (type: 'door' | 'window', id: string) => void;
  onDragEnd?: () => void;
}

// Context to pass handlers down through the tree
interface OpeningHandlers {
  config: BuildingConfig;
  onDoorClick?: (id: string) => void;
  onWindowClick?: (id: string) => void;
  onDoorMove?: (id: string, pos: number) => void;
  onWindowMove?: (id: string, pos: number) => void;
  draggedId: string | null;
  onDragStart?: (type: 'door' | 'window', id: string) => void;
  onDragEnd?: () => void;
}

/**
 * Ported from old BuildingModel.tsx principles:
 * - Building is CENTERED AT ORIGIN: x from -width/2 to +width/2, z from -length/2 to +length/2
 * - Left wall (low side for single-slope): x = -width/2, height = height
 * - Right wall (high side for single-slope): x = +width/2, height = height + roofHeight
 * - Front wall: z = -length/2
 * - Back wall: z = +length/2
 * - Gable roof: two panels at x=-width/4 and x=+width/4
 * - Single-slope roof: one panel at x=0 centered, rotated by pitch angle
 */

const WALL_THICKNESS = 0.2;
const BEAM_W = 0.25;

// ─────────────────────────────────────────────────────────────
// ROOF
// ─────────────────────────────────────────────────────────────

function Roof({ config }: { config: BuildingConfig }) {
  const { width, length, height, roofStyle, roofPitch, roofColor, trimColor } = config;
  const angle = Math.atan(roofPitch / 12);
  const roofHeight = roofStyle === 'gable'
    ? (roofPitch / 12) * (width / 2)
    : (roofPitch / 12) * width;

  if (roofStyle === 'gable') {
    const panelWidth = (width / 2) / Math.cos(angle) + 0.2;
    return (
      <group>
        <mesh
          position={[-width / 4, height + roofHeight / 2, 0]}
          rotation={[0, 0, angle]}
          castShadow receiveShadow
        >
          <boxGeometry args={[panelWidth, 0.15, length + 0.5]} />
          <meshStandardMaterial color={roofColor} metalness={0.35} roughness={0.55} />
        </mesh>
        <mesh
          position={[width / 4, height + roofHeight / 2, 0]}
          rotation={[0, 0, -angle]}
          castShadow receiveShadow
        >
          <boxGeometry args={[panelWidth, 0.15, length + 0.5]} />
          <meshStandardMaterial color={roofColor} metalness={0.35} roughness={0.55} />
        </mesh>
        {/* Ridge cap */}
        <mesh position={[0, height + roofHeight + 0.05, 0]} castShadow>
          <boxGeometry args={[0.4, 0.15, length + 0.5]} />
          <meshStandardMaterial color={trimColor} metalness={0.2} roughness={0.5} />
        </mesh>
      </group>
    );
  }

  // Single-slope
  const panelWidth = width / Math.cos(angle);
  return (
    <mesh
      position={[0, height + roofHeight / 2, 0]}
      rotation={[0, 0, angle]}
      castShadow receiveShadow
    >
      <boxGeometry args={[panelWidth, 0.15, length + 0.5]} />
      <meshStandardMaterial color={roofColor} metalness={0.35} roughness={0.55} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
// WALLS
// ─────────────────────────────────────────────────────────────

function LeftWall({ config, highlighted, handlers }: { config: BuildingConfig; highlighted: boolean; handlers: OpeningHandlers }) {
  const { width, length, height, wallColor, doors, windows } = config;
  const displayColor = highlighted ? '#60A5FA' : wallColor;
  const wallDoors = doors.filter(d => d.wall === 'left');
  const wallWindows = windows.filter(w => w.wall === 'left');

  return (
    <group position={[-width / 2, 0, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, height, length]} />
        <meshStandardMaterial color={displayColor} metalness={0.3} roughness={0.6} />
      </mesh>
      {wallDoors.map(door => (
        <WallOpening key={door.id} side="left" opening={door} wallLen={length} wallH={height} handlers={handlers} />
      ))}
      {wallWindows.map(win => (
        <WallOpening key={win.id} side="left" opening={{ ...win, type: 'window' }} wallLen={length} wallH={height} handlers={handlers} />
      ))}
    </group>
  );
}

function RightWall({ config, highlighted, handlers }: { config: BuildingConfig; highlighted: boolean; handlers: OpeningHandlers }) {
  const { width, length, height, roofStyle, roofPitch, wallColor, doors, windows } = config;
  const displayColor = highlighted ? '#60A5FA' : wallColor;
  const wallH = roofStyle === 'single-slope' ? height + (roofPitch / 12) * width : height;
  const wallDoors = doors.filter(d => d.wall === 'right');
  const wallWindows = windows.filter(w => w.wall === 'right');

  return (
    <group position={[width / 2, 0, 0]}>
      <mesh position={[0, wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, wallH, length]} />
        <meshStandardMaterial color={displayColor} metalness={0.3} roughness={0.6} />
      </mesh>
      {wallDoors.map(door => (
        <WallOpening key={door.id} side="right" opening={door} wallLen={length} wallH={wallH} handlers={handlers} />
      ))}
      {wallWindows.map(win => (
        <WallOpening key={win.id} side="right" opening={{ ...win, type: 'window' }} wallLen={length} wallH={wallH} handlers={handlers} />
      ))}
    </group>
  );
}

function FrontBackWall({
  config, side, highlighted, handlers,
}: {
  config: BuildingConfig; side: 'front' | 'back'; highlighted: boolean; handlers: OpeningHandlers;
}) {
  const { width, length, height, roofStyle, roofPitch, wallColor, doors, windows } = config;
  const displayColor = highlighted ? '#60A5FA' : wallColor;
  const roofHeight = (roofPitch / 12) * (roofStyle === 'gable' ? width / 2 : width);
  const z = side === 'front' ? -length / 2 : length / 2;

  const geo = useMemo(() => {
    const s = new THREE.Shape();
    if (roofStyle === 'gable') {
      s.moveTo(-width / 2, 0);
      s.lineTo(width / 2, 0);
      s.lineTo(width / 2, height);
      s.lineTo(0, height + roofHeight);
      s.lineTo(-width / 2, height);
      s.closePath();
    } else {
      s.moveTo(-width / 2, 0);
      s.lineTo(width / 2, 0);
      s.lineTo(width / 2, height + roofHeight);
      s.lineTo(-width / 2, height);
      s.closePath();
    }
    return new THREE.ExtrudeGeometry(s, { depth: WALL_THICKNESS, bevelEnabled: false });
  }, [width, height, roofStyle, roofHeight]);

  const wallDoors = doors.filter(d => d.wall === side);
  const wallWindows = windows.filter(w => w.wall === side);

  return (
    <group position={[0, 0, z - (side === 'front' ? WALL_THICKNESS : 0)]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial color={displayColor} metalness={0.3} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {wallDoors.map(door => (
        <WallOpening key={door.id} side={side} opening={door} wallLen={width} wallH={height} handlers={handlers} />
      ))}
      {wallWindows.map(win => (
        <WallOpening key={win.id} side={side} opening={{ ...win, type: 'window' }} wallLen={width} wallH={height} handlers={handlers} />
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// OPENINGS (doors + windows placed on walls)
// ─────────────────────────────────────────────────────────────

type OpeningData = {
  id: string;
  type: 'rollup' | 'personnel' | 'window';
  position: number; // ft from left edge of wall
  width: number;
  height: number;
};

function WallOpening({
  side, opening, wallLen, wallH, handlers,
}: {
  side: WallSide; opening: OpeningData; wallLen: number; wallH: number; handlers: OpeningHandlers;
}) {
  const { camera, raycaster, gl } = useThree();
  const dragStartRef = useRef<{ startPos: number; startPointerWorldX: number; startPointerWorldZ: number } | null>(null);

  const isWindow = opening.type === 'window';
  const localPos = -wallLen / 2 + opening.position + opening.width / 2;
  const yCenter = isWindow ? wallH * 0.45 + opening.height / 2 : opening.height / 2;

  let worldPos: [number, number, number];
  let worldRot: [number, number, number] = [0, 0, 0];

  if (side === 'left') {
    worldPos = [-WALL_THICKNESS / 2 - 0.02, yCenter, localPos];
    worldRot = [0, -Math.PI / 2, 0];
  } else if (side === 'right') {
    worldPos = [WALL_THICKNESS / 2 + 0.02, yCenter, localPos];
    worldRot = [0, Math.PI / 2, 0];
  } else if (side === 'front') {
    worldPos = [localPos, yCenter, -0.02];
    worldRot = [0, Math.PI, 0];
  } else {
    worldPos = [localPos, yCenter, WALL_THICKNESS + 0.02];
    worldRot = [0, 0, 0];
  }

  // Drag handler: map pointer movement to position along wall
  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    if (!handlers.onDragStart) return;
    handlers.onDragStart(isWindow ? 'window' : 'door', opening.id);
    dragStartRef.current = {
      startPos: opening.position,
      startPointerWorldX: e.point.x,
      startPointerWorldZ: e.point.z,
    };
    (e.target as any)?.setPointerCapture?.(e.pointerId);
  }, [handlers, opening.id, opening.position, isWindow]);

  const handlePointerMove = useCallback((e: any) => {
    if (!dragStartRef.current || handlers.draggedId !== opening.id) return;
    e.stopPropagation();

    // Calculate delta based on which wall
    let delta = 0;
    if (side === 'front' || side === 'back') {
      delta = e.point.x - dragStartRef.current.startPointerWorldX;
    } else {
      delta = e.point.z - dragStartRef.current.startPointerWorldZ;
      if (side === 'left') delta = -delta;  // left wall is reversed
    }

    const newPos = dragStartRef.current.startPos + delta;
    if (isWindow) {
      handlers.onWindowMove?.(opening.id, newPos);
    } else {
      handlers.onDoorMove?.(opening.id, newPos);
    }
  }, [handlers, opening.id, side, isWindow]);

  const handlePointerUp = useCallback((e: any) => {
    if (dragStartRef.current) {
      e.stopPropagation();
      dragStartRef.current = null;
      handlers.onDragEnd?.();
    }
  }, [handlers]);

  const handleClick = useCallback((e: any) => {
    // Only fire click if no drag occurred (distance threshold)
    if (dragStartRef.current) return;
    e.stopPropagation();
    if (isWindow) handlers.onWindowClick?.(opening.id);
    else handlers.onDoorClick?.(opening.id);
  }, [handlers, opening.id, isWindow]);

  const isDragged = handlers.draggedId === opening.id;

  return (
    <group
      position={worldPos}
      rotation={worldRot}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      {/* Frame */}
      <mesh>
        <boxGeometry args={[opening.width + 0.3, opening.height + 0.2, 0.1]} />
        <meshStandardMaterial color="#D1D5DB" metalness={0.2} roughness={0.5} />
      </mesh>
      {isWindow ? (
        <>
          {/* Glass */}
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[opening.width - 0.1, opening.height - 0.1, 0.04]} />
            <meshStandardMaterial color="#87CEEB" transparent opacity={0.35} metalness={0.1} roughness={0.1} />
          </mesh>
          {/* Cross dividers */}
          <mesh position={[0, 0, 0.07]}>
            <boxGeometry args={[0.05, opening.height - 0.15, 0.03]} />
            <meshStandardMaterial color="#C0C0C0" metalness={0.25} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0, 0.07]}>
            <boxGeometry args={[opening.width - 0.15, 0.05, 0.03]} />
            <meshStandardMaterial color="#C0C0C0" metalness={0.25} roughness={0.45} />
          </mesh>
        </>
      ) : (
        <>
          {/* Door panel */}
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[opening.width - 0.1, opening.height - 0.1, 0.08]} />
            <meshStandardMaterial
              color={opening.type === 'rollup' ? '#E5E7EB' : '#4B5563'}
              metalness={0.15} roughness={0.6}
            />
          </mesh>
          {opening.type === 'rollup' && Array.from({ length: Math.floor(opening.height / 0.6) }, (_, i) => (
            <mesh key={i} position={[0, -opening.height / 2 + (i + 0.5) * 0.6, 0.1]}>
              <boxGeometry args={[opening.width - 0.3, 0.04, 0.02]} />
              <meshStandardMaterial color="#9CA3AF" metalness={0.15} roughness={0.5} />
            </mesh>
          ))}
          {opening.type === 'personnel' && (
            <mesh position={[opening.width / 2 - 0.4, -0.3, 0.12]}>
              <boxGeometry args={[0.08, 0.25, 0.08]} />
              <meshStandardMaterial color="#9CA3AF" metalness={0.25} roughness={0.45} />
            </mesh>
          )}
        </>
      )}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// STEEL FRAME (red iron columns only)
// ─────────────────────────────────────────────────────────────

function SteelFrame({ config }: { config: BuildingConfig }) {
  const { width, length, height, roofStyle, roofPitch } = config;
  const isSingleSlope = roofStyle === 'single-slope';
  const roofHeight = isSingleSlope ? (roofPitch / 12) * width : 0;

  const getColHeight = (x: number) => isSingleSlope
    ? height + ((x + width / 2) / width) * roofHeight
    : height;

  // Corners in centered coords
  const corners: [number, number][] = [
    [-width / 2, -length / 2],
    [width / 2, -length / 2],
    [-width / 2, length / 2],
    [width / 2, length / 2],
  ];

  const spacing = 15;
  const intermediateCount = Math.max(0, Math.floor(length / spacing) - 1);
  const intermediates: [number, number][] = [];
  for (let i = 1; i <= intermediateCount; i++) {
    const z = -length / 2 + i * spacing;
    intermediates.push([-width / 2, z]);
    intermediates.push([width / 2, z]);
  }

  return (
    <group>
      {[...corners, ...intermediates].map(([x, z], i) => {
        const h = getColHeight(x);
        return (
          <mesh key={`col-${i}`} position={[x, h / 2, z]} castShadow>
            <boxGeometry args={[BEAM_W, h, BEAM_W]} />
            <meshStandardMaterial color="#8B2500" metalness={0.7} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// BASE (concrete slab)
// ─────────────────────────────────────────────────────────────

function ConcreteSlab({ width, length }: { width: number; length: number }) {
  return (
    <mesh position={[0, -0.15, 0]} receiveShadow>
      <boxGeometry args={[width + 1, 0.3, length + 1]} />
      <meshStandardMaterial color="#D1D5DB" roughness={0.9} metalness={0.0} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
// LEAN-TO (attached structure)
// ─────────────────────────────────────────────────────────────

function LeanToStructure({
  leanTo, config, allLeanTos, handlers,
}: {
  leanTo: import('./types').LeanTo;
  config: BuildingConfig;
  allLeanTos: import('./types').LeanTo[];
  handlers: OpeningHandlers;
}) {
  const { width: bw, length: bl, wallColor, roofColor, trimColor } = config;
  const ltW = leanTo.width;
  const ltL = leanTo.length;
  const ltH = leanTo.height;
  const ltPitch = leanTo.pitch;
  const leanRoofH = (ltPitch / 12) * ltW;
  const isGable = leanTo.type === 'gable';
  const gableRidgeH = isGable ? (ltPitch / 12) * (ltW / 2) : 0;

  // Compute world position & rotation — supports parent lean-to anchoring
  const parent = leanTo.parentId ? allLeanTos.find(x => x.id === leanTo.parentId) : null;

  let groupPos: [number, number, number] = [0, 0, 0];
  let groupRot: [number, number, number] = [0, 0, 0];

  // Anchor calculation: if parent lean-to exists, use parent's world position as origin
  let anchorLen: number;
  let anchorCenter: [number, number, number];

  if (parent) {
    // Use parent's footprint axes
    anchorLen = (leanTo.wall === 'front' || leanTo.wall === 'back') ? parent.length : parent.width;
    // Parent world center (recursive would be nice but for now one level of nesting)
    const parentParentLen = (parent.wall === 'front' || parent.wall === 'back') ? bw : bl;
    const parentOffset = -parentParentLen / 2 + parent.position * parentParentLen;
    let pcx = 0, pcz = 0;
    if (parent.wall === 'front') { pcx = parentOffset; pcz = -bl / 2 - parent.width / 2; }
    else if (parent.wall === 'back') { pcx = parentOffset; pcz = bl / 2 + parent.width / 2; }
    else if (parent.wall === 'left') { pcx = -bw / 2 - parent.width / 2; pcz = parentOffset; }
    else { pcx = bw / 2 + parent.width / 2; pcz = parentOffset; }
    anchorCenter = [pcx, 0, pcz];
  } else {
    anchorLen = (leanTo.wall === 'front' || leanTo.wall === 'back') ? bw : bl;
    anchorCenter = [0, 0, 0];
  }

  const parentHalfWidth = parent ? parent.width / 2 : 0;
  const parentOrientedOffset = -anchorLen / 2 + leanTo.position * anchorLen;

  // Rotations chosen so that in LOCAL coords: +X = depth direction (away from building),
  // -X = attached side (against parent wall), +Z = length axis
  if (leanTo.wall === 'front' || leanTo.wall === 'back') {
    const cx = anchorCenter[0] + parentOrientedOffset;
    const zBase = leanTo.wall === 'front'
      ? (parent ? anchorCenter[2] - parentHalfWidth - ltW / 2 : -bl / 2 - ltW / 2)
      : (parent ? anchorCenter[2] + parentHalfWidth + ltW / 2 : bl / 2 + ltW / 2);
    groupPos = [cx, 0, zBase];
    // front wall: depth extends toward -Z. Want local +X → world -Z.
    // rotation Y by -PI/2: local +X → world (cos(-π/2), 0, -sin(-π/2)) = (0,0,1) = +Z. NOT -Z.
    // rotation Y by +PI/2: local +X → (0, 0, -1) = -Z. ✓
    // back wall: depth toward +Z. rotation Y by -PI/2. local +X → +Z. ✓
    groupRot = leanTo.wall === 'front' ? [0, Math.PI / 2, 0] : [0, -Math.PI / 2, 0];
  } else {
    const cz = anchorCenter[2] + parentOrientedOffset;
    const xBase = leanTo.wall === 'left'
      ? (parent ? anchorCenter[0] - parentHalfWidth - ltW / 2 : -bw / 2 - ltW / 2)
      : (parent ? anchorCenter[0] + parentHalfWidth + ltW / 2 : bw / 2 + ltW / 2);
    groupPos = [xBase, 0, cz];
    // right wall: depth toward +X. No rotation needed. local +X → +X.
    // left wall: depth toward -X. rotation PI. local +X → -X.
    groupRot = leanTo.wall === 'left' ? [0, Math.PI, 0] : [0, 0, 0];
  }

  const isOpen = leanTo.type === 'open';
  const showFront = leanTo.walls.front && !isOpen;
  const showBack = leanTo.walls.back && !isOpen;
  const showLeft = leanTo.walls.left && !isOpen;
  const showRight = leanTo.walls.right && !isOpen;

  // Gable orientation: if gableAttachmentSide runs perpendicular to attachment, gable ridge runs along depth (X)
  // If parallel, ridge runs along length (Z)
  const gableRidgeAlongLength = isGable && (leanTo.gableAttachmentSide === 'front' || leanTo.gableAttachmentSide === 'back');

  // Convention:
  // - Local +X = FAR side (away from building, LOW — water drains away)
  // - Local -X = ATTACHED side (against parent wall, HIGH)
  // LeanToRoof & LeanToEndWall use: heightHigh at +X, heightLow at -X.
  // So pass heightHigh = LOW value, heightLow = HIGH value (the parameter NAMES are just labels):
  const heightHigh = ltH - leanRoofH;  // at +X (far side, low)
  const heightLow = ltH;                // at -X (attached side, high)

  // Wraparound geometry — renders a second segment around the corner
  const hasWraparound = !!leanTo.wraparound;
  const wrapSide = leanTo.wraparoundCorner; // 'left' | 'right' | 'both'

  return (
    <group position={groupPos} rotation={groupRot}>
      {/* Concrete slab */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[ltW + 0.5, 0.3, ltL + 0.5]} />
        <meshStandardMaterial color="#D1D5DB" roughness={0.9} metalness={0} />
      </mesh>

      {/* Far-side wall (opposite from parent attachment, at +X side) */}
      {showFront && !isGable && (
        <LeanToSideWall
          config={config} leanToId={leanTo.id} wallSide="front"
          width={ltL} height={heightHigh} color={wallColor}
          position={[ltW / 2 + WALL_THICKNESS / 2, heightHigh / 2, 0]}
          rotation={[0, Math.PI / 2, 0]}
          handlers={handlers}
        />
      )}

      {/* Left end wall (trapezoid for lean-to, full rect for gable) */}
      {showLeft && (
        isGable ? (
          <LeanToSideWall
            config={config} leanToId={leanTo.id} wallSide="left"
            width={ltW} height={ltH + gableRidgeH / 2} color={wallColor}
            position={[0, (ltH + gableRidgeH / 2) / 2, -ltL / 2 - WALL_THICKNESS / 2]}
            rotation={[0, 0, 0]}
            handlers={handlers}
          />
        ) : (
          <LeanToEndWall
            width={ltW} heightHigh={heightHigh} heightLow={heightLow}
            position={[0, 0, -ltL / 2 - WALL_THICKNESS / 2]}
            rotation={[0, 0, 0]}
            color={wallColor}
          />
        )
      )}
      {/* Right end wall */}
      {showRight && (
        isGable ? (
          <LeanToSideWall
            config={config} leanToId={leanTo.id} wallSide="right"
            width={ltW} height={ltH + gableRidgeH / 2} color={wallColor}
            position={[0, (ltH + gableRidgeH / 2) / 2, ltL / 2 + WALL_THICKNESS / 2]}
            rotation={[0, 0, 0]}
            handlers={handlers}
          />
        ) : (
          <LeanToEndWall
            width={ltW} heightHigh={heightHigh} heightLow={heightLow}
            position={[0, 0, ltL / 2 + WALL_THICKNESS / 2]}
            rotation={[0, 0, 0]}
            color={wallColor}
          />
        )
      )}

      {/* Roof */}
      {isGable ? (
        <LeanToGableRoof
          width={ltW} length={ltL} height={ltH}
          pitch={ltPitch} color={roofColor}
          ridgeAlongLength={gableRidgeAlongLength}
        />
      ) : (
        <LeanToRoof
          width={ltW} length={ltL}
          heightHigh={heightHigh} heightLow={heightLow}
          color={roofColor}
        />
      )}

      {/* Trim at FAR-side eave (low side, at +X) */}
      {!isGable && (
        <mesh position={[ltW / 2, heightHigh - 0.1, 0]} castShadow>
          <boxGeometry args={[0.25, 0.2, ltL + 0.3]} />
          <meshStandardMaterial color={trimColor} metalness={0.2} roughness={0.5} />
        </mesh>
      )}

      {/* Red iron columns at 4 corners — low on far (+X), high on attached (-X) */}
      {[[-ltW / 2, -ltL / 2], [-ltW / 2, ltL / 2], [ltW / 2, -ltL / 2], [ltW / 2, ltL / 2]].map(([x, z], i) => {
        const h = isGable ? ltH : (x === -ltW / 2 ? heightLow : heightHigh);
        return (
          <mesh key={`lt-col-${i}`} position={[x, h / 2, z]} castShadow>
            <boxGeometry args={[BEAM_W, h, BEAM_W]} />
            <meshStandardMaterial color="#8B2500" metalness={0.7} roughness={0.5} />
          </mesh>
        );
      })}

      {/* Wraparound extension — another leg around the corner */}
      {hasWraparound && (wrapSide === 'left' || wrapSide === 'both') && (
        <LeanToWrapArm side="left" ltW={ltW} ltL={ltL} ltH={ltH} leanRoofH={leanRoofH} wallColor={wallColor} roofColor={roofColor} trimColor={trimColor} />
      )}
      {hasWraparound && (wrapSide === 'right' || wrapSide === 'both') && (
        <LeanToWrapArm side="right" ltW={ltW} ltL={ltL} ltH={ltH} leanRoofH={leanRoofH} wallColor={wallColor} roofColor={roofColor} trimColor={trimColor} />
      )}
    </group>
  );
}

/** Renders a simple rectangular wall of a lean-to with door/window cutouts */
function LeanToSideWall({
  config, leanToId, wallSide, width, height, color, position, rotation, handlers,
}: {
  config: BuildingConfig; leanToId: string; wallSide: WallSide;
  width: number; height: number; color: string;
  position: [number, number, number]; rotation: [number, number, number];
  handlers: OpeningHandlers;
}) {
  const wallDoors = config.doors.filter(d => d.leanToId === leanToId && d.leanToWall === wallSide);
  const wallWindows = config.windows.filter(w => w.leanToId === leanToId && w.leanToWall === wallSide);

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, WALL_THICKNESS]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
      </mesh>
      {wallDoors.map(door => (
        <WallOpening key={door.id} side={wallSide} opening={door} wallLen={width} wallH={height} handlers={handlers} />
      ))}
      {wallWindows.map(win => (
        <WallOpening key={win.id} side={wallSide} opening={{ ...win, type: 'window' }} wallLen={width} wallH={height} handlers={handlers} />
      ))}
    </group>
  );
}

/** Gable-roof lean-to (ridge in middle, two sloping panels) */
function LeanToGableRoof({
  width, length, height, pitch, color, ridgeAlongLength,
}: {
  width: number; length: number; height: number; pitch: number; color: string; ridgeAlongLength: boolean;
}) {
  const angle = Math.atan(pitch / 12);
  const halfSpan = ridgeAlongLength ? length / 2 : width / 2;
  const ridgeH = (pitch / 12) * halfSpan;
  const panelLen = halfSpan / Math.cos(angle) + 0.2;
  const perpLen = ridgeAlongLength ? width : length;

  if (ridgeAlongLength) {
    // Ridge runs along Z (length), two panels slope along X
    return (
      <group position={[0, height, 0]}>
        <mesh position={[-width / 4, ridgeH / 2, 0]} rotation={[0, 0, angle]} castShadow receiveShadow>
          <boxGeometry args={[panelLen, 0.15, length + 0.3]} />
          <meshStandardMaterial color={color} metalness={0.35} roughness={0.55} />
        </mesh>
        <mesh position={[width / 4, ridgeH / 2, 0]} rotation={[0, 0, -angle]} castShadow receiveShadow>
          <boxGeometry args={[panelLen, 0.15, length + 0.3]} />
          <meshStandardMaterial color={color} metalness={0.35} roughness={0.55} />
        </mesh>
      </group>
    );
  }

  // Ridge runs along X (width), two panels slope along Z
  return (
    <group position={[0, height, 0]}>
      <mesh position={[0, ridgeH / 2, -length / 4]} rotation={[-angle, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.3, 0.15, panelLen]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.55} />
      </mesh>
      <mesh position={[0, ridgeH / 2, length / 4]} rotation={[angle, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.3, 0.15, panelLen]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.55} />
      </mesh>
    </group>
  );
}

/** Wraparound arm — extends perpendicular to main lean-to along its left or right end */
function LeanToWrapArm({
  side, ltW, ltL, ltH, leanRoofH, wallColor, roofColor, trimColor,
}: {
  side: 'left' | 'right';
  ltW: number; ltL: number; ltH: number; leanRoofH: number;
  wallColor: string; roofColor: string; trimColor: string;
}) {
  const armLen = ltW;  // wrap arm extends same depth
  const sideSign = side === 'left' ? -1 : 1;
  // Wraparound arm sits perpendicular, rotated 90°
  const localZ = sideSign * (ltL / 2 + armLen / 2);

  return (
    <group position={[0, 0, localZ]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[ltW + 0.5, 0.3, armLen + 0.5]} />
        <meshStandardMaterial color="#D1D5DB" roughness={0.9} metalness={0} />
      </mesh>
      <LeanToRoof
        width={ltW} length={armLen}
        heightHigh={ltH} heightLow={ltH - leanRoofH}
        color={roofColor}
      />
      {/* Far side wall */}
      <mesh position={[-ltW / 2, (ltH - leanRoofH) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICKNESS, ltH - leanRoofH, armLen]} />
        <meshStandardMaterial color={wallColor} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Outer end wall */}
      <LeanToEndWall
        width={ltW} heightHigh={ltH} heightLow={ltH - leanRoofH}
        position={[0, 0, sideSign * (armLen / 2 + WALL_THICKNESS / 2)]}
        rotation={[0, 0, 0]}
        color={wallColor}
      />
      {/* Eave trim */}
      <mesh position={[-ltW / 2, ltH - leanRoofH - 0.1, 0]} castShadow>
        <boxGeometry args={[0.25, 0.2, armLen + 0.3]} />
        <meshStandardMaterial color={trimColor} metalness={0.2} roughness={0.5} />
      </mesh>
    </group>
  );
}

function LeanToEndWall({
  width, heightHigh, heightLow, position, rotation, color,
}: {
  width: number; heightHigh: number; heightLow: number;
  position: [number, number, number]; rotation: [number, number, number]; color: string;
}) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    // In local space: width runs along X axis (centered), height along Y
    // Attached side (X = +width/2) is at heightHigh
    // Far side (X = -width/2) is at heightLow
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(width / 2, heightHigh);
    s.lineTo(-width / 2, heightLow);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: WALL_THICKNESS, bevelEnabled: false });
  }, [width, heightHigh, heightLow]);

  return (
    <mesh geometry={geo} position={position} rotation={rotation} castShadow receiveShadow>
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

function LeanToRoof({ width, length, heightHigh, heightLow, color }: {
  width: number; length: number; heightHigh: number; heightLow: number; color: string;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // Quad: low-edge at x=-width/2 y=heightLow, high-edge at x=+width/2 y=heightHigh
    const positions = new Float32Array([
      -width / 2, heightLow, -length / 2,
      width / 2, heightHigh, -length / 2,
      width / 2, heightHigh, length / 2,
      -width / 2, heightLow, -length / 2,
      width / 2, heightHigh, length / 2,
      -width / 2, heightLow, length / 2,
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.computeVertexNormals();
    return g;
  }, [width, length, heightHigh, heightLow]);

  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial color={color} metalness={0.35} roughness={0.55} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function SteelBuilding({
  config, highlightedWall, onDoorClick, onWindowClick, onDoorMove, onWindowMove,
  draggedDoorId, draggedWindowId, onDragStart, onDragEnd,
}: SteelBuildingProps) {
  const handlers: OpeningHandlers = {
    config,
    onDoorClick,
    onWindowClick,
    onDoorMove,
    onWindowMove,
    draggedId: draggedDoorId || draggedWindowId || null,
    onDragStart,
    onDragEnd,
  };

  // Determine which main walls to show based on enclosure mode
  const enclosure = config.wallEnclosure || 'fully-enclosed';
  const custom = config.customWalls || { front: true, back: true, left: true, right: true };
  const showWall = (side: WallSide): boolean => {
    if (enclosure === 'fully-enclosed') return true;
    if (enclosure === 'fully-open') return false;
    if (enclosure === 'gable-ends') return side === 'front' || side === 'back';
    return custom[side];
  };

  const leanTos = config.leanTos || [];

  return (
    <group>
      <ConcreteSlab width={config.width} length={config.length} />
      <SteelFrame config={config} />
      {showWall('left') && <LeftWall config={config} highlighted={highlightedWall === 'left'} handlers={handlers} />}
      {showWall('right') && <RightWall config={config} highlighted={highlightedWall === 'right'} handlers={handlers} />}
      {showWall('front') && <FrontBackWall config={config} side="front" highlighted={highlightedWall === 'front'} handlers={handlers} />}
      {showWall('back') && <FrontBackWall config={config} side="back" highlighted={highlightedWall === 'back'} handlers={handlers} />}
      <Roof config={config} />
      {leanTos.map(lt => (
        <LeanToStructure key={lt.id} leanTo={lt} config={config} allLeanTos={leanTos} handlers={handlers} />
      ))}
    </group>
  );
}
