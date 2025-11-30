import { useRef, useMemo, useEffect, Fragment, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Door, Window } from './types';

interface BuildingModelProps {
  width: number;
  length: number;
  height: number;
  wallColor: string;
  roofColor: string;
  trimColor: string;
  roofStyle: 'gable' | 'single-slope';
  roofPitch: number;
  doors: Door[];
  windows: Window[];
  onDoorClick: (doorId: string) => void;
  onWindowClick: (windowId: string) => void;
  onDoorMove: (doorId: string, newPosition: number) => void;
  controlsRef: React.RefObject<any>;
  draggedDoorId: string | null;
  onDraggedDoorIdChange: (id: string | null) => void;
  onWindowMove: (windowId: string, newPosition: number) => void;
  draggedWindowId: string | null;
  onDraggedWindowIdChange: (id: string | null) => void;
  wallEnclosure: 'fully-enclosed' | 'fully-open' | 'gable-ends' | 'customize';
  customWalls: { front: boolean; back: boolean; left: boolean; right: boolean };
  leanTos: Array<{
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
  }>;
  leanToEditMode: boolean;
  leanToDragPositions: Map<string, number>;
  onLeanToMove: (leanToId: string, newPosition: number, isDragging: boolean) => void;
  highlightedWall?: {
    wall: 'front' | 'back' | 'left' | 'right';
    leanToId?: string;
    leanToWall?: 'front' | 'back' | 'left' | 'right';
  } | null;
  onWallClick?: (wall: 'front' | 'back' | 'left' | 'right', leanToId?: string, leanToWall?: 'front' | 'back' | 'left' | 'right') => void;
}

export const BuildingModel = ({ 
  width, 
  length, 
  height, 
  wallColor,
  roofColor,
  trimColor,
  roofStyle,
  roofPitch,
  doors,
  windows,
  onDoorClick,
  onWindowClick,
  onDoorMove,
  controlsRef,
  draggedDoorId,
  onDraggedDoorIdChange,
  onWindowMove,
  draggedWindowId,
  onDraggedWindowIdChange,
  wallEnclosure,
  customWalls,
  leanTos,
  leanToEditMode,
  leanToDragPositions,
  onLeanToMove,
  highlightedWall,
  onWallClick
}: BuildingModelProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, raycaster, pointer, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ position: number; pointerX: number; pointerZ: number; rafId?: number | null; latestPosition?: number; leanToId?: string } | null>(null);
  const leanToGroupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const doorGroupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const windowGroupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const doorDragState = useRef<Map<string, { startPosition: number; unclamped: number }>>(new Map());
  const windowDragState = useRef<Map<string, { startPosition: number; unclamped: number }>>(new Map());
  const [localDraggedDoorId, setLocalDraggedDoorId] = useState<string | null>(null);
  const [localDraggedWindowId, setLocalDraggedWindowId] = useState<string | null>(null);
  const dragPlaneRef = useRef<THREE.Plane | null>(null);
  const dragOffsetRef = useRef<number>(0);
  const lastDoorURef = useRef<Record<string, number>>({});
  const lastWindowURef = useRef<Record<string, number>>({});

  // Global safety: ensure lean-to drag is cancelled if pointer is released anywhere
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging && dragStartRef.current) {
        setIsDragging(false);
        dragStartRef.current = null;
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [isDragging]);

  // Highlight material for edit mode - renders behind building geometry
  const highlightMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#3b82f6'),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    });
  }, []);

  // Separate material instance for lean-to highlights to avoid rendering issues in rotated groups
  const leanToHighlightMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#3b82f6'),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    });
  }, []);

  // Automatic rotation disabled for manual control
  // useFrame(() => {
  //   if (groupRef.current) {
  //     groupRef.current.rotation.y += 0.002;
  //   }
  // });


  const resolveColor = (input: string) => {
    if (!input) return '#ffffff';
    try {
      if (input.includes('var(')) {
        const m = input.match(/var\((--[^)]+)\)/);
        const name = m?.[1];
        if (name) {
          const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
          if (val) {
            // Check if it's HSL format (e.g., "210 20% 98%" or "210 20 98")
            if (/^\d+\.?\d*\s+\d+\.?\d*%?\s+\d+\.?\d*%?$/.test(val)) {
              return `hsl(${val.replace(/\s+/g, ', ')})`;
            }
            return val;
          }
        }
      }
    } catch (e) {}
    return input;
  };

  // Procedural, perfectly seamless corrugation using bump map only
  const createCorrugatedBump = (w = 512, h = 512, ribs = 32) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    // Base mid-gray for neutral bump
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);

    // Vertical sine-based ribs for smooth, seamless tiling
    for (let x = 0; x < w; x++) {
      const t = (x / w) * ribs * Math.PI * 2;
      const v = (Math.sin(t) * 0.5 + 0.5) * 0.6 + 0.2; // stay away from extremes
      const g = Math.round(v * 255);
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(x, 0, 1, h);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    tex.needsUpdate = true;
    return tex;
  };

  const wallBump = useMemo(() => createCorrugatedBump(512, 512, 28), []);
  const roofBump = useMemo(() => {
    const t = createCorrugatedBump(512, 512, 28);
    t.rotation = Math.PI / 2; // ribs "vertical" along the slope direction
    t.center.set(0.5, 0.5);
    return t;
  }, []);
  const hipRoofBump = useMemo(() => {
    const t = roofBump.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 16;
    t.center.set(0.5, 0.5);
    t.repeat.set(1, 1); // let UVs control world scale directly for hips
    t.needsUpdate = true;
    return t;
  }, [roofBump]);

  const wallMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: resolveColor(wallColor),
      metalness: 0.9,
      roughness: 0.2,
      bumpMap: wallBump,
      bumpScale: 0.3,
      side: THREE.DoubleSide,
    });
    wallBump.repeat.set(Math.max(1, width / 10), Math.max(1, height / 10));
    return mat;
  }, [wallBump, width, height, wallColor]);

  // Dedicated bump textures/materials for end caps to match corrugation scale
  const gableWallBump = useMemo(() => wallBump.clone(), [wallBump]);
  const gableMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: resolveColor(wallColor),
      metalness: 0.9,
      roughness: 0.2,
      bumpMap: gableWallBump,
      bumpScale: 0.3,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    gableWallBump.wrapS = gableWallBump.wrapT = THREE.RepeatWrapping;
    gableWallBump.anisotropy = 16;
    gableWallBump.center.set(0.5, 0.5);
    const capRoofHeight = roofStyle === 'gable' ? (roofPitch / 12) * (width / 2) : (roofPitch / 12) * width;
    gableWallBump.repeat.set(1, 1);
    gableWallBump.needsUpdate = true;
    return mat;
  }, [gableWallBump, width, roofStyle, roofPitch, wallColor]);

  // Lean-to gable uses same material as main gable to ensure consistency




  const singleSlopeEndBump = useMemo(() => wallBump.clone(), [wallBump]);
  const singleSlopeEndMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: resolveColor(wallColor),
      metalness: 0.9,
      roughness: 0.2,
      bumpMap: singleSlopeEndBump,
      bumpScale: 0.3,
      side: THREE.DoubleSide,
    });
    singleSlopeEndBump.wrapS = singleSlopeEndBump.wrapT = THREE.RepeatWrapping;
    singleSlopeEndBump.anisotropy = 16;
    singleSlopeEndBump.center.set(0.5, 0.5);
    const capRoofHeight = roofStyle === 'gable' ? (roofPitch / 12) * (width / 2) : (roofPitch / 12) * width;
    singleSlopeEndBump.repeat.set(1, 1);
    singleSlopeEndBump.needsUpdate = true;
    return mat;
  }, [singleSlopeEndBump, width, height, roofStyle, roofPitch, wallColor]);

  const roofMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: resolveColor(roofColor),
      metalness: 0.9,
      roughness: 0.24,
      bumpMap: roofBump,
      bumpScale: 0.3,
    });
    roofBump.repeat.set(Math.max(1, length / 10), Math.max(1, width / 10));
    return mat;
  }, [roofBump, width, length, roofColor]);

  // Non-corrugated trim (corner posts, etc.) - recreate when trimColor changes
  const trimMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: resolveColor(trimColor),
      metalness: 0.8,
      roughness: 0.35,
    });
    return mat;
  }, [trimColor]);

  // Force-sync colors across all related materials whenever props change
  useEffect(() => {
    const c = resolveColor(wallColor);
    [wallMaterial, gableMaterial, singleSlopeEndMaterial].forEach((m) => {
      if (m) {
        m.color.set(c);
        m.needsUpdate = true;
      }
    });
  }, [wallColor, wallMaterial, gableMaterial, singleSlopeEndMaterial]);

  useEffect(() => {
    const c = resolveColor(roofColor);
    if (roofMaterial) {
      roofMaterial.color.set(c);
      roofMaterial.needsUpdate = true;
    }
  }, [roofColor, roofMaterial]);

  useEffect(() => {
    const c = resolveColor(trimColor);
    if (trimMaterial) {
      trimMaterial.color.set(c);
      trimMaterial.needsUpdate = true;
    }
  }, [trimColor, trimMaterial]);

  const beamMaterial = new THREE.MeshStandardMaterial({ 
    color: '#8B4513',
    metalness: 0.8,
    roughness: 0.3
  });

  // Create I-beam cross-section shape with directional tapering
  const createIBeamGeometry = (length: number, taper: 'symmetric' | 'left' | 'right' | 'vertical' | 'none' = 'symmetric', scale: number = 1.0) => {
    const flangeWidth = 1.0 * scale;  // Wider flanges for dramatic look
    const flangeThickness = 0.12 * scale;
    const webThickness = 0.06 * scale;
    const beamHeight = 0.85 * scale;

    const shape = new THREE.Shape();
    // Bottom flange
    shape.moveTo(-flangeWidth / 2, 0);
    shape.lineTo(flangeWidth / 2, 0);
    shape.lineTo(flangeWidth / 2, flangeThickness);
    shape.lineTo(webThickness / 2, flangeThickness);
    // Web
    shape.lineTo(webThickness / 2, beamHeight - flangeThickness);
    // Top flange
    shape.lineTo(flangeWidth / 2, beamHeight - flangeThickness);
    shape.lineTo(flangeWidth / 2, beamHeight);
    shape.lineTo(-flangeWidth / 2, beamHeight);
    shape.lineTo(-flangeWidth / 2, beamHeight - flangeThickness);
    shape.lineTo(-webThickness / 2, beamHeight - flangeThickness);
    // Web back
    shape.lineTo(-webThickness / 2, flangeThickness);
    shape.lineTo(-flangeWidth / 2, flangeThickness);
    shape.closePath();

    const extrudeSettings = {
      steps: 40,
      depth: length,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Align beam so its length runs along +X
    geometry.rotateY(Math.PI / 2);
    geometry.center();

    // Aggressive tapering: widest at eave, narrow toward ridge (for gable)
    const minScale = 0.3;  // at ridge/center/bottom
    const maxScale = 1.5;  // at eave/top

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i); // along beam length (centered)
      const nx = (x + length / 2) / length; // 0 at -L/2, 1 at +L/2

      let edgeWeight = 1 - Math.abs((x) / (length / 2)); // symmetric by default: 1 at edges, 0 at center
      if (taper === 'left') {
        // Eave on -X end: 1 at -L/2 (nx=0), 0 at +L/2 (nx=1)
        edgeWeight = 1 - nx;
      } else if (taper === 'right') {
        // Eave on +X end: 0 at -L/2, 1 at +L/2
        edgeWeight = nx;
      } else if (taper === 'vertical') {
        // For vertical columns: narrow at bottom (nx=0), wide at top (nx=1)
        edgeWeight = nx;
      } else if (taper === 'none') {
        // No taper - uniform scale
        edgeWeight = 0.5;
      }
      const scale = minScale + (maxScale - minScale) * edgeWeight;

      const y = pos.getY(i);
      const z = pos.getZ(i);
      pos.setY(i, y * scale);
      pos.setZ(i, z * scale);
    }

    // Reorient geometry for vertical columns so length -> Y and web sits flush to side wall
    if (taper === 'vertical') {
      // Rotate so X(length) -> Y and Z(width) -> X (web plane parallel to YZ wall plane)
      geometry.rotateZ(Math.PI / 2);
      geometry.rotateY(-Math.PI / 2);
      // The flat, narrow bottom should be the pivot point for wall alignment
      // Center the geometry vertically but keep the web face at X=0
      geometry.computeBoundingBox();
      const bb = geometry.boundingBox!;
      // Translate so the flat side (minimum X, which is the narrow end) is at X=0
      geometry.translate(-bb.min.x, -bb.min.y - (bb.max.y - bb.min.y) / 2, 0);
    }

    geometry.computeVertexNormals();

    return geometry;
  };

  // Calculate roof height based on pitch (pitch/12 * half width)
  const roofHeight = roofStyle === 'gable' ? (roofPitch / 12) * (width / 2) : (roofPitch / 12) * width;
  

  const rakeTransform = (start: [number, number, number], end: [number, number, number]) => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const dir = e.clone().sub(s);
    const len = dir.length();
    const mid = s.clone().addScaledVector(dir, 0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { position: mid.toArray() as [number, number, number], quaternion: quat, length: len };
  };

  const frontGableGeometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(0, roofHeight);
    s.closePath();
    const geom = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });

    // World-space planar UVs so corrugation spacing stays constant
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, x / 10, y / 10); // match wall corrugation scale
    }
    geom.setAttribute('uv', uv);
    geom.attributes.uv.needsUpdate = true;

    return geom;
  }, [width, roofHeight]);

  const backGableGeometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(0, roofHeight);
    s.closePath();
    const geom = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });

    // World-space planar UVs so corrugation spacing stays constant
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, x / 10, y / 10); // match wall corrugation scale
    }
    geom.setAttribute('uv', uv);
    geom.attributes.uv.needsUpdate = true;

    return geom;
  }, [width, roofHeight]);

  // Unified gable end cap geometries (rectangle + triangle as one piece) to eliminate seams
  const frontGableEndCapGeometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(width / 2, height);
    s.lineTo(0, height + roofHeight);
    s.lineTo(-width / 2, height);
    s.closePath();
    const geom = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, x / 10, y / 10);
    }
    geom.setAttribute('uv', uv);
    geom.attributes.uv.needsUpdate = true;
    return geom;
  }, [width, height, roofHeight]);

  const backGableEndCapGeometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(width / 2, height);
    s.lineTo(0, height + roofHeight);
    s.lineTo(-width / 2, height);
    s.closePath();
    const geom = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, x / 10, y / 10);
    }
    geom.setAttribute('uv', uv);
    geom.attributes.uv.needsUpdate = true;
    return geom;
  }, [width, height, roofHeight]);
  const frontSingleSlopeEndGeometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(width / 2, height + roofHeight);
    s.lineTo(-width / 2, height);
    s.closePath();
    const geom = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });

    // World-space planar UVs to keep corrugation spacing constant
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, x / 10, y / 10); // match wall corrugation scale
    }
    geom.setAttribute('uv', uv);
    geom.attributes.uv.needsUpdate = true;

    return geom;
  }, [width, height, roofHeight]);

  const backSingleSlopeEndGeometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-width / 2, 0);
    s.lineTo(width / 2, 0);
    s.lineTo(width / 2, height + roofHeight);
    s.lineTo(-width / 2, height);
    s.closePath();
    const geom = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });

    // World-space planar UVs to keep corrugation spacing constant
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, x / 10, y / 10); // match wall corrugation scale
    }
    geom.setAttribute('uv', uv);
    geom.attributes.uv.needsUpdate = true;

    return geom;
  }, [width, height, roofHeight]);

  // Function to create gable end cap geometry per lean-to
  const createLeanToGableEndCapGeometry = (leanTo: typeof leanTos[0]) => {
    if (leanTo.type !== 'gable') return null;
    
    // For gable lean-tos: width is parallel to building, length is perpendicular
    const effectiveWidth = leanTo.length; // perpendicular to building
    const effectiveLength = leanTo.width; // parallel to building (this is the end wall width!)
    
    const leanToHeight = Math.min(leanTo.height, height);
    const gableRoofRise = (leanTo.pitch / 12) * (effectiveLength / 2);
    const rawGableApexHeight = leanToHeight + gableRoofRise;
    const mainRidgeHeight = height + roofHeight;
    
    // Calculate effective roof rise if lean-to would exceed main ridge
    const maxAvailableRise = mainRidgeHeight - leanToHeight - 0.2;
    let effectiveRoofRise = gableRoofRise;
    
    if (rawGableApexHeight > mainRidgeHeight) {
      effectiveRoofRise = maxAvailableRise;
    }
    
    // CRITICAL: Match exact construction of main building's gable ends
    // Pentagon: base -> left side -> peak -> right side -> base
    const s = new THREE.Shape();
    s.moveTo(-effectiveLength / 2, 0);        // bottom left
    s.lineTo(effectiveLength / 2, 0);         // bottom right
    s.lineTo(effectiveLength / 2, leanToHeight);    // middle right (eave height)
    s.lineTo(0, leanToHeight + effectiveRoofRise);   // peak (RELATIVE to eave)
    s.lineTo(-effectiveLength / 2, leanToHeight);   // middle left (eave height)
    s.closePath();
    
    const geom = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
    
    // World-space planar UVs - MUST match main building exactly (x/10, y/10)
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      uv.setXY(i, x / 10, y / 10);
    }
    geom.setAttribute('uv', uv);
    geom.attributes.uv.needsUpdate = true;
    
    return geom;
  };
  
  // Helper: compute world-space corners of a lean-to roof for wraparound connections
  const computeLeanToRoofCorners = (
    leanTo: typeof leanTos[0],
    position: [number, number, number],
    rotation: [number, number, number]
  ) => {
    const effectiveWidth = leanTo.type === 'gable' ? leanTo.length : leanTo.width;
    const effectiveLength = leanTo.type === 'gable' ? leanTo.width : (leanTo.length > 0 ? leanTo.length : ((leanTo.wall === 'front' || leanTo.wall === 'back') ? width : length));
    const leanToHeight = leanTo.type === 'gable' 
      ? Math.min(leanTo.height, height)
      : Math.min(leanTo.height, height - 2);
    
    // Calculate effective roof rise (capped by eave height)
    const rawRise = (leanTo.pitch / 12) * effectiveWidth;
    const rawHighest = leanToHeight + rawRise;
    const maxRise = height - leanToHeight - 0.2;
    const effectiveRise = rawHighest > height ? maxRise : rawRise;
    
    // For single-slope: 4 corners (inner high, outer low)
    if (leanTo.type !== 'gable') {
      const attachWallLength = effectiveLength;
      
      // Local space corners (before rotation)
      const corners = {
        innerLeft: new THREE.Vector3(0, leanToHeight + effectiveRise, -attachWallLength / 2),
        innerRight: new THREE.Vector3(0, leanToHeight + effectiveRise, attachWallLength / 2),
        outerLeft: new THREE.Vector3(effectiveWidth, leanToHeight, -attachWallLength / 2),
        outerRight: new THREE.Vector3(effectiveWidth, leanToHeight, attachWallLength / 2),
      };
      
      // Apply rotation and position to get world space
      const rotMatrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation));
      const posVec = new THREE.Vector3(...position);
      
      Object.keys(corners).forEach(key => {
        corners[key as keyof typeof corners].applyMatrix4(rotMatrix).add(posVec);
      });
      
      return corners;
    }
    
    return null;
  };
  
  return (
    <group ref={groupRef} position={[0, 0, 0]} rotation={[0, Math.PI / 12, 0]}>
      {/* Concrete footer/foundation - complete connected frame */}
      <group position={[0, -0.75, 0]}>
        {/* Front beam */}
        <mesh position={[0, 0, -(length) / 2]}>
          <boxGeometry args={[width + 2, 1.5, 1.5]} />
          <meshStandardMaterial color="#374151" roughness={0.9} />
        </mesh>
        {/* Back beam */}
        <mesh position={[0, 0, (length) / 2]}>
          <boxGeometry args={[width + 2, 1.5, 1.5]} />
          <meshStandardMaterial color="#374151" roughness={0.9} />
        </mesh>
        {/* Left beam */}
        <mesh position={[-(width) / 2 - 0.125, 0, 0]}>
          <boxGeometry args={[1.75, 1.5, length + 1.5]} />
          <meshStandardMaterial color="#374151" roughness={0.9} />
        </mesh>
        {/* Right beam */}
        <mesh position={[(width) / 2 + 0.125, 0, 0]}>
          <boxGeometry args={[1.75, 1.5, length + 1.5]} />
          <meshStandardMaterial color="#374151" roughness={0.9} />
        </mesh>
      </group>

      {/* Wall panels - conditional rendering based on wallEnclosure */}
      {(() => {
        // Determine which walls to show
        const showFront = wallEnclosure === 'fully-enclosed' || 
                         wallEnclosure === 'gable-ends' ||
                         (wallEnclosure === 'customize' && customWalls.front);
        const showBack = wallEnclosure === 'fully-enclosed' || 
                        wallEnclosure === 'gable-ends' ||
                        (wallEnclosure === 'customize' && customWalls.back);
        const showLeft = wallEnclosure === 'fully-enclosed' ||
                        (wallEnclosure === 'customize' && customWalls.left);
        const showRight = wallEnclosure === 'fully-enclosed' ||
                         (wallEnclosure === 'customize' && customWalls.right);
        
        // Track which walls have enclosed lean-tos (for non-interactive highlighting)
        const hasEnclosedLeanToOnFront = leanTos.some(lt => lt.wall === 'front' && (lt.type === 'enclosed' || lt.type === 'gable'));
        const hasEnclosedLeanToOnBack = leanTos.some(lt => lt.wall === 'back' && (lt.type === 'enclosed' || lt.type === 'gable'));
        const hasEnclosedLeanToOnLeft = leanTos.some(lt => lt.wall === 'left' && (lt.type === 'enclosed' || lt.type === 'gable'));
        const hasEnclosedLeanToOnRight = leanTos.some(lt => lt.wall === 'right' && (lt.type === 'enclosed' || lt.type === 'gable'));
        
        return (
          <>
            {roofStyle === 'gable' ? (
              <Fragment key="gable-ends">
                {/* Front gable end wall */}
                {showFront && (
                  <mesh 
                    key={`front-gable-endcap-${wallColor}-${width}-${height}-${roofHeight}`} 
                    position={[0, 0, -length / 2]} 
                    castShadow={false} 
                    receiveShadow={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDragging && onWallClick) {
                        onWallClick('front');
                      }
                    }}
                  >
                    <primitive object={frontGableEndCapGeometry} />
                    <primitive attach="material" object={gableMaterial} />
                  </mesh>
                )}

                {/* Back gable end wall */}
                {showBack && (
                  <mesh 
                    key={`back-gable-endcap-${wallColor}-${width}-${height}-${roofHeight}`} 
                    position={[0, 0, length / 2]} 
                    castShadow={false} 
                    receiveShadow={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDragging && onWallClick) {
                        onWallClick('back');
                      }
                    }}
                  >
                    <primitive object={backGableEndCapGeometry} />
                    <primitive attach="material" object={gableMaterial} />
                  </mesh>
                )}
              </Fragment>
            ) : (
              <Fragment key="single-ends">
                {/* Front end wall for single slope */}
                {showFront && (
                  <mesh 
                    key={`front-single-${wallColor}-${width}-${height}-${roofHeight}`} 
                    position={[0, 0, -length / 2]} 
                    castShadow={false} 
                    receiveShadow={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDragging && onWallClick) {
                        onWallClick('front');
                      }
                    }}
                  >
                    <primitive object={frontSingleSlopeEndGeometry} />
                    <primitive attach="material" object={singleSlopeEndMaterial} />
                  </mesh>
                )}
                
                {/* Back end wall for single slope */}
                {showBack && (
                  <mesh 
                    key={`back-single-${wallColor}-${width}-${height}-${roofHeight}`} 
                    position={[0, 0, length / 2]} 
                    castShadow={false} 
                    receiveShadow={false}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDragging && onWallClick) {
                        onWallClick('back');
                      }
                    }}
                  >
                    <primitive object={backSingleSlopeEndGeometry} />
                    <primitive attach="material" object={singleSlopeEndMaterial} />
                  </mesh>
                )}
              </Fragment>
            )}
            
            {/* Left wall */}
            {showLeft && (
              <mesh 
                key={`left-wall-${wallColor}-${width}-${length}-${height}`} 
                position={[-width / 2, roofStyle === 'single-slope' ? height / 2 : height / 2, 0]} 
                castShadow={false} 
                receiveShadow={false}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDragging && onWallClick) {
                    onWallClick('left');
                  }
                }}
              >
                <boxGeometry args={[0.2, height, length - 0.4]} />
                <primitive attach="material" object={wallMaterial} />
              </mesh>
            )}
            
            {/* Right wall */}
            {showRight && (
              <mesh 
                key={`right-wall-${wallColor}-${width}-${length}-${height}-${roofHeight}`} 
                position={[width / 2, roofStyle === 'single-slope' ? (height + roofHeight) / 2 : height / 2, 0]} 
                castShadow={false} 
                receiveShadow={false}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isDragging && onWallClick) {
                    onWallClick('right');
                  }
                }}
              >
                <boxGeometry args={[0.2, roofStyle === 'single-slope' ? height + roofHeight : height, length - 0.4]} />
                <primitive attach="material" object={wallMaterial} />
              </mesh>
            )}

            {/* Wall highlighting overlays for edit mode - show main wall even when lean-to is clicked */}
            {highlightedWall && (
              <>
                {highlightedWall.wall === 'front' && !highlightedWall.leanToId && showFront && (() => {
                  // For single-slope roofs, front/back walls are trapezoidal (sloped from low to high eave)
                  if (roofStyle === 'single-slope') {
                    const lowEave = height;
                    const highEave = height + roofHeight;
                    const trapShape = new THREE.Shape();
                    trapShape.moveTo(-width / 2, 0);
                    trapShape.lineTo(width / 2, 0);
                    trapShape.lineTo(width / 2, highEave);
                    trapShape.lineTo(-width / 2, lowEave);
                    trapShape.lineTo(-width / 2, 0);
                    const trapGeom = new THREE.ShapeGeometry(trapShape);
                    return (
                      <group position={[0, 0, -length / 2 - 0.3]}>
                        <mesh castShadow={false} receiveShadow={false}>
                          <primitive object={trapGeom} />
                          <primitive attach="material" object={highlightMaterial} />
                        </mesh>
                        <lineSegments position={[0, 0, -0.05]}>
                          <edgesGeometry args={[trapGeom]} />
                          <lineBasicMaterial color="#1d4ed8" linewidth={3} />
                        </lineSegments>
                      </group>
                    );
                  }
                  return (
                    <group>
                      <mesh position={[0, height / 2, -length / 2 - 0.3]} castShadow={false} receiveShadow={false}>
                        <planeGeometry args={[width, height]} />
                        <primitive attach="material" object={highlightMaterial} />
                      </mesh>
                      <lineSegments position={[0, height / 2, -length / 2 - 0.35]}>
                        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
                        <lineBasicMaterial color="#1d4ed8" linewidth={3} />
                      </lineSegments>
                    </group>
                  );
                })()}
                {highlightedWall.wall === 'back' && !highlightedWall.leanToId && showBack && (() => {
                  // For single-slope roofs, front/back walls are trapezoidal (sloped from low to high eave)
                  // Back wall is rotated 180°, so we flip the slope direction (low on right, high on left when viewed from back)
                  if (roofStyle === 'single-slope') {
                    const lowEave = height;
                    const highEave = height + roofHeight;
                    const trapShape = new THREE.Shape();
                    trapShape.moveTo(-width / 2, 0);
                    trapShape.lineTo(width / 2, 0);
                    trapShape.lineTo(width / 2, lowEave);  // Flipped: low on right
                    trapShape.lineTo(-width / 2, highEave); // Flipped: high on left
                    trapShape.lineTo(-width / 2, 0);
                    const trapGeom = new THREE.ShapeGeometry(trapShape);
                    return (
                      <group position={[0, 0, length / 2 + 0.3]} rotation={[0, Math.PI, 0]}>
                        <mesh castShadow={false} receiveShadow={false}>
                          <primitive object={trapGeom} />
                          <primitive attach="material" object={highlightMaterial} />
                        </mesh>
                        <lineSegments position={[0, 0, -0.05]}>
                          <edgesGeometry args={[trapGeom]} />
                          <lineBasicMaterial color="#1d4ed8" linewidth={3} />
                        </lineSegments>
                      </group>
                    );
                  }
                  return (
                    <group>
                      <mesh position={[0, height / 2, length / 2 + 0.3]} rotation={[0, Math.PI, 0]} castShadow={false} receiveShadow={false}>
                        <planeGeometry args={[width, height]} />
                        <primitive attach="material" object={highlightMaterial} />
                      </mesh>
                      <lineSegments position={[0, height / 2, length / 2 + 0.35]} rotation={[0, Math.PI, 0]}>
                        <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
                        <lineBasicMaterial color="#1d4ed8" linewidth={3} />
                      </lineSegments>
                    </group>
                  );
                })()}
                {highlightedWall.wall === 'left' && !highlightedWall.leanToId && showLeft && (
                  <group>
                    <mesh position={[-width / 2 - 0.3, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow={false} receiveShadow={false}>
                      <planeGeometry args={[length, height]} />
                      <primitive attach="material" object={highlightMaterial} />
                    </mesh>
                    <lineSegments position={[-width / 2 - 0.35, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
                      <edgesGeometry args={[new THREE.PlaneGeometry(length, height)]} />
                      <lineBasicMaterial color="#1d4ed8" linewidth={3} />
                    </lineSegments>
                  </group>
                )}
                {highlightedWall.wall === 'right' && !highlightedWall.leanToId && showRight && (() => {
                  // For single-slope roofs, right wall is the high side - extend highlight to high eave
                  const rightWallHeight = roofStyle === 'single-slope' ? height + roofHeight : height;
                  const rightWallY = rightWallHeight / 2;
                  return (
                    <group>
                      <mesh position={[width / 2 + 0.3, rightWallY, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={false} receiveShadow={false}>
                        <planeGeometry args={[length, rightWallHeight]} />
                        <primitive attach="material" object={highlightMaterial} />
                      </mesh>
                      <lineSegments position={[width / 2 + 0.35, rightWallY, 0]} rotation={[0, Math.PI / 2, 0]}>
                        <edgesGeometry args={[new THREE.PlaneGeometry(length, rightWallHeight)]} />
                        <lineBasicMaterial color="#1d4ed8" linewidth={3} />
                      </lineSegments>
                    </group>
                  );
                })()}
              </>
            )}
          </>
        );
      })()}

      {/* Roof */}
      {roofStyle === 'gable' ? (
        <Fragment key="gable-roof">
          {/* Gable roof - two angled panels */}
          <mesh 
            key={`roof-left-${roofColor}`}
            position={[-width / 4, height + roofHeight / 2, 0]} 
            rotation={[0, 0, Math.atan(roofPitch / 12)]}
            castShadow={false} receiveShadow={false}
          >
            <boxGeometry args={[width / 2 / Math.cos(Math.atan(roofPitch / 12)) + 0.2, 0.15, length + 0.5]} />
            <primitive attach="material" object={roofMaterial} />
          </mesh>
          <mesh 
            key={`roof-right-${roofColor}`}
            position={[width / 4, height + roofHeight / 2, 0]} 
            rotation={[0, 0, -Math.atan(roofPitch / 12)]}
            castShadow={false} receiveShadow={false}
          >
            <boxGeometry args={[width / 2 / Math.cos(Math.atan(roofPitch / 12)) + 0.2, 0.15, length + 0.5]} />
            <primitive attach="material" object={roofMaterial} />
          </mesh>
        </Fragment>
      ) : (
        // Single slope roof
        <mesh key={`roof-single-${roofColor}`} position={[0, height + roofHeight / 2, 0]} rotation={[0, 0, Math.atan(roofPitch / 12)]} castShadow={false} receiveShadow={false}>
          <boxGeometry args={[width / Math.cos(Math.atan(roofPitch / 12)) + 0.5, 0.15, length + 0.5]} />
          <primitive attach="material" object={roofMaterial} />
        </mesh>
      )}

      {/* Red Iron Structural Beams - every 25 feet along length, centered */}
      {(() => {
        const angle = Math.atan(roofPitch / 12);
        const beamLength = (width / 2) / Math.cos(angle);
        
        const renderBeamSet = (position: number, key: string) => (
          <group key={key}>
            {roofStyle === 'gable' ? (
              <>
                {/* Left angled beam following roof pitch - aligned with vertical column */}
                <mesh 
                  position={[-width / 4 + 0.92, height + roofHeight / 2 - 0.62, position]} 
                  rotation={[0, 0, angle * 1.02]}
                  castShadow={false} receiveShadow={false}
                >
                  <primitive object={createIBeamGeometry(beamLength - 0.65, 'left')} />
                  <primitive attach="material" object={beamMaterial} />
                </mesh>
                
                {/* Right angled beam following roof pitch - aligned with vertical column */}
                <mesh 
                  position={[width / 4 - 0.8, height + roofHeight / 2 - 0.62, position]} 
                  rotation={[0, 0, -angle * 1.02]}
                >
                  <primitive object={createIBeamGeometry(beamLength - 0.65, 'right')} />
                  <primitive attach="material" object={beamMaterial} />
                </mesh>
                
                {/* Vertical support columns - truly vertical, fixed to height */}
                <mesh position={[-width / 2 - 0.083, height / 2, position]} rotation={[0, 0, -1.5 * Math.PI / 180]}>
                  <primitive object={createIBeamGeometry(height, 'vertical')} />
                  <primitive attach="material" object={beamMaterial} />
                </mesh>
                <mesh position={[width / 2 - 1.434, height / 2, position]} rotation={[0, 0, 1.5 * Math.PI / 180]}>
                  <primitive object={createIBeamGeometry(height, 'vertical')} />
                  <primitive attach="material" object={beamMaterial} />
                </mesh>
              </>
            ) : (
              <>
                {/* Single slope angled beam following roof pitch - straight big beam with no taper */}
                <mesh 
                  position={[0, height + roofHeight / 2 - 0.75, position]} 
                  rotation={[0, 0, angle]}
                >
                  <primitive object={createIBeamGeometry(width / Math.cos(angle) - 0.5, 'none', 1.4)} />
                  <primitive attach="material" object={beamMaterial} />
                </mesh>
                
                {/* Vertical support columns - left side at standard height, right side at full height, both with dramatic taper */}
                <mesh position={[-width / 2 - 0.083, height / 2, position]} rotation={[0, 0, -1.5 * Math.PI / 180]}>
                  <primitive object={createIBeamGeometry(height, 'vertical')} />
                  <primitive attach="material" object={beamMaterial} />
                </mesh>
                <mesh position={[width / 2 - 1.434, (height + roofHeight - 1) / 2, position]} rotation={[0, 0, 1.5 * Math.PI / 180]}>
                  <primitive object={createIBeamGeometry(height + roofHeight - 1, 'vertical')} />
                  <primitive attach="material" object={beamMaterial} />
                </mesh>
              </>
            )}
          </group>
        );
        
        const beams = [];
        
        // Always add corner beams - 0.875 feet inside the walls
        beams.push(renderBeamSet(-length / 2 + 0.875, 'corner-front'));
        beams.push(renderBeamSet(length / 2 - 0.875, 'corner-back'));
        
        // Add regularly spaced beams in between with 20 foot buffer from corners
        const spacing = 24.5;
        const margin = 20;
        const inner = Math.max(0, length - margin * 2);
        const n = Math.floor(inner / spacing);
        const start = -(n * spacing) / 2;
        
        for (let i = 0; i <= n; i++) {
          const position = start + i * spacing;
          if (position < -length / 2 + margin || position > length / 2 - margin) continue;
          beams.push(renderBeamSet(position, `middle-${i}`));
        }
        
        return beams;
      })()}

      {/* Corner trim posts and gable trim */}
      {roofStyle === 'gable' ? (
        <> 
          {/* Front gable rake trim - following roof slope from corners to apex using vector/quaternion alignment */}
          {(() => {
            const inset = 0.06;
            const drop = 0.25;
            const zFront = -length / 2 - inset;
            const zBack = length / 2 + inset;
            const apexY = height + roofHeight - drop;

            // Front
            const leftFrontStart: [number, number, number] = [-width / 2 - inset, height - drop, zFront];
            const rightFrontStart: [number, number, number] = [width / 2 + inset, height - drop, zFront];
            const apexFront: [number, number, number] = [0, apexY, zFront];

            // Back
            const leftBackStart: [number, number, number] = [-width / 2 - inset, height - drop, zBack];
            const rightBackStart: [number, number, number] = [width / 2 + inset, height - drop, zBack];
            const apexBack: [number, number, number] = [0, apexY, zBack];

            const tfFL = rakeTransform(leftFrontStart, apexFront);
            const tfFR = rakeTransform(rightFrontStart, apexFront);
            const tfBL = rakeTransform(leftBackStart, apexBack);
            const tfBR = rakeTransform(rightBackStart, apexBack);
            
            // Check which walls are showing to determine corner trim visibility
            const showFront = wallEnclosure === 'fully-enclosed' || 
                             wallEnclosure === 'gable-ends' ||
                             (wallEnclosure === 'customize' && customWalls.front);
            const showBack = wallEnclosure === 'fully-enclosed' || 
                            wallEnclosure === 'gable-ends' ||
                            (wallEnclosure === 'customize' && customWalls.back);
            const showLeft = wallEnclosure === 'fully-enclosed' ||
                            (wallEnclosure === 'customize' && customWalls.left);
            const showRight = wallEnclosure === 'fully-enclosed' ||
                             (wallEnclosure === 'customize' && customWalls.right);

            return (
              <>
                {/* Front left rake */}
                <mesh key={`trim-front-left-rake-${trimColor}`} position={tfFL.position} quaternion={tfFL.quaternion}>
                  <boxGeometry args={[0.3, tfFL.length + 0.3, 0.3]} />
                  <primitive attach="material" object={trimMaterial} />
                </mesh>
                {/* Front right rake */}
                <mesh key={`trim-front-right-rake-${trimColor}`} position={tfFR.position} quaternion={tfFR.quaternion}>
                  <boxGeometry args={[0.3, tfFR.length + 0.3, 0.3]} />
                  <primitive attach="material" object={trimMaterial} />
                </mesh>
                {/* Back left rake */}
                <mesh key={`trim-back-left-rake-${trimColor}`} position={tfBL.position} quaternion={tfBL.quaternion}>
                  <boxGeometry args={[0.3, tfBL.length + 0.3, 0.3]} />
                  <primitive attach="material" object={trimMaterial} />
                </mesh>
                {/* Back right rake */}
                <mesh key={`trim-back-right-rake-${trimColor}`} position={tfBR.position} quaternion={tfBR.quaternion}>
                  <boxGeometry args={[0.3, tfBR.length + 0.3, 0.3]} />
                  <primitive attach="material" object={trimMaterial} />
                </mesh>
              </>
            );
          })()}
          
          {/* Vertical corner trim posts at base - only show if adjacent walls are showing */}
          {(() => {
            const showFront = wallEnclosure === 'fully-enclosed' || 
                             wallEnclosure === 'gable-ends' ||
                             (wallEnclosure === 'customize' && customWalls.front);
            const showBack = wallEnclosure === 'fully-enclosed' || 
                            wallEnclosure === 'gable-ends' ||
                            (wallEnclosure === 'customize' && customWalls.back);
            const showLeft = wallEnclosure === 'fully-enclosed' ||
                            (wallEnclosure === 'customize' && customWalls.left);
            const showRight = wallEnclosure === 'fully-enclosed' ||
                             (wallEnclosure === 'customize' && customWalls.right);
                             
            return (
              <>
                {/* Left-Front corner - only show if both left and front walls exist */}
                {(showLeft || showFront) && (
                  <mesh key={`trim-left-front-${trimColor}`} position={[-width / 2, height / 2, -length / 2]}>
                    <boxGeometry args={[0.3, height, 0.3]} />
                    <primitive attach="material" object={trimMaterial} />
                  </mesh>
                )}
                
                {/* Left-Back corner - only show if both left and back walls exist */}
                {(showLeft || showBack) && (
                  <mesh key={`trim-left-back-${trimColor}`} position={[-width / 2, height / 2, length / 2]}>
                    <boxGeometry args={[0.3, height, 0.3]} />
                    <primitive attach="material" object={trimMaterial} />
                  </mesh>
                )}
                
                {/* Right-Front corner - only show if both right and front walls exist */}
                {(showRight || showFront) && (
                  <mesh key={`trim-right-front-${trimColor}`} position={[width / 2, height / 2, -length / 2]}>
                    <boxGeometry args={[0.3, height, 0.3]} />
                    <primitive attach="material" object={trimMaterial} />
                  </mesh>
                )}
                
                {/* Right-Back corner - only show if both right and back walls exist */}
                {(showRight || showBack) && (
                  <mesh key={`trim-right-back-${trimColor}`} position={[width / 2, height / 2, length / 2]}>
                    <boxGeometry args={[0.3, height, 0.3]} />
                    <primitive attach="material" object={trimMaterial} />
                  </mesh>
                )}
              </>
            );
          })()}

          {/* Eave trim along side walls (connects rake bottoms) - wider for better coverage */}
          <mesh key={`trim-eave-left-${trimColor}`} position={[-width / 2 - 0.06, height - 0.24, 0]}>
            <boxGeometry args={[0.42, 0.42, length + 0.12]} />
            <primitive attach="material" object={trimMaterial} />
          </mesh>
          <mesh key={`trim-eave-right-${trimColor}`} position={[width / 2 + 0.06, height - 0.24, 0]}>
            <boxGeometry args={[0.42, 0.42, length + 0.12]} />
            <primitive attach="material" object={trimMaterial} />
          </mesh>
        </>
      ) : (
        <>
          {/* Left side posts - standard height */}
          {(() => {
            const showFront = wallEnclosure === 'fully-enclosed' || 
                             wallEnclosure === 'gable-ends' ||
                             (wallEnclosure === 'customize' && customWalls.front);
            const showBack = wallEnclosure === 'fully-enclosed' || 
                            wallEnclosure === 'gable-ends' ||
                            (wallEnclosure === 'customize' && customWalls.back);
            const showLeft = wallEnclosure === 'fully-enclosed' ||
                            (wallEnclosure === 'customize' && customWalls.left);
            const showRight = wallEnclosure === 'fully-enclosed' ||
                             (wallEnclosure === 'customize' && customWalls.right);
                             
            return (
              <>
                {/* Left-Front corner - only show if both left and front walls exist */}
                {(showLeft || showFront) && (
                  <mesh key={`trim-left-front-${trimColor}`} position={[-width / 2, height / 2, -length / 2]}>
                    <boxGeometry args={[0.3, height, 0.3]} />
                    <primitive attach="material" object={trimMaterial} />
                  </mesh>
                )}
                
                {/* Left-Back corner - only show if both left and back walls exist */}
                {(showLeft || showBack) && (
                  <mesh key={`trim-left-back-${trimColor}`} position={[-width / 2, height / 2, length / 2]}>
                    <boxGeometry args={[0.3, height, 0.3]} />
                    <primitive attach="material" object={trimMaterial} />
                  </mesh>
                )}
                
                {/* Right-Front corner - only show if both right and front walls exist */}
                {(showRight || showFront) && (
                  <mesh key={`trim-right-front-${trimColor}`} position={[width / 2, (height + roofHeight) / 2, -length / 2]}>
                    <boxGeometry args={[0.3, height + roofHeight + 0.3, 0.3]} />
                    <primitive attach="material" object={trimMaterial} />
                  </mesh>
                )}
                
                {/* Right-Back corner - only show if both right and back walls exist */}
                {(showRight || showBack) && (
                  <mesh key={`trim-right-back-${trimColor}`} position={[width / 2, (height + roofHeight) / 2, length / 2]}>
                    <boxGeometry args={[0.3, height + roofHeight + 0.3, 0.3]} />
                    <primitive attach="material" object={trimMaterial} />
                  </mesh>
                )}
              </>
            );
          })()}

          {/* Eave trim along side walls and ends for single slope - wider for better coverage */}
          <mesh key={`trim-eave-left-${trimColor}`} position={[-width / 2 - 0.06, height - 0.24, 0]}>
            <boxGeometry args={[0.42, 0.42, length + 0.12]} />
            <primitive attach="material" object={trimMaterial} />
          </mesh>
          <mesh key={`trim-eave-right-${trimColor}`} position={[width / 2 + 0.06, height + roofHeight, 0]}>
            <boxGeometry args={[0.42, 0.42, length + 0.12]} />
            <primitive attach="material" object={trimMaterial} />
          </mesh>
          {/* Front and back eave trim for single slope (sloped to meet corners perfectly) */}
          {(() => {
            const inset = 0.06;
            const drop = 0.24;
            const tfFront = rakeTransform(
              [-width / 2 - inset, height - drop, -length / 2 - inset],
              [width / 2 + inset, height + roofHeight - drop, -length / 2 - inset]
            );
            const tfBack = rakeTransform(
              [-width / 2 - inset, height - drop, length / 2 + inset],
              [width / 2 + inset, height + roofHeight - drop, length / 2 + inset]
            );
            return (
              <>
                <mesh key={`trim-eave-front-${trimColor}`} position={tfFront.position} quaternion={tfFront.quaternion}>
                  <boxGeometry args={[0.3, tfFront.length, 0.3]} />
                  <primitive attach="material" object={trimMaterial} />
                </mesh>
                <mesh key={`trim-eave-back-${trimColor}`} position={tfBack.position} quaternion={tfBack.quaternion}>
                  <boxGeometry args={[0.3, tfBack.length, 0.3]} />
                  <primitive attach="material" object={trimMaterial} />
                </mesh>
              </>
            );
          })()}
        </>
      )}

      {/* Doors */}
      {doors.filter(d => !d.leanToId).map((door) => {
        const wallLength = door.wall === 'front' || door.wall === 'back' ? width : length;
        const outward = 0.11;

        // Position along the visible axis
        const along =
          door.wall === 'front' || door.wall === 'back'
            ? (door.position - 0.5) * width
            : (door.position - 0.5) * length;

        // Base positions with slight outward offset so door doesn't bleed through wall
        const xPos =
          door.wall === 'left'
            ? -width / 2 - outward
            : door.wall === 'right'
            ? width / 2 + outward
            : along;

        const zPos =
          door.wall === 'front'
            ? -length / 2 - outward
            : door.wall === 'back'
            ? length / 2 + outward
            : along;

        const yPos = Math.max(door.height / 2, 0.5);
        const rotation = door.wall === 'left' || door.wall === 'right' ? Math.PI / 2 : 0;

        return (
          <group 
            key={door.id} 
            ref={(el) => {
              if (el) doorGroupRefs.current.set(door.id, el);
              else doorGroupRefs.current.delete(door.id);
            }}
            position={[xPos, yPos, zPos]} 
            rotation={[0, rotation, 0]}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e as any).nativeEvent?.preventDefault?.();
              try { (e.target as any)?.setPointerCapture?.(e.pointerId); } catch {}
              setLocalDraggedDoorId(door.id);
              onDraggedDoorIdChange(door.id);
              gl.domElement.style.cursor = 'grab';
              
              // Store initial drag state
              doorDragState.current.set(door.id, {
                startPosition: door.position,
                unclamped: door.position
              });
              
              const outward = 0.11;
              if (door.wall === 'front') {
                dragPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(length / 2 + outward));
              } else if (door.wall === 'back') {
                dragPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, 0, 1), (length / 2) + outward);
              } else if (door.wall === 'left') {
                dragPlaneRef.current = new THREE.Plane(new THREE.Vector3(1, 0, 0), -(width / 2 + outward));
              } else {
                dragPlaneRef.current = new THREE.Plane(new THREE.Vector3(1, 0, 0), (width / 2) + outward);
              }
              const hit = new THREE.Vector3();
              if (dragPlaneRef.current && e.ray.intersectPlane(dragPlaneRef.current, hit)) {
                const axisCenter = (door.wall === 'front' || door.wall === 'back')
                  ? (door.position - 0.5) * width
                  : (door.position - 0.5) * length;
                const hitCoord = (door.wall === 'front' || door.wall === 'back') ? hit.x : hit.z;
                dragOffsetRef.current = hitCoord - axisCenter;
              } else {
                dragOffsetRef.current = 0;
              }
              if (controlsRef.current) controlsRef.current.enabled = false;
            }}
            onPointerMove={(e) => {
              if (localDraggedDoorId === door.id && dragPlaneRef.current) {
                setIsDragging(true);
                gl.domElement.style.cursor = 'grabbing';
                const hit = new THREE.Vector3();
                if (e.ray.intersectPlane(dragPlaneRef.current, hit)) {
                  const hitCoord = (door.wall === 'front' || door.wall === 'back') ? hit.x : hit.z;
                  const newCenter = hitCoord - dragOffsetRef.current;
                  const axisLen = (door.wall === 'front' || door.wall === 'back') ? width : length;
                  
                  // Calculate unclamped position for continuous tracking
                  let rawU = (newCenter + axisLen / 2) / axisLen;
                  
                  // Store unclamped position
                  const dragState = doorDragState.current.get(door.id);
                  if (dragState) {
                    dragState.unclamped = rawU;
                  }
                  
                  // Clamp accounting for door width + trim (0.5ft) so door edges stay within walls
                  const trimBuffer = 0.5; // 6 inches trim on each side
                  const doorHalfWidth = door.width / 2;
                  const totalBuffer = doorHalfWidth + trimBuffer;
                  const minU = totalBuffer / axisLen;
                  const maxU = 1 - (totalBuffer / axisLen);
                  const clampedU = Math.max(minU, Math.min(maxU, rawU));
                  
                  // Directly update door group position
                  const doorGroup = doorGroupRefs.current.get(door.id);
                  if (doorGroup) {
                    const across = (door.wall === 'front' || door.wall === 'back') ? width : length;
                    
                    if (door.wall === 'front') {
                      doorGroup.position.x = (clampedU - 0.5) * across;
                    } else if (door.wall === 'back') {
                      doorGroup.position.x = (clampedU - 0.5) * across;
                    } else if (door.wall === 'left') {
                      doorGroup.position.z = (clampedU - 0.5) * across;
                    } else {
                      doorGroup.position.z = (clampedU - 0.5) * across;
                    }
                  }
                }
              }
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              gl.domElement.style.cursor = 'default';
              if (controlsRef.current) controlsRef.current.enabled = true;
              onDraggedDoorIdChange(null);
              setLocalDraggedDoorId(null);
              setIsDragging(false);
              
              // On release, use the clamped position for final state update
              const dragState = doorDragState.current.get(door.id);
              if (dragState) {
                const finalPosition = Math.max(0, Math.min(1, dragState.unclamped));
                onDoorMove(door.id, finalPosition);
                doorDragState.current.delete(door.id);
              }
            }}
          >
            {/* Door opening (visible from both sides) */}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                if (!isDragging) {
                  onDoorClick(door.id);
                }
              }}
            >
              <boxGeometry args={[door.width, door.height, 0.2]} />
              <meshStandardMaterial 
                color="#FFFFFF"
                roughness={0.3}
                metalness={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
            
            {/* Door trim frame (not at bottom) */}
            <group>
              {/* Top trim - extended for flush squared corners */}
              <mesh key={`door-trim-top-${door.id}-${trimColor}`} position={[0, door.height / 2 + 0.15, 0]}>
                <boxGeometry args={[door.width + 0.6, 0.3, 0.25]} />
                <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
              </mesh>
              {/* Left trim */}
              <mesh key={`door-trim-left-${door.id}-${trimColor}`} position={[-door.width / 2 - 0.15, 0, 0]}>
                <boxGeometry args={[0.3, door.height, 0.25]} />
                <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
              </mesh>
              {/* Right trim */}
              <mesh key={`door-trim-right-${door.id}-${trimColor}`} position={[door.width / 2 + 0.15, 0, 0]}>
                <boxGeometry args={[0.3, door.height, 0.25]} />
                <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* Windows */}
      {windows.filter(w => !w.leanToId).map((window) => {
        const wallLength = window.wall === 'front' || window.wall === 'back' ? width : length;
        const wallDepth = length;
        const outward = 0.11;
        
        const along =
          window.wall === 'front' || window.wall === 'back'
            ? (window.position - 0.5) * width
            : (window.position - 0.5) * length;

        const xPos =
          window.wall === 'left'
            ? -width / 2 - outward
            : window.wall === 'right'
            ? width / 2 + outward
            : along;

        const zPos =
          window.wall === 'front'
            ? -length / 2 - outward
            : window.wall === 'back'
            ? length / 2 + outward
            : along;

        // Position so top of window is at 7ft (matching personnel door height)
        const yPos = 7 - window.height / 2;
        const rotation = window.wall === 'left' || window.wall === 'right' ? Math.PI / 2 : 0;

        return (
          <group 
            key={window.id} 
            ref={(el) => {
              if (el) windowGroupRefs.current.set(window.id, el);
              else windowGroupRefs.current.delete(window.id);
            }}
            position={[xPos, yPos, zPos]} 
            rotation={[0, rotation, 0]}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e as any).nativeEvent?.preventDefault?.();
              try { (e.target as any)?.setPointerCapture?.(e.pointerId); } catch {}
              setLocalDraggedWindowId(window.id);
              onDraggedWindowIdChange(window.id);
              gl.domElement.style.cursor = 'grab';
              
              // Store initial drag state
              windowDragState.current.set(window.id, {
                startPosition: window.position,
                unclamped: window.position
              });
              
              const outward = 0.11;
              if (window.wall === 'front') {
                dragPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(length / 2 + outward));
              } else if (window.wall === 'back') {
                dragPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, 0, 1), (length / 2) + outward);
              } else if (window.wall === 'left') {
                dragPlaneRef.current = new THREE.Plane(new THREE.Vector3(1, 0, 0), -(width / 2 + outward));
              } else {
                dragPlaneRef.current = new THREE.Plane(new THREE.Vector3(1, 0, 0), (width / 2) + outward);
              }
              const hit = new THREE.Vector3();
              if (dragPlaneRef.current && e.ray.intersectPlane(dragPlaneRef.current, hit)) {
                const axisCenter = (window.wall === 'front' || window.wall === 'back')
                  ? (window.position - 0.5) * width
                  : (window.position - 0.5) * length;
                const hitCoord = (window.wall === 'front' || window.wall === 'back') ? hit.x : hit.z;
                dragOffsetRef.current = hitCoord - axisCenter;
              } else {
                dragOffsetRef.current = 0;
              }
              if (controlsRef.current) controlsRef.current.enabled = false;
            }}
            onPointerMove={(e) => {
              if (localDraggedWindowId === window.id && dragPlaneRef.current) {
                setIsDragging(true);
                gl.domElement.style.cursor = 'grabbing';
                const hit = new THREE.Vector3();
                if (e.ray.intersectPlane(dragPlaneRef.current, hit)) {
                  const hitCoord = (window.wall === 'front' || window.wall === 'back') ? hit.x : hit.z;
                  const newCenter = hitCoord - dragOffsetRef.current;
                  const axisLen = (window.wall === 'front' || window.wall === 'back') ? width : length;
                  
                  // Calculate unclamped position for continuous tracking
                  let rawU = (newCenter + axisLen / 2) / axisLen;
                  
                  // Store unclamped position
                  const dragState = windowDragState.current.get(window.id);
                  if (dragState) {
                    dragState.unclamped = rawU;
                  }
                  
                  // Clamp accounting for window width + trim (0.5ft) so window edges stay within walls
                  const trimBuffer = 0.5; // 6 inches trim on each side
                  const windowHalfWidth = window.width / 2;
                  const totalBuffer = windowHalfWidth + trimBuffer;
                  const minU = totalBuffer / axisLen;
                  const maxU = 1 - (totalBuffer / axisLen);
                  const clampedU = Math.max(minU, Math.min(maxU, rawU));
                  
                  // Directly update window group position
                  const windowGroup = windowGroupRefs.current.get(window.id);
                  if (windowGroup) {
                    const across = (window.wall === 'front' || window.wall === 'back') ? width : length;
                    
                    if (window.wall === 'front') {
                      windowGroup.position.x = (clampedU - 0.5) * across;
                    } else if (window.wall === 'back') {
                      windowGroup.position.x = (clampedU - 0.5) * across;
                    } else if (window.wall === 'left') {
                      windowGroup.position.z = (clampedU - 0.5) * across;
                    } else {
                      windowGroup.position.z = (clampedU - 0.5) * across;
                    }
                  }
                }
              }
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              gl.domElement.style.cursor = 'default';
              if (controlsRef.current) controlsRef.current.enabled = true;
              onDraggedWindowIdChange(null);
              setLocalDraggedWindowId(null);
              setIsDragging(false);
              
              // On release, use the clamped position for final state update
              const dragState = windowDragState.current.get(window.id);
              if (dragState) {
                const finalPosition = Math.max(0, Math.min(1, dragState.unclamped));
                onWindowMove(window.id, finalPosition);
                windowDragState.current.delete(window.id);
              }
            }}
          >
            {/* Window pane */}
            <mesh
              onClick={(e) => { e.stopPropagation(); if (!isDragging) onWindowClick(window.id); }}
            >
              <boxGeometry args={[window.width, window.height, 0.2]} />
              <meshStandardMaterial 
                color="#E0F2FE" 
                transparent 
                opacity={0.7}
                roughness={0.1}
                metalness={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
            
            {/* Window grid */}
            <group>
              {/* Horizontal grid line */}
              <mesh key={`window-grid-h-${window.id}-${trimColor}`} position={[0, 0, 0]}>
                <boxGeometry args={[window.width, 0.08, 0.21]} />
                <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
              </mesh>
              {/* Vertical grid line */}
              <mesh key={`window-grid-v-${window.id}-${trimColor}`} position={[0, 0, 0]}>
                <boxGeometry args={[0.08, window.height, 0.21]} />
                <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
              </mesh>
            </group>
            
            {/* Window trim frame */}
            <group>
              {/* Top trim - extended for flush squared corners */}
              <mesh key={`window-trim-top-${window.id}-${trimColor}`} position={[0, window.height / 2 + 0.15, 0]}>
                <boxGeometry args={[window.width + 0.6, 0.3, 0.25]} />
                <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
              </mesh>
              {/* Bottom trim - extended for flush squared corners */}
              <mesh key={`window-trim-bottom-${window.id}-${trimColor}`} position={[0, -window.height / 2 - 0.15, 0]}>
                <boxGeometry args={[window.width + 0.6, 0.3, 0.25]} />
                <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
              </mesh>
              {/* Left trim */}
              <mesh key={`window-trim-left-${window.id}-${trimColor}`} position={[-window.width / 2 - 0.15, 0, 0]}>
                <boxGeometry args={[0.3, window.height, 0.25]} />
                <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
              </mesh>
              {/* Right trim */}
              <mesh key={`window-trim-right-${window.id}-${trimColor}`} position={[window.width / 2 + 0.15, 0, 0]}>
                <boxGeometry args={[0.3, window.height, 0.25]} />
                <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* Lean-To Structures */}
      {leanTos.map((leanTo) => {
        // For gable lean-tos: width is parallel to building, length is perpendicular
        // For other lean-tos: width is perpendicular to building, length is parallel
        const effectiveWidth = leanTo.type === 'gable' ? leanTo.length : leanTo.width;
        const effectiveLength = leanTo.type === 'gable' ? leanTo.width : (leanTo.length > 0 ? leanTo.length : ((leanTo.wall === 'front' || leanTo.wall === 'back') ? width : length));
        
        // Calculate lean-to roof height using its own pitch
        const leanToRoofRise = (leanTo.pitch / 12) * effectiveWidth;
        
        // For standard lean-to, keep the highest point below the eave (2ft clearance)
        const leanToHeight = leanTo.type === 'gable' 
          ? Math.min(leanTo.height, height) // Gable can match building height
          : Math.min(leanTo.height, height - 2); // Standard stays below eave
        
        const attachWallLength = effectiveLength;
        
        // Position lean-to based on which wall it's attached to
        let leanToPosition: [number, number, number] = [0, 0, 0];
        let leanToRotation: [number, number, number] = [0, 0, 0];
        
        // Calculate wall dimension and offset based on position (0-1)
        const wallDimension = (leanTo.wall === 'front' || leanTo.wall === 'back') ? width : length;
        // Use drag position if dragging, otherwise use snapped position
        const activePosition = leanToDragPositions.get(leanTo.id) ?? leanTo.position;
        const centerOffset = (activePosition - 0.5) * (wallDimension - effectiveLength);
        
        if (leanTo.wall === 'right') {
          leanToPosition = [width / 2 + effectiveWidth / 2, 0, centerOffset];
          leanToRotation = [0, 0, 0];
        } else if (leanTo.wall === 'left') {
          leanToPosition = [-width / 2 - effectiveWidth / 2, 0, -centerOffset];
          leanToRotation = [0, Math.PI, 0];
        } else if (leanTo.wall === 'back') {
          // Swapped: back wall is now at -Z (what user sees as front)
          leanToPosition = [centerOffset, 0, -length / 2 - effectiveWidth / 2];
          leanToRotation = [0, Math.PI / 2, 0];
        } else {
          // Swapped: front wall is now at +Z (what user sees as back)
          leanToPosition = [-centerOffset, 0, length / 2 + effectiveWidth / 2];
          leanToRotation = [0, -Math.PI / 2, 0];
        }
        
        // Drag handling for lean-to - track finger continuously, snap only on release
        const handleLeanToPointerDown = (e: any) => {
          if (!leanToEditMode) return;

          // Prevent dragging for wraparound main or child lean-tos
          const target = leanTos.find(lt => lt.id === leanTo.id);
          if (target?.wraparound || target?.parentId) {
            return;
          }

          e.stopPropagation();
          
          setIsDragging(true);
          
          // Store initial state using current position (drag or snapped)
          const currentPos = leanToDragPositions.get(leanTo.id) ?? leanTo.position;
          dragStartRef.current = {
            position: currentPos,
            pointerX: e.point.x,
            pointerZ: e.point.z,
            rafId: null,
            latestPosition: currentPos,
            leanToId: leanTo.id // Track which lean-to started the drag
          };
          
          // Notify parent that dragging started so it can disable rotation
          onLeanToMove(leanTo.id, currentPos, true);
        };
        
        const handleLeanToPointerUp = (e: any) => {
          if (!leanToEditMode) return;
          e.stopPropagation();
          
          if (isDragging && dragStartRef.current) {
            // Cancel any pending RAF
            if (dragStartRef.current.rafId) {
              cancelAnimationFrame(dragStartRef.current.rafId);
            }
            
            setIsDragging(false);
            
            // Snap to nearest position on release, clamping the tracked position
            const rawPos = dragStartRef.current.latestPosition !== undefined 
              ? dragStartRef.current.latestPosition 
              : (leanToDragPositions.get(leanTo.id) ?? leanTo.position);
            const clampedPos = Math.max(0, Math.min(1, rawPos));
            
            // Call with false to trigger snapping in parent
            onLeanToMove(leanTo.id, clampedPos, false);
            dragStartRef.current = null;
          }
        };
        
        const handleLeanToPointerMove = (e: any) => {
          // Only respond if this specific lean-to started the drag
          if (!leanToEditMode || !isDragging || !dragStartRef.current || dragStartRef.current.leanToId !== leanTo.id) return;
          e.stopPropagation();
          
          // Get the axis we're moving along based on wall
          const wallDimension = (leanTo.wall === 'front' || leanTo.wall === 'back') ? width : length;
          const leanToLength = effectiveLength;
          const availableSpace = Math.max(1, wallDimension - leanToLength);
          
          // Calculate delta from start position
          let delta = 0;
          if (leanTo.wall === 'right') {
            delta = e.point.z - dragStartRef.current.pointerZ;
          } else if (leanTo.wall === 'left') {
            delta = dragStartRef.current.pointerZ - e.point.z;
          } else if (leanTo.wall === 'front') {
            delta = e.point.x - dragStartRef.current.pointerX;
          } else { // back
            delta = dragStartRef.current.pointerX - e.point.x;
          }
          
          // Convert delta to position change - DON'T CLAMP YET, track full finger movement
          const positionDelta = delta / availableSpace;
          let rawPosition = dragStartRef.current.position + positionDelta;
          
          // Store unclamped position to continue tracking finger even outside bounds
          dragStartRef.current.latestPosition = rawPosition;
          
          // Clamp only for rendering
          const clampedPosition = Math.max(0, Math.min(1, rawPosition));
          
          // Calculate and directly apply the clamped 3D position for instant feedback
          const centerOffset = (clampedPosition - 0.5) * (wallDimension - effectiveLength);
          
          // Directly update the lean-to group position without triggering React state
          const leanToGroup = leanToGroupRefs.current.get(leanTo.id);
          if (leanToGroup) {
            if (leanTo.wall === 'right') {
              leanToGroup.position.z = centerOffset;
            } else if (leanTo.wall === 'left') {
              leanToGroup.position.z = -centerOffset;
            } else if (leanTo.wall === 'front') {
              leanToGroup.position.x = centerOffset;
            } else {
              leanToGroup.position.x = -centerOffset;
            }
          }
        };
        
        return (
          <group 
            key={leanTo.id}
            ref={(el) => {
              if (el) leanToGroupRefs.current.set(leanTo.id, el);
            }}
            position={leanToPosition} 
            rotation={leanToRotation}
            onPointerDown={handleLeanToPointerDown}
            onPointerUp={handleLeanToPointerUp}
            onPointerMove={handleLeanToPointerMove}
            userData={{ isLeanToGroup: true }}
          >
            {/* Lean-to foundation - frame structure with cutout center */}
            <group position={[0, -0.75, 0]}>
              {/* Outer beam (furthest from main building, under front wall) */}
              <mesh position={[effectiveWidth / 2 + 0.125, 0, 0]}>
                <boxGeometry args={[1.75, 1.5, attachWallLength + 1.5]} />
                <meshStandardMaterial color="#374151" roughness={0.9} />
              </mesh>

              {(() => {
                let hideNegZ = false;
                let hidePosZ = false;

                // Match end-wall hiding logic so footer follows walls exactly
                // 1) PARENT lean-to (front/back) – remove footer at wraparound corner
                if (leanTo.wraparound && (leanTo.wall === 'front' || leanTo.wall === 'back')) {
                  const hasRightCorner = leanTo.wraparoundCorner === 'right' || leanTo.wraparoundCorner === 'both';
                  const hasLeftCorner = leanTo.wraparoundCorner === 'left' || leanTo.wraparoundCorner === 'both';

                  if (leanTo.wall === 'front') {
                    // Front wall reference: right => local -Z, left => local +Z
                    if (hasRightCorner) hideNegZ = true;
                    if (hasLeftCorner) hidePosZ = true;
                  } else {
                    // Back wall reference: right => local +Z, left => local -Z
                    if (hasRightCorner) hidePosZ = true;
                    if (hasLeftCorner) hideNegZ = true;
                  }
                }

                // 2) CHILD lean-to (side) – remove only the end near the triangular wrap
                if (leanTo.parentId) {
                  const parent = leanTos.find(lt => lt.id === leanTo.parentId);
                  if (
                    parent &&
                    parent.wraparound &&
                    (parent.type === 'enclosed' || parent.type === 'open') &&
                    (parent.wall === 'front' || parent.wall === 'back') &&
                    (leanTo.wall === 'left' || leanTo.wall === 'right')
                  ) {
                    const corner = leanTo.wall === 'right' ? 'right' : 'left';
                    const hasCorner =
                      parent.wraparoundCorner === corner || parent.wraparoundCorner === 'both';

                    if (hasCorner) {
                      let baseZSign: number;
                      if (parent.wall === 'front') {
                        baseZSign = corner === 'right' ? -1 : 1;
                      } else {
                        baseZSign = corner === 'right' ? 1 : -1;
                      }

                      const childZSign = -baseZSign; // side lean-to mirrors front/back reference
                      if (childZSign < 0) hideNegZ = true;
                      else hidePosZ = true;
                    }
                  }
                }

                return (
                  <>
                    {/* Footer under end wall at local -Z */}
                    {!hideNegZ && (
                      <mesh position={[0.875, 0, -attachWallLength / 2]}>
                        <boxGeometry args={[effectiveWidth + 0.25, 1.5, 1.75]} />
                        <meshStandardMaterial color="#374151" roughness={0.9} />
                      </mesh>
                    )}

                    {/* Footer under end wall at local +Z */}
                    {!hidePosZ && (
                      <mesh position={[0.875, 0, attachWallLength / 2]}>
                        <boxGeometry args={[effectiveWidth + 0.25, 1.5, 1.75]} />
                        <meshStandardMaterial color="#374151" roughness={0.9} />
                      </mesh>
                    )}
                  </>
                );
              })()}
            </group>
            
            {leanTo.type === 'gable' ? (
              // Gable lean-to - ridge runs parallel to main building, hips into main roof when above eave
              <>
                {/* Gable lean-to roof - ridge parallel to main building */}
                {(() => {
                  const gableRoofRise = (leanTo.pitch / 12) * (attachWallLength / 2);
                  const rawGableApexHeight = leanToHeight + gableRoofRise;
                  const mainBuildingEaveHeight = height;
                  const mainRidgeHeight = height + roofHeight;
                  
                  // Calculate maximum available height for lean-to ridge
                  const maxAvailableRise = mainRidgeHeight - leanToHeight - 0.2; // small clearance
                  
                  // If lean-to would exceed main ridge, calculate effective pitch that fits
                  let effectivePitch = leanTo.pitch;
                  let effectiveRoofRise = gableRoofRise;
                  let cappedGableApexHeight = rawGableApexHeight;
                  
                  if (rawGableApexHeight > mainRidgeHeight) {
                    // Limit pitch to what fits: pitch = (rise / run) * 12
                    effectivePitch = (maxAvailableRise / (attachWallLength / 2)) * 12;
                    effectiveRoofRise = maxAvailableRise;
                    cappedGableApexHeight = leanToHeight + maxAvailableRise;
                  }
                  
                  const roofAngle = Math.atan(effectivePitch / 12);
                  const roofPanelLength = (attachWallLength / 2) / Math.cos(roofAngle);
                  
                  // On sidewalls only: if lean-to ridge exceeds main eave, create hip extension
                  const needsHip = (leanTo.wall === 'left' || leanTo.wall === 'right') && cappedGableApexHeight > mainBuildingEaveHeight;
                  
                  if (needsHip) {
                    const leanToRidgeHeight = cappedGableApexHeight;
                    const heightAboveEave = leanToRidgeHeight - mainBuildingEaveHeight;
                    
                    // Hip horizontal run based on lean-to's own pitch
                    const hipHorizontalRun = (heightAboveEave * 12) / leanTo.pitch;
                    
                    // Calculate the midpoint height where hip panels meet at the capped ridge
                    const hipMidHeight = leanToHeight + effectiveRoofRise / 2;
                    
                    const hipPanelDepth = attachWallLength / 2;
                    
                    // Add extra overlap to close gap between lean-to and main building roof
                    const overlapExtension = 2.0; // Extra width to ensure overlap with main panels
                    const totalHipWidth = hipHorizontalRun + overlapExtension;
                    
                    return (
                      <>
                        {/* Left lean-to gable panel */}
                        <mesh 
                          position={[0, hipMidHeight, -attachWallLength / 4]} 
                          rotation={[-roofAngle, 0, 0]}
                        >
                          <boxGeometry args={[effectiveWidth + 0.2, 0.15, roofPanelLength + 0.2]} />
                          <meshStandardMaterial 
                            color={resolveColor(roofColor)}
                            metalness={0.9}
                            roughness={0.24}
                            bumpMap={roofBump}
                            bumpScale={0.3}
                          />
                        </mesh>
                        
                        {/* Right lean-to gable panel */}
                        <mesh 
                          position={[0, hipMidHeight, attachWallLength / 4]} 
                          rotation={[roofAngle, 0, 0]}
                        >
                          <boxGeometry args={[effectiveWidth + 0.2, 0.15, roofPanelLength + 0.2]} />
                          <meshStandardMaterial 
                            color={resolveColor(roofColor)}
                            metalness={0.9}
                            roughness={0.24}
                            bumpMap={roofBump}
                            bumpScale={0.3}
                          />
                        </mesh>
                        
                        {/* Hip roof extensions - extended to properly overlap with main roof */}
                        {/* Front hip panel with extra width for overlap */}
                        <mesh 
                          position={[-effectiveWidth / 2 - totalHipWidth / 2, hipMidHeight, -attachWallLength / 4]} 
                          rotation={[-roofAngle, 0, 0]}
                        >
                          <boxGeometry args={[totalHipWidth, 0.15, hipPanelDepth]} />
                          <meshStandardMaterial 
                            color={resolveColor(roofColor)}
                            metalness={0.9}
                            roughness={0.24}
                            bumpMap={roofBump}
                            bumpScale={0.8}
                          />
                        </mesh>
                        
                        {/* Back hip panel - extended to properly overlap with main roof */}
                        <mesh 
                          position={[-effectiveWidth / 2 - totalHipWidth / 2, hipMidHeight, attachWallLength / 4]} 
                          rotation={[roofAngle, 0, 0]}
                        >
                          <boxGeometry args={[totalHipWidth, 0.15, hipPanelDepth]} />
                          <meshStandardMaterial 
                            color={resolveColor(roofColor)}
                            metalness={0.9}
                            roughness={0.24}
                            bumpMap={roofBump}
                            bumpScale={0.8}
                          />
                        </mesh>

                      </>
                    );
                  } else {
                    // Standard gable roof below eave height
                    return (
                      <>
                        {/* Left roof panel - ridge parallel to building */}
                        <mesh 
                          position={[0, leanToHeight + effectiveRoofRise / 2, -attachWallLength / 4]} 
                          rotation={[-roofAngle, 0, 0]}
                        >
                          <boxGeometry args={[effectiveWidth + 0.2, 0.15, roofPanelLength + 0.2]} />
                          <meshStandardMaterial 
                            color={resolveColor(roofColor)}
                            metalness={0.9}
                            roughness={0.24}
                            bumpMap={roofBump}
                            bumpScale={0.3}
                          />
                        </mesh>
                        
                        {/* Right roof panel - ridge parallel to building */}
                        <mesh 
                          position={[0, leanToHeight + effectiveRoofRise / 2, attachWallLength / 4]} 
                          rotation={[roofAngle, 0, 0]}
                        >
                          <boxGeometry args={[effectiveWidth + 0.2, 0.15, roofPanelLength + 0.2]} />
                          <meshStandardMaterial 
                            color={resolveColor(roofColor)}
                            metalness={0.9}
                            roughness={0.24}
                            bumpMap={roofBump}
                            bumpScale={0.3}
                          />
                        </mesh>
                        
                      </>
                    );
                  }
                })()}
                
                {/* Gable end wall (front only - furthest from main building) - renders when not open OR when wall is explicitly enabled */}
                {leanTo.type === 'gable' && (!leanTo.isOpen || leanTo.walls?.right === true) && (leanTo.walls?.right !== false) && (() => {
                  const gableGeometry = createLeanToGableEndCapGeometry(leanTo);
                  const gableRoofRise = (leanTo.pitch / 12) * (effectiveLength / 2);
                  const rawGableApexHeight = leanToHeight + gableRoofRise;
                  const mainRidgeHeight = height + roofHeight;
                  const effectiveRoofRise = rawGableApexHeight > mainRidgeHeight 
                    ? mainRidgeHeight - leanToHeight - 0.2 
                    : gableRoofRise;
                  
                  return gableGeometry ? (
                    <>
                      <mesh 
                        key={`leanto-gable-endwall-${leanTo.id}-${wallColor}`} 
                        position={[effectiveWidth / 2, 0, 0]} 
                        rotation={[0, Math.PI / 2, 0]}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDragging && onWallClick) {
                            // Local +X wall is the "right" wall in lean-to space
                            onWallClick(leanTo.wall, leanTo.id, 'right');
                          }
                        }}
                      >
                        <primitive object={gableGeometry} />
                        <meshStandardMaterial 
                          color={resolveColor(wallColor)}
                          metalness={0.9}
                          roughness={0.2}
                          bumpMap={wallBump}
                          bumpScale={0.3}
                          side={THREE.DoubleSide}
                        />
                      </mesh>
                      {/* Highlight for gable end wall (right) */}
                      {highlightedWall && highlightedWall.leanToId === leanTo.id && highlightedWall.leanToWall === 'right' && (
                        <mesh
                          key={`leanto-gable-endwall-highlight-${leanTo.id}`}
                          position={[effectiveWidth / 2 + 0.3, (leanToHeight + effectiveRoofRise / 2) / 2, 0]}
                          rotation={[0, Math.PI / 2, 0]}
                          castShadow={false}
                          receiveShadow={false}
                        >
                          <planeGeometry args={[effectiveLength, leanToHeight + effectiveRoofRise / 2]} />
                          <primitive attach="material" object={leanToHighlightMaterial} />
                        </mesh>
                      )}
                    </>
                  ) : null;
                })()}

                {/* Gable lean-to structural beams - every 25 feet along width (perpendicular to building) */}
                {(() => {
                  const gableRoofRise = (leanTo.pitch / 12) * (effectiveLength / 2);
                  const rawGableApexHeight = leanToHeight + gableRoofRise;
                  const mainRidgeHeight = height + roofHeight;
                  const maxAvailableRise = mainRidgeHeight - leanToHeight - 0.2;
                  let effectiveRoofRise = gableRoofRise;
                  let effectivePitch = leanTo.pitch;
                  
                  if (rawGableApexHeight > mainRidgeHeight) {
                    effectiveRoofRise = maxAvailableRise;
                    effectivePitch = (maxAvailableRise / (effectiveLength / 2)) * 12;
                  }
                  
                  const angle = Math.atan(effectivePitch / 12);
                  const beamLength = (effectiveLength / 2) / Math.cos(angle);
                  
                  const renderBeamSet = (position: number, key: string) => (
                    <group key={key}>
                      {/* Left angled beam following roof pitch */}
                      <mesh 
                        position={[position + 0.875, leanToHeight + effectiveRoofRise / 2 - 0.62 + 0.1667 - 0.25, -effectiveLength / 4 + 0.42]} 
                        rotation={[0.2 * Math.PI / 180, -Math.PI / 2, angle * 1.073]}
                      >
                        <primitive object={createIBeamGeometry(beamLength - 0.65, 'left')} />
                        <primitive attach="material" object={beamMaterial} />
                      </mesh>
                      
                      {/* Right angled beam following roof pitch */}
                      <mesh 
                        position={[position + 0.875, leanToHeight + effectiveRoofRise / 2 - 0.62 + 0.1667 - 0.25, effectiveLength / 4 - 0.3]} 
                        rotation={[-0.2 * Math.PI / 180, -Math.PI / 2, -angle * 1.073]}
                      >
                        <primitive object={createIBeamGeometry(beamLength - 0.65, 'right')} />
                        <primitive attach="material" object={beamMaterial} />
                      </mesh>
                      
                      {/* Vertical support columns */}
                      <mesh position={[position, (leanToHeight + 0.125 - 0.125) / 2, -effectiveLength / 2 + 0.667]} rotation={[2 * Math.PI / 180, 0, 0]}>
                        <primitive object={createIBeamGeometry(leanToHeight + 0.125 - 0.125, 'vertical')} />
                        <primitive attach="material" object={beamMaterial} />
                      </mesh>
                      <mesh position={[position, (leanToHeight + 0.125 - 0.125) / 2, effectiveLength / 2 - 0.684]} rotation={[-2 * Math.PI / 180, 0, 0]}>
                        <primitive object={createIBeamGeometry(leanToHeight + 0.125 - 0.125, 'vertical')} />
                        <primitive attach="material" object={beamMaterial} />
                      </mesh>
                    </group>
                  );
                  
                  const beams = [];
                  
                  // Always add corner beams - 1.25 feet inside the walls
                  beams.push(renderBeamSet(-effectiveWidth / 2 + 1.25, 'corner-left'));
                  beams.push(renderBeamSet(effectiveWidth / 2 - 1.25 - 0.2292, 'corner-right')); // 2.75 inches back from end wall
                  
                  // Add regularly spaced beams in between with 20 foot buffer from corners
                  const spacing = 24.5;
                  const margin = 20;
                  const inner = Math.max(0, effectiveWidth - margin * 2);
                  const n = Math.floor(inner / spacing);
                  const start = -(n * spacing) / 2;
                  
                  for (let i = 0; i <= n; i++) {
                    const position = start + i * spacing;
                    if (position < -effectiveWidth / 2 + margin || position > effectiveWidth / 2 - margin) continue;
                    beams.push(renderBeamSet(position, `middle-${i}`));
                  }
                  
                  return beams;
                })()}
                
                {/* Side walls for gable lean-to - render when not open OR when wall is explicitly enabled */}
                {(!leanTo.isOpen || leanTo.walls?.front === true || leanTo.walls?.back === true) && (
                  <>
                    {/* Front local wall (z -effectiveLength/2) - respects leanTo.walls.front */}
                    {(!leanTo.isOpen || leanTo.walls?.front === true) && (leanTo.walls?.front !== false) && (
                      <>
                        <mesh 
                          key={`leanto-gable-sidewall-front-${leanTo.id}-${wallColor}`} 
                          position={[0, leanToHeight / 2, -effectiveLength / 2]} 
                          rotation={[0, 0, 0]}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isDragging && onWallClick) {
                              onWallClick(leanTo.wall, leanTo.id, 'front');
                            }
                          }}
                        >
                          <boxGeometry args={[effectiveWidth - 0.4, leanToHeight, 0.2]} />
                          <meshStandardMaterial 
                            color={resolveColor(wallColor)}
                            metalness={0.9}
                            roughness={0.2}
                            bumpMap={wallBump}
                            bumpScale={0.3}
                            side={THREE.DoubleSide}
                          />
                        </mesh>
                        {highlightedWall && highlightedWall.leanToId === leanTo.id && highlightedWall.leanToWall === 'front' && (
                          <mesh
                            key={`leanto-gable-sidewall-front-highlight-${leanTo.id}`}
                            position={[0, leanToHeight / 2, -effectiveLength / 2 - 0.3]}
                            rotation={[0, 0, 0]}
                            castShadow={false}
                            receiveShadow={false}
                          >
                            <planeGeometry args={[effectiveWidth, leanToHeight]} />
                            <primitive attach="material" object={leanToHighlightMaterial} />
                          </mesh>
                        )}
                      </>
                    )}

                    {/* Back local wall (z +effectiveLength/2) - respects leanTo.walls.back */}
                    {(!leanTo.isOpen || leanTo.walls?.back === true) && (leanTo.walls?.back !== false) && (
                      <>
                        <mesh 
                          key={`leanto-gable-sidewall-back-${leanTo.id}-${wallColor}`} 
                          position={[0, leanToHeight / 2, effectiveLength / 2]} 
                          rotation={[0, Math.PI, 0]}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isDragging && onWallClick) {
                              onWallClick(leanTo.wall, leanTo.id, 'back');
                            }
                          }}
                        >
                          <boxGeometry args={[effectiveWidth - 0.4, leanToHeight, 0.2]} />
                          <meshStandardMaterial 
                            color={resolveColor(wallColor)}
                            metalness={0.9}
                            roughness={0.2}
                            bumpMap={wallBump}
                            bumpScale={0.3}
                            side={THREE.DoubleSide}
                          />
                        </mesh>
                        {highlightedWall && highlightedWall.leanToId === leanTo.id && highlightedWall.leanToWall === 'back' && (
                          <mesh
                            key={`leanto-gable-sidewall-back-highlight-${leanTo.id}`}
                            position={[0, leanToHeight / 2, effectiveLength / 2 + 0.3]}
                            rotation={[0, Math.PI, 0]}
                            castShadow={false}
                            receiveShadow={false}
                          >
                            <planeGeometry args={[effectiveWidth, leanToHeight]} />
                            <primitive attach="material" object={leanToHighlightMaterial} />
                          </mesh>
                        )}
                      </>
                    )}

                  </>
                )}

                {/* Gable lean-to trim */}
                {(() => {
                  const inset = 0.06;
                  const drop = 0.12; // Match main gable trim height
                  const gableRoofRise = (leanTo.pitch / 12) * (attachWallLength / 2);
                  const rawGableApexHeight = leanToHeight + gableRoofRise;
                  const mainBuildingEaveHeight = height;
                  const mainRidgeHeight = height + roofHeight;
                  
                  // Match the same pitch calculation as the roof
                  let effectivePitch = leanTo.pitch;
                  let effectiveRoofRise = gableRoofRise;
                  
                  if (rawGableApexHeight > mainRidgeHeight) {
                    const maxAvailableRise = mainRidgeHeight - leanToHeight - 0.2;
                    effectivePitch = (maxAvailableRise / (attachWallLength / 2)) * 12;
                    effectiveRoofRise = maxAvailableRise;
                  }
                  
                  const apexY = leanToHeight + effectiveRoofRise - drop;
                  
                  // Outer end (furthest from building)
                  const leftOuterStart: [number, number, number] = [effectiveWidth / 2 + inset, leanToHeight - drop, -attachWallLength / 2 - inset];
                  const rightOuterStart: [number, number, number] = [effectiveWidth / 2 + inset, leanToHeight - drop, attachWallLength / 2 + inset];
                  const apexOuter: [number, number, number] = [effectiveWidth / 2 + inset, apexY, 0];
                  
                  const tfOuterL = rakeTransform(leftOuterStart, apexOuter);
                  const tfOuterR = rakeTransform(rightOuterStart, apexOuter);
                  
                  return (
                    <>
                      {/* Rake trim - left side */}
                      <mesh key={`leanto-gable-rake-left-${trimColor}`} position={tfOuterL.position} quaternion={tfOuterL.quaternion}>
                        <boxGeometry args={[0.3, tfOuterL.length + 0.3, 0.3]} />
                        <primitive attach="material" object={trimMaterial} />
                      </mesh>
                      
                      {/* Rake trim - right side */}
                      <mesh key={`leanto-gable-rake-right-${trimColor}`} position={tfOuterR.position} quaternion={tfOuterR.quaternion}>
                        <boxGeometry args={[0.3, tfOuterR.length + 0.3, 0.3]} />
                        <primitive attach="material" object={trimMaterial} />
                      </mesh>
                      
                      {/* Eave trim on sidewalls */}
                      <mesh key={`leanto-gable-eave-left-${trimColor}`} position={[0, leanToHeight - 0.24, -attachWallLength / 2 - 0.06]}>
                        <boxGeometry args={[effectiveWidth - 0.12, 0.42, 0.42]} />
                        <primitive attach="material" object={trimMaterial} />
                      </mesh>
                      <mesh key={`leanto-gable-eave-right-${trimColor}`} position={[0, leanToHeight - 0.24, attachWallLength / 2 + 0.06]}>
                        <boxGeometry args={[effectiveWidth - 0.12, 0.42, 0.42]} />
                        <primitive attach="material" object={trimMaterial} />
                      </mesh>
                      
                      {/* Corner posts - only at outer edge, not at attachment wall - only when not open */}
                      {!leanTo.isOpen && (
                        <>
                          <mesh key={`leanto-gable-corner-1-${trimColor}`} position={[effectiveWidth / 2, leanToHeight / 2, -attachWallLength / 2]}>
                            <boxGeometry args={[0.3, leanToHeight, 0.3]} />
                            <primitive attach="material" object={trimMaterial} />
                          </mesh>
                          <mesh key={`leanto-gable-corner-2-${trimColor}`} position={[effectiveWidth / 2, leanToHeight / 2, attachWallLength / 2]}>
                            <boxGeometry args={[0.3, leanToHeight, 0.3]} />
                            <primitive attach="material" object={trimMaterial} />
                          </mesh>
                        </>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              // Enclosed or Open lean-to - single slope roof
              <>
                {/* Side walls (for enclosed type only) */}
                {leanTo.type === 'enclosed' && (
                  <mesh 
                    position={[effectiveWidth / 2, leanToHeight / 2, 0]}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDragging && onWallClick) {
                        // Outer wall (away from building) is the "front" wall in lean-to space
                        onWallClick(leanTo.wall, leanTo.id, 'front');
                      }
                    }}
                  >
                    <boxGeometry args={[0.2, leanToHeight, attachWallLength - 0.4]} />
                    <meshStandardMaterial 
                      color={resolveColor(wallColor)}
                      metalness={0.9}
                      roughness={0.2}
                      bumpMap={wallBump}
                      bumpScale={0.3}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                )}

                {/* Single slope roof - highest point at attachment, slopes down */}
                {(() => {
                  const rawLeanToRoofRise = (leanTo.pitch / 12) * effectiveWidth;
                  const rawHighestPoint = leanToHeight + rawLeanToRoofRise;
                  const mainBuildingEaveHeight = height;
                  
                  // Cap the lean-to highest point at the eave (with small clearance)
                  const maxAvailableRise = mainBuildingEaveHeight - leanToHeight - 0.2;
                  
                  let effectivePitch = leanTo.pitch;
                  let effectiveRoofRise = rawLeanToRoofRise;
                  
                  if (rawHighestPoint > mainBuildingEaveHeight) {
                    // Reduce pitch to fit under eave
                    effectivePitch = (maxAvailableRise / effectiveWidth) * 12;
                    effectiveRoofRise = maxAvailableRise;
                  }
                  
                  const roofAngle = Math.atan(effectivePitch / 12);
                  const roofPanelWidth = effectiveWidth / Math.cos(roofAngle);
                  
                  return (
                    <>
                      {/* Main roof panel */}
                      <mesh 
                        position={[0, leanToHeight + effectiveRoofRise / 2, 0]} 
                        rotation={[0, 0, -roofAngle]}
                      >
                        <boxGeometry args={[roofPanelWidth + 0.2, 0.15, attachWallLength + 0.5]} />
                        <meshStandardMaterial 
                          color={resolveColor(roofColor)}
                          metalness={0.9}
                          roughness={0.24}
                          bumpMap={roofBump}
                          bumpScale={0.3}
                        />
                      </mesh>

                      {/* Single slope beams - placed every ~24.5 feet from center outward */}
                      {(() => {
                        const beams = [];
                        
                        // Corner beams first - 0.875 feet inside the ends
                        const cornerFrontPos = -attachWallLength / 2 + 0.875;
                        const cornerBackPos = attachWallLength / 2 - 0.875;
                        
                        // Angled roof beam at front corner
                        beams.push(
                          <mesh 
                            key={`leanto-single-beam-corner-front`}
                            position={[0, leanToHeight + effectiveRoofRise / 2 - 0.75, cornerFrontPos]} 
                            rotation={[0, 0, -roofAngle]}
                          >
                            <primitive object={createIBeamGeometry(roofPanelWidth - 0.5, 'none', 1.4)} />
                            <primitive attach="material" object={beamMaterial} />
                          </mesh>
                        );
                        
                        // Vertical column at front corner - outer side only (tall for single slope)
                        beams.push(
                          <mesh 
                            key={`leanto-single-column-front-outer`}
                            position={[effectiveWidth / 2 - 1.434, (leanToHeight + effectiveRoofRise - 2.5) / 2, cornerFrontPos]} 
                            rotation={[0, 0, 1.5 * Math.PI / 180]}
                          >
                            <primitive object={createIBeamGeometry(leanToHeight + effectiveRoofRise - 2.5, 'vertical')} />
                            <primitive attach="material" object={beamMaterial} />
                          </mesh>
                        );
                        
                        // Angled roof beam at back corner
                        beams.push(
                          <mesh 
                            key={`leanto-single-beam-corner-back`}
                            position={[0, leanToHeight + effectiveRoofRise / 2 - 0.75, cornerBackPos]} 
                            rotation={[0, 0, -roofAngle]}
                          >
                            <primitive object={createIBeamGeometry(roofPanelWidth - 0.5, 'none', 1.4)} />
                            <primitive attach="material" object={beamMaterial} />
                          </mesh>
                        );
                        
                        // Vertical column at back corner - outer side only (tall for single slope)
                        beams.push(
                          <mesh 
                            key={`leanto-single-column-back-outer`}
                            position={[effectiveWidth / 2 - 1.434, (leanToHeight + effectiveRoofRise - 2.5) / 2, cornerBackPos]} 
                            rotation={[0, 0, 1.5 * Math.PI / 180]}
                          >
                            <primitive object={createIBeamGeometry(leanToHeight + effectiveRoofRise - 2.5, 'vertical')} />
                            <primitive attach="material" object={beamMaterial} />
                          </mesh>
                        );
                        
                        // Add regularly spaced beams in between with 20 foot buffer from corners
                        const spacing = 24.5;
                        const margin = 20;
                        const inner = Math.max(0, attachWallLength - margin * 2);
                        const n = Math.floor(inner / spacing);
                        const start = -(n * spacing) / 2;
                        
                        for (let i = 0; i <= n; i++) {
                          const position = start + i * spacing;
                          if (position < -attachWallLength / 2 + margin || position > attachWallLength / 2 - margin) continue;
                          
                          // Angled roof beam
                          beams.push(
                            <mesh 
                              key={`leanto-single-beam-middle-${i}`}
                              position={[0, leanToHeight + effectiveRoofRise / 2 - 0.75, position]} 
                              rotation={[0, 0, -roofAngle]}
                            >
                              <primitive object={createIBeamGeometry(roofPanelWidth - 0.5, 'none', 1.4)} />
                              <primitive attach="material" object={beamMaterial} />
                            </mesh>
                          );
                          
                          // Vertical column at this position - outer side only
                          beams.push(
                            <mesh 
                              key={`leanto-single-column-outer-${i}`}
                              position={[effectiveWidth / 2 - 1.434, (leanToHeight + effectiveRoofRise - 2.5) / 2, position]} 
                              rotation={[0, 0, 1.5 * Math.PI / 180]}
                            >
                              <primitive object={createIBeamGeometry(leanToHeight + effectiveRoofRise - 2.5, 'vertical')} />
                              <primitive attach="material" object={beamMaterial} />
                            </mesh>
                          );
                        }
                        
                        return beams;
                      })()}

                      {/* Wraparound porch roof connection - generate hip panel if this lean-to is part of wraparound */}
                      {(() => {
                        // Find all wraparound lean-tos in the project (exclude children - they only render as adjacent sides)
                        const wraparoundLeanTos = leanTos.filter(lt => 
                          lt.wraparound && lt.wraparoundCorner && (lt.type === 'enclosed' || lt.type === 'open') && !lt.parentId
                        );
                        
                        if (wraparoundLeanTos.length === 0) return null;
                        
                        // Check if THIS lean-to should generate hip panels
                        const panels: any[] = [];
                        
                        wraparoundLeanTos.forEach(wraparoundLeanTo => {
                          const corner = wraparoundLeanTo.wraparoundCorner;
                          const frontBackWall = wraparoundLeanTo.wall;
                          
                          // Determine which corners this wrap uses
                          const rawCorners = corner === 'both' ? ['left', 'right'] : [corner];
                          
                          // This lean-to generates a panel if it's either:
                          // 1. The front/back lean-to with wraparound enabled (parent)
                          // 2. The adjacent side lean-to that connects to it (child)
                          const isMainWraparound = leanTo.id === wraparoundLeanTo.id;
                          const isAdjacentSide =
                            leanTo.parentId === wraparoundLeanTo.id &&
                            (leanTo.type === 'enclosed' || leanTo.type === 'open');
                          
                          // For the child side lean, only render the corner that actually touches this wall
                          const cornersToRender = isMainWraparound
                            ? rawCorners
                            : rawCorners.filter(cornerOption => {
                                let adjWall: 'left' | 'right' | 'front' | 'back';
                                if (frontBackWall === 'front' || frontBackWall === 'back') {
                                  // Front/back parent: adjacent walls are left/right
                                  adjWall = cornerOption === 'right' ? 'right' : 'left';
                                } else {
                                  // Left/right parent: adjacent walls are front/back
                                  adjWall = cornerOption === 'right' ? 'back' : 'front';
                                }
                                return adjWall === leanTo.wall;
                              });
                          
                          if (!isMainWraparound && !isAdjacentSide) return;
                          if (cornersToRender.length === 0) return;
                          
                          // Generate panels for each active corner
                          cornersToRender.forEach(activeCorner => {
                            let adjacentWall: 'left' | 'right' | 'front' | 'back';
                            if (frontBackWall === 'front' || frontBackWall === 'back') {
                              // Front/back parent: adjacent walls are left/right
                              adjacentWall = activeCorner === 'right' ? 'right' : 'left';
                            } else {
                              // Left/right parent: adjacent walls are front/back
                              adjacentWall = activeCorner === 'right' ? 'back' : 'front';
                            }
                            
                            // Get the other lean-to in the connection
                            const otherLeanTo = isMainWraparound 
                              ? leanTos.find(lt => lt.wall === adjacentWall && (lt.type === 'enclosed' || lt.type === 'open'))
                              : wraparoundLeanTo;
                              
                            if (!otherLeanTo) return;

                            // This lean-to's roof edge heights (in local space)
                            const thisOuterY = leanToHeight; // low
                            const thisInnerY = leanToHeight + effectiveRoofRise; // high

                            // Other lean-to's dimensions for calculating ridge endpoint
                            const otherEffectiveWidth = isMainWraparound ? otherLeanTo.width : wraparoundLeanTo.width;
                            const otherHeight = otherLeanTo.height;
                            const otherRawRise = (otherLeanTo.pitch / 12) * (isMainWraparound ? otherLeanTo.width : wraparoundLeanTo.width);
                            const otherRawHighest = otherHeight + otherRawRise;
                            let otherEffectiveRise = otherRawRise;
                            if (otherRawHighest > mainBuildingEaveHeight) {
                              otherEffectiveRise = mainBuildingEaveHeight - otherHeight - 0.2;
                            }
                            const otherInnerY = otherHeight + otherEffectiveRise;

                            // Calculate the shared corner point in world space for perfect alignment
                            // The ridge runs from building corner (high) to outer corner where both lean-tos meet (low)
                            const sharedCornerHighY = Math.max(thisInnerY, otherInnerY); // Building corner - use highest
                            const sharedCornerLowY = Math.min(thisOuterY, otherHeight); // Outer corner - use lowest

                            // Position the triangle at the correct end based on which wall and corner this wrap is on
                            // Main (front/back) lean-to is already correct; sidewall lean-to needs to mirror so it hits the same physical corner
                            let baseZSign: number;
                            if (frontBackWall === 'front') {
                              // Front wall reference: right => local -Z, left => local +Z
                              baseZSign = activeCorner === 'right' ? -1 : 1;
                            } else if (frontBackWall === 'back') {
                              // Back wall reference: right => local +Z, left => local -Z
                              baseZSign = activeCorner === 'right' ? 1 : -1;
                            } else if (frontBackWall === 'left') {
                              // Left wall: right corner => local +Z (back), left corner => local -Z (front)
                              baseZSign = activeCorner === 'right' ? 1 : -1;
                            } else {
                              // Right wall: right corner => local -Z (front), left corner => local +Z (back)
                              baseZSign = activeCorner === 'right' ? -1 : 1;
                            }

                            let zSign: number;
                            if (isMainWraparound) {
                              // Parent (front/back) lean-to uses the base mapping
                              zSign = baseZSign;
                            } else {
                              // Child side lean: mirror the base mapping so it hits the same physical corner
                              zSign = -baseZSign;
                            }
                            const zEdge = (attachWallLength / 2) * zSign;

                            // Hip panel geometry - thicker to match wall thickness
                            const geometry = new THREE.BufferGeometry();
                            const heightAdjust = 0.12; // Raise to be flush with thicker roof
                            const roofThickness = 0.25; // Match wall thickness

                            // Create a single triangular hip panel for this lean-to
                            const extensionAmount = 0.02; // Final tiny reduction to fully eliminate overlap
                            
                            // Calculate the exact shared corner point where both hip panels meet
                            const sharedCornerX = effectiveWidth / 2;
                            const sharedCornerZ = zEdge + ((otherEffectiveWidth + extensionAmount) * zSign);
                            
                            // Create thicker triangular panel with top and bottom faces
                            const vertices = new Float32Array([
                              // Top surface
                              -effectiveWidth / 2, sharedCornerHighY + heightAdjust, zEdge,
                              effectiveWidth / 2, sharedCornerLowY + heightAdjust, zEdge,
                              sharedCornerX, sharedCornerLowY + heightAdjust, sharedCornerZ,
                              // Bottom surface (offset by thickness)
                              -effectiveWidth / 2, sharedCornerHighY + heightAdjust - roofThickness, zEdge,
                              effectiveWidth / 2, sharedCornerLowY + heightAdjust - roofThickness, zEdge,
                              sharedCornerX, sharedCornerLowY + heightAdjust - roofThickness, sharedCornerZ,
                            ]);
                            
                            const indices = new Uint16Array([
                              // Top face
                              0, 1, 2,
                              // Bottom face
                              3, 5, 4,
                              // Side faces
                              0, 3, 4, 0, 4, 1,
                              1, 4, 5, 1, 5, 2,
                              2, 5, 3, 2, 3, 0,
                            ]);

                            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                            geometry.setIndex(new THREE.BufferAttribute(indices, 1));
                            geometry.computeVertexNormals();
                            
                            // UVs scaled in world units; make ribs 5× larger to match corrugation
                            const diagonalLength = Math.sqrt(
                              Math.pow(effectiveWidth, 2) + Math.pow(otherEffectiveWidth + extensionAmount, 2)
                            );
                            const hipScale = 1 / 5; // Changed from 8X to 5X for corrugation
                            const uRepeat = (effectiveWidth / 10) * hipScale;
                            const vRepeat = (diagonalLength / 10) * hipScale;

                            const uvs = new Float32Array([
                              // Top surface UVs
                              0, 0,
                              uRepeat, 0,
                              uRepeat, vRepeat,
                              // Bottom surface UVs (same as top)
                              0, 0,
                              uRepeat, 0,
                              uRepeat, vRepeat,
                            ]);
                            geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

                            panels.push(
                              <mesh key={`hip-${leanTo.id}-${wraparoundLeanTo.id}-${activeCorner}`} geometry={geometry}>
                                <meshStandardMaterial 
                                  color={resolveColor(roofColor)}
                                  metalness={0.9}
                                  roughness={0.24}
                                  bumpMap={roofBump}
                                  bumpScale={0.3}
                                  side={THREE.DoubleSide}
                                />
                              </mesh>
                            );
                          });
                        });
                        
                        return panels.length > 0 ? panels : null;
                      })()}
                    </>
                  );
                })()}
                
                {/* End walls with trapezoid geometry for single slope lean-to */}
                {(() => {
                  const rawLeanToRoofRise = (leanTo.pitch / 12) * effectiveWidth;
                  const rawHighestPoint = leanToHeight + rawLeanToRoofRise;
                  const mainBuildingEaveHeight = height;
                  const maxAvailableRise = mainBuildingEaveHeight - leanToHeight - 0.2;
                  
                  let effectiveRoofRise = rawLeanToRoofRise;
                  if (rawHighestPoint > mainBuildingEaveHeight) {
                    effectiveRoofRise = maxAvailableRise;
                  }
                  
                  // Create trapezoid end cap geometry
                  const s = new THREE.Shape();
                  s.moveTo(-effectiveWidth / 2, 0);
                  s.lineTo(effectiveWidth / 2, 0);
                  s.lineTo(effectiveWidth / 2, leanToHeight + effectiveRoofRise);
                  s.lineTo(-effectiveWidth / 2, leanToHeight);
                  s.closePath();
                  const leanToEndGeometry = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
                  
                  const pos = leanToEndGeometry.attributes.position as THREE.BufferAttribute;
                  const uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2);
                  for (let i = 0; i < pos.count; i++) {
                    const x = pos.getX(i);
                    const y = pos.getY(i);
                    uv.setXY(i, x / 10, y / 10);
                  }
                  leanToEndGeometry.setAttribute('uv', uv);
                  leanToEndGeometry.attributes.uv.needsUpdate = true;
                  
                return (
                  <>
                    {/* Only show end walls if lean-to is enclosed */}
                    {leanTo.type === 'enclosed' && (() => {
                      let hideNegZ = false;
                      let hidePosZ = false;

                      // 1) PARENT lean-to (front/back) – remove end wall at wraparound corner
                      if (leanTo.wraparound && (leanTo.wall === 'front' || leanTo.wall === 'back')) {
                        const hasRightCorner = leanTo.wraparoundCorner === 'right' || leanTo.wraparoundCorner === 'both';
                        const hasLeftCorner = leanTo.wraparoundCorner === 'left' || leanTo.wraparoundCorner === 'both';

                        if (leanTo.wall === 'front') {
                          // Front wall reference: right => local -Z, left => local +Z
                          if (hasRightCorner) hideNegZ = true;
                          if (hasLeftCorner) hidePosZ = true;
                        } else {
                          // Back wall reference: right => local +Z, left => local -Z
                          if (hasRightCorner) hidePosZ = true;
                          if (hasLeftCorner) hideNegZ = true;
                        }
                      }

                      // 2) CHILD lean-to (side) – remove only the end near the triangular wrap
                      if (leanTo.parentId) {
                        const parent = leanTos.find(lt => lt.id === leanTo.parentId);
                        if (
                          parent &&
                          parent.wraparound &&
                          (parent.type === 'enclosed' || parent.type === 'open') &&
                          (parent.wall === 'front' || parent.wall === 'back') &&
                          (leanTo.wall === 'left' || leanTo.wall === 'right')
                        ) {
                          const corner = leanTo.wall === 'right' ? 'right' : 'left';
                          const hasCorner =
                            parent.wraparoundCorner === corner || parent.wraparoundCorner === 'both';

                          if (hasCorner) {
                            // Match the hip panel corner mapping
                            let baseZSign: number;
                            if (parent.wall === 'front') {
                              baseZSign = corner === 'right' ? -1 : 1;
                            } else {
                              baseZSign = corner === 'right' ? 1 : -1;
                            }

                            const childZSign = -baseZSign; // side lean-to mirrors front/back reference
                            if (childZSign < 0) hideNegZ = true;
                            else hidePosZ = true;
                          }
                        }
                      }
                      
                      return (
                        <>
                          {/* End wall at local -Z */}
                          {!hideNegZ && (
                            <mesh 
                              key={`leanto-front-end-${wallColor}`} 
                              position={[0, 0, -attachWallLength / 2]} 
                              rotation={[0, Math.PI, 0]}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isDragging && onWallClick) {
                                  onWallClick(leanTo.wall, leanTo.id, 'left');
                                }
                              }}
                            >
                              <primitive object={leanToEndGeometry.clone()} />
                              <primitive attach="material" object={singleSlopeEndMaterial} />
                            </mesh>
                          )}
                          
                          {/* End wall at local +Z */}
                          {!hidePosZ && (
                            <mesh 
                              key={`leanto-back-end-${wallColor}`} 
                              position={[0, 0, attachWallLength / 2]} 
                              rotation={[0, Math.PI, 0]}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isDragging && onWallClick) {
                                  onWallClick(leanTo.wall, leanTo.id, 'right');
                                }
                              }}
                            >
                              <primitive object={leanToEndGeometry.clone()} />
                              <primitive attach="material" object={singleSlopeEndMaterial} />
                            </mesh>
                          )}
                        </>
                      );
                    })()}
                  </>
                );
                })()}
                
                {/* Single slope lean-to trim - eave and rake */}
                {(() => {
                  const rawLeanToRoofRise = (leanTo.pitch / 12) * effectiveWidth;
                  const rawHighestPoint = leanToHeight + rawLeanToRoofRise;
                  const mainBuildingEaveHeight = height;
                  const maxAvailableRise = mainBuildingEaveHeight - leanToHeight - 0.2;
                  
                  let effectiveRoofRise = rawLeanToRoofRise;
                  if (rawHighestPoint > mainBuildingEaveHeight) {
                    effectiveRoofRise = maxAvailableRise;
                  }
                  
                  const inset = 0.06;
                  const drop = 0.25;
                  
                  // Rake trim on end walls - following the slope from high (attachment) to low (outer edge)
                  const leftFrontTop: [number, number, number] = [-effectiveWidth / 2 - inset, leanToHeight + effectiveRoofRise - drop, -attachWallLength / 2 - inset];
                  const leftFrontBottom: [number, number, number] = [effectiveWidth / 2 + inset, leanToHeight - drop, -attachWallLength / 2 - inset];
                  
                  const rightFrontTop: [number, number, number] = [-effectiveWidth / 2 - inset, leanToHeight + effectiveRoofRise - drop, attachWallLength / 2 + inset];
                  const rightFrontBottom: [number, number, number] = [effectiveWidth / 2 + inset, leanToHeight - drop, attachWallLength / 2 + inset];
                  
                  const tfRakeLeft = rakeTransform(leftFrontBottom, leftFrontTop);
                  const tfRakeRight = rakeTransform(rightFrontBottom, rightFrontTop);
                  
                  // Match end-wall hiding logic so rake trim follows walls exactly
                  let hideNegZ = false;
                  let hidePosZ = false;

                  // 1) PARENT lean-to (front/back/left/right) - match wall hiding logic
                  if (leanTo.wraparound) {
                    const hasRightCorner = leanTo.wraparoundCorner === 'right' || leanTo.wraparoundCorner === 'both';
                    const hasLeftCorner = leanTo.wraparoundCorner === 'left' || leanTo.wraparoundCorner === 'both';

                    if (leanTo.wall === 'front') {
                      // Front wall: right => local -Z, left => local +Z
                      if (hasRightCorner) hideNegZ = true;
                      if (hasLeftCorner) hidePosZ = true;
                    } else if (leanTo.wall === 'back') {
                      // Back wall: right => local +Z, left => local -Z
                      if (hasRightCorner) hidePosZ = true;
                      if (hasLeftCorner) hideNegZ = true;
                    }
                    // Note: Left/right wall parents handled via child logic below
                  }

                  // 2) CHILD lean-to
                  if (leanTo.parentId) {
                    const parent = leanTos.find(lt => lt.id === leanTo.parentId);
                    if (parent && parent.wraparound && (parent.type === 'enclosed' || parent.type === 'open')) {
                      
                      // Case A: Parent on front/back, child on left/right
                      if ((parent.wall === 'front' || parent.wall === 'back') && (leanTo.wall === 'left' || leanTo.wall === 'right')) {
                        const corner = leanTo.wall === 'right' ? 'right' : 'left';
                        const hasCorner = parent.wraparoundCorner === corner || parent.wraparoundCorner === 'both';

                        if (hasCorner) {
                          let baseZSign: number;
                          if (parent.wall === 'front') {
                            baseZSign = corner === 'right' ? -1 : 1;
                          } else {
                            baseZSign = corner === 'right' ? 1 : -1;
                          }

                          const childZSign = -baseZSign;
                          if (childZSign < 0) hideNegZ = true;
                          else hidePosZ = true;
                        }
                      }
                      
                      // Case B: Parent on left/right, child on front/back
                      if ((parent.wall === 'left' || parent.wall === 'right') && (leanTo.wall === 'front' || leanTo.wall === 'back')) {
                        const corner = leanTo.wall === 'front' ? 'left' : 'right';
                        const hasCorner = parent.wraparoundCorner === corner || parent.wraparoundCorner === 'both';

                        if (hasCorner) {
                          // Side wall children: hide the end trim that meets the parent corner
                          let baseXSign: number;
                          if (parent.wall === 'left') {
                            // Left wall: right corner => front (+X), left corner => back (-X)
                            baseXSign = corner === 'right' ? 1 : -1;
                          } else {
                            // Right wall: right corner => back (-X), left corner => front (+X)
                            baseXSign = corner === 'right' ? -1 : 1;
                          }

                          const childXSign = baseXSign;
                          // For front/back children, -Z is one end, +Z is the other
                          // We need to determine which end connects to the parent
                          if (leanTo.wall === 'front') {
                            if (childXSign > 0) hidePosZ = true; // Front child, positive X => right side (+Z)
                            else hideNegZ = true; // Front child, negative X => left side (-Z)
                          } else {
                            if (childXSign > 0) hideNegZ = true; // Back child, positive X => left side (-Z)
                            else hidePosZ = true; // Back child, negative X => right side (+Z)
                          }
                        }
                      }
                    }
                  }
                  
                  return (
                    <>
                      {/* Rake trim on left end (local -Z) */}
                      {!hideNegZ && (
                        <mesh key={`leanto-single-rake-left-${trimColor}`} position={tfRakeLeft.position} quaternion={tfRakeLeft.quaternion}>
                          <boxGeometry args={[0.3, tfRakeLeft.length + 0.3, 0.3]} />
                          <primitive attach="material" object={trimMaterial} />
                        </mesh>
                      )}
                      
                      {/* Rake trim on right end (local +Z) */}
                      {!hidePosZ && (
                        <mesh key={`leanto-single-rake-right-${trimColor}`} position={tfRakeRight.position} quaternion={tfRakeRight.quaternion}>
                          <boxGeometry args={[0.3, tfRakeRight.length + 0.3, 0.3]} />
                          <primitive attach="material" object={trimMaterial} />
                        </mesh>
                      )}
                      
                      {/* Eave trim on high side - near main building - always show */}
                      <mesh key={`leanto-single-eave-high-${trimColor}`} position={[-effectiveWidth / 2 - 0.06, leanToHeight + effectiveRoofRise - 0.24, 0]}>
                        <boxGeometry args={[0.42, 0.42, attachWallLength + 0.12]} />
                        <primitive attach="material" object={trimMaterial} />
                      </mesh>
                      
                      {/* Eave trim on low side - outer edge - always show */}
                      <mesh key={`leanto-single-eave-low-${trimColor}`} position={[effectiveWidth / 2 + 0.06, leanToHeight - 0.24, 0]}>
                        <boxGeometry args={[0.42, 0.42, attachWallLength + 0.12]} />
                        <primitive attach="material" object={trimMaterial} />
                      </mesh>
                      
                      {/* Vertical corner trims at low side - both ends - only if lean-to is enclosed and no wraparound */}
                      {leanTo.type === 'enclosed' && (
                        <>
                          {/* Vertical corner trim at local -Z (shares logic with end wall / rake / footer) */}
                          {!hideNegZ && (
                            <mesh
                              key={`leanto-single-corner-left-${trimColor}`}
                              position={[effectiveWidth / 2 + 0.06, leanToHeight / 2, -attachWallLength / 2]}
                            >
                              <boxGeometry args={[0.3, leanToHeight, 0.3]} />
                              <primitive attach="material" object={trimMaterial} />
                            </mesh>
                          )}
                          {/* Vertical corner trim at local +Z (shares logic with end wall / rake / footer) */}
                          {!hidePosZ && (
                            <mesh
                              key={`leanto-single-corner-right-${trimColor}`}
                              position={[effectiveWidth / 2 + 0.06, leanToHeight / 2, attachWallLength / 2]}
                            >
                              <boxGeometry args={[0.3, leanToHeight, 0.3]} />
                              <primitive attach="material" object={trimMaterial} />
                            </mesh>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
                
                {/* Wraparound corner connecting walls - rectangular L-shapes that meet exactly at the hip corner */}
                {(() => {
                  if (!leanTo.wraparound) return null;

                  const panels = [] as JSX.Element[];
                  const parentWall = leanTo.wall;
                  
                  // === FRONT/BACK WALL PARENTS ===
                  if (parentWall === 'front' || parentWall === 'back') {
                    const isBackWall = parentWall === 'back';

                    const rightChild = leanTos.find(lt => lt.parentId === leanTo.id && lt.wall === 'right');
                    if (rightChild) {
                      const cornerX = effectiveWidth / 2;
                      const cornerZ = isBackWall 
                        ? attachWallLength / 2 + rightChild.width 
                        : -attachWallLength / 2 - rightChild.width;
                      const mainLegWidth = effectiveWidth + 1.4;
                      const mainLegCenterX = cornerX - mainLegWidth / 2;

                      // Only add connecting walls and corner trim if not 'open'
                      if (leanTo.type !== 'open') {
                        // Side leg along Z direction
                        panels.push(
                          <mesh
                            key={`wrap-connect-right-sidewall-${wallColor}`}
                            position={[cornerX, leanToHeight / 2, isBackWall ? cornerZ - rightChild.width / 2 - 0.5 : cornerZ + rightChild.width / 2 + 0.5]}
                          >
                            <boxGeometry args={[0.25, leanToHeight, rightChild.width + 1.2]} />
                            <primitive attach="material" object={singleSlopeEndMaterial} />
                          </mesh>
                        );

                        // Main leg along X direction
                        panels.push(
                          <mesh
                            key={`wrap-connect-right-mainwall-${wallColor}`}
                            position={[mainLegCenterX, leanToHeight / 2, isBackWall ? cornerZ - 0.125 : cornerZ + 0.125]}
                          >
                            <boxGeometry args={[mainLegWidth, leanToHeight, 0.25]} />
                            <primitive attach="material" object={singleSlopeEndMaterial} />
                          </mesh>
                        );

                        // Vertical corner trim post
                        panels.push(
                          <mesh
                            key={`wrap-corner-trim-right-${trimColor}`}
                            position={[cornerX, leanToHeight / 2, cornerZ + (isBackWall ? -0.125 : 0.125)]}
                          >
                            <boxGeometry args={[0.3, leanToHeight, 0.3]} />
                            <primitive attach="material" object={trimMaterial} />
                          </mesh>
                        );
                      }

                      // Trim along side leg
                      panels.push(
                        <mesh
                          key={`wrap-eave-right-side-${trimColor}`}
                          position={[cornerX, leanToHeight - 0.24, isBackWall ? cornerZ - rightChild.width / 2 - 0.5 : cornerZ + rightChild.width / 2 + 0.5]}
                        >
                          <boxGeometry args={[0.42, 0.42, rightChild.width + 1.3]} />
                          <primitive attach="material" object={trimMaterial} />
                        </mesh>
                      );

                      // Trim along main leg
                      panels.push(
                        <mesh
                          key={`wrap-eave-right-main-${trimColor}`}
                          position={[mainLegCenterX, leanToHeight - 0.24, isBackWall ? cornerZ - 0.125 : cornerZ + 0.125]}
                        >
                          <boxGeometry args={[mainLegWidth + 0.3, 0.42, 0.42]} />
                          <primitive attach="material" object={trimMaterial} />
                        </mesh>
                      );

                      // Footer under side leg
                      panels.push(
                        <mesh
                          key={`wrap-footer-right-side-${trimColor}`}
                          position={[cornerX + 0.125, -0.75, isBackWall ? cornerZ - rightChild.width / 2 - 0.4 : cornerZ + rightChild.width / 2 + 0.4]}
                        >
                          <boxGeometry args={[1.75, 1.5, rightChild.width + 2.5]} />
                          <meshStandardMaterial color="#374151" roughness={0.9} />
                        </mesh>
                      );

                      // Footer under main leg
                      panels.push(
                        <mesh
                          key={`wrap-footer-right-main-${trimColor}`}
                          position={[mainLegCenterX - 0.0625, -0.75, isBackWall ? cornerZ + 0.04 : cornerZ - 0.04]}
                        >
                          <boxGeometry args={[mainLegWidth + 1.75, 1.5, 1.8]} />
                          <meshStandardMaterial color="#374151" roughness={0.9} />
                        </mesh>
                      );
                    }

                    const leftChild = leanTos.find(lt => lt.parentId === leanTo.id && lt.wall === 'left');
                    if (leftChild) {
                      const cornerX = effectiveWidth / 2;
                      const cornerZ = isBackWall
                        ? -attachWallLength / 2 - leftChild.width
                        : attachWallLength / 2 + leftChild.width;
                      const mainLegWidth = effectiveWidth + 1.4;
                      const mainLegCenterX = cornerX - mainLegWidth / 2;

                      // Only add connecting walls and corner trim if not 'open'
                      if (leanTo.type !== 'open') {
                        // Side leg along Z direction
                        panels.push(
                          <mesh
                            key={`wrap-connect-left-sidewall-${wallColor}`}
                            position={[cornerX, leanToHeight / 2, isBackWall ? cornerZ + leftChild.width / 2 + 0.5 : cornerZ - leftChild.width / 2 - 0.5]}
                          >
                            <boxGeometry args={[0.25, leanToHeight, leftChild.width + 1.2]} />
                            <primitive attach="material" object={singleSlopeEndMaterial} />
                          </mesh>
                        );

                        // Main leg along X direction
                        panels.push(
                          <mesh
                            key={`wrap-connect-left-mainwall-${wallColor}`}
                            position={[mainLegCenterX, leanToHeight / 2, isBackWall ? cornerZ + 0.125 : cornerZ - 0.125]}
                          >
                            <boxGeometry args={[mainLegWidth, leanToHeight, 0.25]} />
                            <primitive attach="material" object={singleSlopeEndMaterial} />
                          </mesh>
                        );

                        // Vertical corner trim post
                        panels.push(
                          <mesh
                            key={`wrap-corner-trim-left-${trimColor}`}
                            position={[cornerX, leanToHeight / 2, cornerZ + (isBackWall ? 0.125 : -0.125)]}
                          >
                            <boxGeometry args={[0.3, leanToHeight, 0.3]} />
                            <primitive attach="material" object={trimMaterial} />
                          </mesh>
                        );
                      }

                      // Trim along side leg
                      panels.push(
                        <mesh
                          key={`wrap-eave-left-side-${trimColor}`}
                          position={[cornerX, leanToHeight - 0.24, isBackWall ? cornerZ + leftChild.width / 2 + 0.5 : cornerZ - leftChild.width / 2 - 0.5]}
                        >
                          <boxGeometry args={[0.42, 0.42, leftChild.width + 1.3]} />
                          <primitive attach="material" object={trimMaterial} />
                        </mesh>
                      );

                      // Trim along main leg
                      panels.push(
                        <mesh
                          key={`wrap-eave-left-main-${trimColor}`}
                          position={[mainLegCenterX, leanToHeight - 0.24, isBackWall ? cornerZ + 0.125 : cornerZ - 0.125]}
                        >
                          <boxGeometry args={[mainLegWidth + 0.3, 0.42, 0.42]} />
                          <primitive attach="material" object={trimMaterial} />
                        </mesh>
                      );

                      // Footer under side leg
                      panels.push(
                        <mesh
                          key={`wrap-footer-left-side-${trimColor}`}
                          position={[cornerX + 0.125, -0.75, isBackWall ? cornerZ + leftChild.width / 2 + 0.5 : cornerZ - leftChild.width / 2 - 0.5]}
                        >
                          <boxGeometry args={[1.75, 1.5, leftChild.width + 2.625]} />
                          <meshStandardMaterial color="#374151" roughness={0.9} />
                        </mesh>
                      );

                      // Footer under main leg
                      panels.push(
                        <mesh
                          key={`wrap-footer-left-main-${trimColor}`}
                          position={[mainLegCenterX - 0.0625, -0.75, isBackWall ? cornerZ - 0.04 : cornerZ + 0.04]}
                        >
                          <boxGeometry args={[mainLegWidth + 1.75, 1.5, 1.8]} />
                          <meshStandardMaterial color="#374151" roughness={0.9} />
                        </mesh>
                      );
                    }
                  }


                  return <>{panels}</>;
                })()}
                
                {/* Enclosed type - outer wall only (local +X, "front" in lean-to space) - only for flat lean-tos (pitch 0) */}
                {leanTo.type === 'enclosed' && leanTo.pitch === 0 && highlightedWall && highlightedWall.leanToId === leanTo.id && highlightedWall.leanToWall === 'front' && (
                  <group>
                    <mesh position={[effectiveWidth / 2 + 0.3, leanToHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={false} receiveShadow={false}>
                      <planeGeometry args={[attachWallLength, leanToHeight]} />
                      <primitive attach="material" object={leanToHighlightMaterial} />
                    </mesh>
                    <lineSegments position={[effectiveWidth / 2 + 0.35, leanToHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
                      <edgesGeometry args={[new THREE.PlaneGeometry(attachWallLength, leanToHeight)]} />
                      <lineBasicMaterial color="#1d4ed8" linewidth={3} />
                    </lineSegments>
                  </group>
                )}
                
                {/* Single slope trapezoid end walls highlighting - only for pitched lean-tos */}
                {leanTo.type === 'enclosed' && leanTo.pitch > 0 && (() => {
                  const rawLeanToRoofRise = (leanTo.pitch / 12) * effectiveWidth;
                  const rawHighestPoint = leanToHeight + rawLeanToRoofRise;
                  const mainBuildingEaveHeight = height;
                  const maxAvailableRise = mainBuildingEaveHeight - leanToHeight - 0.2;
                  
                  let effectiveRoofRise = rawLeanToRoofRise;
                  if (rawHighestPoint > mainBuildingEaveHeight) {
                    effectiveRoofRise = maxAvailableRise;
                  }
                  
                  const s = new THREE.Shape();
                  s.moveTo(-effectiveWidth / 2, 0);
                  s.lineTo(effectiveWidth / 2, 0);
                  s.lineTo(effectiveWidth / 2, leanToHeight + effectiveRoofRise);
                  s.lineTo(-effectiveWidth / 2, leanToHeight);
                  s.closePath();
                  const highlightGeometry = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
                  
                  return (
                    <>
                      {/* Front end wall (left side) highlight */}
                      {highlightedWall && highlightedWall.leanToId === leanTo.id && highlightedWall.leanToWall === 'left' && (
                        <group>
                          <mesh position={[0, 0, -attachWallLength / 2 - 0.3]} rotation={[0, Math.PI, 0]} castShadow={false} receiveShadow={false}>
                            <primitive object={highlightGeometry.clone()} />
                            <primitive attach="material" object={leanToHighlightMaterial} />
                          </mesh>
                          <lineSegments position={[0, 0, -attachWallLength / 2 - 0.35]} rotation={[0, Math.PI, 0]}>
                            <edgesGeometry args={[highlightGeometry.clone()]} />
                            <lineBasicMaterial color="#1d4ed8" linewidth={3} />
                          </lineSegments>
                        </group>
                      )}
                      
                      {/* Back end wall (right side) highlight */}
                      {highlightedWall && highlightedWall.leanToId === leanTo.id && highlightedWall.leanToWall === 'right' && (
                        <group>
                          <mesh position={[0, 0, attachWallLength / 2 + 0.3]} rotation={[0, Math.PI, 0]} castShadow={false} receiveShadow={false}>
                            <primitive object={highlightGeometry.clone()} />
                            <primitive attach="material" object={leanToHighlightMaterial} />
                          </mesh>
                          <lineSegments position={[0, 0, attachWallLength / 2 + 0.35]} rotation={[0, Math.PI, 0]}>
                            <edgesGeometry args={[highlightGeometry.clone()]} />
                            <lineBasicMaterial color="#1d4ed8" linewidth={3} />
                          </lineSegments>
                        </group>
                      )}
                      
                      {/* Outer wall (front) highlight - for single slope */}
                      {highlightedWall && highlightedWall.leanToId === leanTo.id && highlightedWall.leanToWall === 'front' && (
                        <group>
                          <mesh position={[effectiveWidth / 2 + 0.3, leanToHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={false} receiveShadow={false}>
                            <planeGeometry args={[attachWallLength, leanToHeight]} />
                            <primitive attach="material" object={leanToHighlightMaterial} />
                          </mesh>
                          <lineSegments position={[effectiveWidth / 2 + 0.35, leanToHeight / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
                            <edgesGeometry args={[new THREE.PlaneGeometry(attachWallLength, leanToHeight)]} />
                            <lineBasicMaterial color="#1d4ed8" linewidth={3} />
                          </lineSegments>
                        </group>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {/* Lean-to Doors */}
            {doors.filter(d => d.leanToId === leanTo.id).map((door) => {
              const leanToWallLength = door.leanToWall === 'front' ? attachWallLength : effectiveWidth;
              const outward = 0.11;

              // Position along the wall in lean-to local space
              const along = (door.position - 0.5) * leanToWallLength;
              
              // Determine position and rotation based on which lean-to wall
              let posX = 0, posY = Math.max(door.height / 2, 0.5), posZ = 0;
              let rotY = 0;
              
              if (door.leanToWall === 'front') {
                // Outer wall (local +X)
                posX = effectiveWidth / 2 + outward;
                posZ = along;
                rotY = Math.PI / 2;
              } else if (door.leanToWall === 'back') {
                // Attachment wall (local -X) - shouldn't have doors but handle it
                posX = -effectiveWidth / 2 - outward;
                posZ = along;
                rotY = -Math.PI / 2;
              } else if (door.leanToWall === 'left') {
                // Left end wall (local -Z)
                posX = along;
                posZ = -attachWallLength / 2 - outward;
                rotY = Math.PI;
              } else if (door.leanToWall === 'right') {
                // Right end wall (local +Z)
                posX = along;
                posZ = attachWallLength / 2 + outward;
                rotY = 0;
              }

              return (
                <group 
                  key={door.id}
                  ref={(el) => {
                    if (el) doorGroupRefs.current.set(door.id, el);
                    else doorGroupRefs.current.delete(door.id);
                  }}
                  position={[posX, posY, posZ]} 
                  rotation={[0, rotY, 0]}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    (e as any).nativeEvent?.preventDefault?.();
                    try { (e.target as any)?.setPointerCapture?.(e.pointerId); } catch {}
                    setLocalDraggedDoorId(door.id);
                    onDraggedDoorIdChange(door.id);
                    gl.domElement.style.cursor = 'grab';
                    
                    doorDragState.current.set(door.id, {
                      startPosition: door.position,
                      unclamped: door.position
                    });
                    
                    // Set up drag plane for lean-to wall
                    const leanToGroup = leanToGroupRefs.current.get(leanTo.id);
                    if (!leanToGroup) return;
                    
                    const worldPos = new THREE.Vector3();
                    leanToGroup.getWorldPosition(worldPos);
                    const worldQuat = new THREE.Quaternion();
                    leanToGroup.getWorldQuaternion(worldQuat);
                    
                    if (door.leanToWall === 'front' || door.leanToWall === 'back') {
                      const normal = new THREE.Vector3(1, 0, 0);
                      normal.applyQuaternion(worldQuat);
                      const offset = door.leanToWall === 'front' ? effectiveWidth / 2 + outward : -effectiveWidth / 2 - outward;
                      const planePoint = worldPos.clone().add(new THREE.Vector3(offset, 0, 0).applyQuaternion(worldQuat));
                      dragPlaneRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, planePoint);
                    } else {
                      const normal = new THREE.Vector3(0, 0, 1);
                      normal.applyQuaternion(worldQuat);
                      const offset = door.leanToWall === 'right' ? attachWallLength / 2 + outward : -attachWallLength / 2 - outward;
                      const planePoint = worldPos.clone().add(new THREE.Vector3(0, 0, offset).applyQuaternion(worldQuat));
                      dragPlaneRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, planePoint);
                    }
                    
                    const hit = new THREE.Vector3();
                    if (dragPlaneRef.current && e.ray.intersectPlane(dragPlaneRef.current, hit)) {
                      const localHit = leanToGroup.worldToLocal(hit.clone());
                      const hitCoord = (door.leanToWall === 'front' || door.leanToWall === 'back') ? localHit.z : localHit.x;
                      dragOffsetRef.current = hitCoord - along;
                    } else {
                      dragOffsetRef.current = 0;
                    }
                    if (controlsRef.current) controlsRef.current.enabled = false;
                  }}
                  onPointerMove={(e) => {
                    if (localDraggedDoorId === door.id && dragPlaneRef.current) {
                      setIsDragging(true);
                      gl.domElement.style.cursor = 'grabbing';
                      const hit = new THREE.Vector3();
                      if (e.ray.intersectPlane(dragPlaneRef.current, hit)) {
                        const leanToGroup = leanToGroupRefs.current.get(leanTo.id);
                        if (!leanToGroup) return;
                        
                        const localHit = leanToGroup.worldToLocal(hit.clone());
                        const hitCoord = (door.leanToWall === 'front' || door.leanToWall === 'back') ? localHit.z : localHit.x;
                        const newCenter = hitCoord - dragOffsetRef.current;
                        const axisLen = door.leanToWall === 'front' ? attachWallLength : effectiveWidth;
                        
                        let rawU = (newCenter + axisLen / 2) / axisLen;
                        
                        const dragState = doorDragState.current.get(door.id);
                        if (dragState) {
                          dragState.unclamped = rawU;
                        }
                        
                        const trimBuffer = 0.5;
                        const doorHalfWidth = door.width / 2;
                        const totalBuffer = doorHalfWidth + trimBuffer;
                        const minU = totalBuffer / axisLen;
                        const maxU = 1 - (totalBuffer / axisLen);
                        const clampedU = Math.max(minU, Math.min(maxU, rawU));
                        
                        const doorGroup = doorGroupRefs.current.get(door.id);
                        if (doorGroup) {
                          if (door.leanToWall === 'front' || door.leanToWall === 'back') {
                            doorGroup.position.z = (clampedU - 0.5) * axisLen;
                          } else {
                            doorGroup.position.x = (clampedU - 0.5) * axisLen;
                          }
                        }
                      }
                    }
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    gl.domElement.style.cursor = 'default';
                    if (controlsRef.current) controlsRef.current.enabled = true;
                    onDraggedDoorIdChange(null);
                    setLocalDraggedDoorId(null);
                    setIsDragging(false);
                    
                    const dragState = doorDragState.current.get(door.id);
                    if (dragState) {
                      const finalPosition = Math.max(0, Math.min(1, dragState.unclamped));
                      onDoorMove(door.id, finalPosition);
                      doorDragState.current.delete(door.id);
                    }
                  }}
                >
                  {/* Door panel */}
                  <mesh 
                    castShadow
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDragging) {
                        onDoorClick(door.id);
                      }
                    }}
                  >
                    <boxGeometry args={[door.width, door.height, 0.2]} />
                    <meshStandardMaterial 
                      color="#FFFFFF"
                      roughness={0.3}
                      metalness={0.1}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                  
                  {/* Door trim frame (not at bottom) */}
                  <group>
                    {/* Top trim - extended for flush squared corners */}
                    <mesh key={`door-trim-top-${door.id}-${trimColor}`} position={[0, door.height / 2 + 0.15, 0]}>
                      <boxGeometry args={[door.width + 0.6, 0.3, 0.25]} />
                      <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
                    </mesh>
                    {/* Left trim */}
                    <mesh key={`door-trim-left-${door.id}-${trimColor}`} position={[-door.width / 2 - 0.15, 0, 0]}>
                      <boxGeometry args={[0.3, door.height, 0.25]} />
                      <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
                    </mesh>
                    {/* Right trim */}
                    <mesh key={`door-trim-right-${door.id}-${trimColor}`} position={[door.width / 2 + 0.15, 0, 0]}>
                      <boxGeometry args={[0.3, door.height, 0.25]} />
                      <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
                    </mesh>
                  </group>
                </group>
              );
            })}

            {/* Lean-to Windows */}
            {windows.filter(w => w.leanToId === leanTo.id).map((window) => {
              const leanToWallLength = window.leanToWall === 'front' ? attachWallLength : effectiveWidth;
              const outward = 0.11;
              
              const along = (window.position - 0.5) * leanToWallLength;
              
              let posX = 0, posY = 7 - window.height / 2, posZ = 0;
              let rotY = 0;
              
              if (window.leanToWall === 'front') {
                posX = effectiveWidth / 2 + outward;
                posZ = along;
                rotY = Math.PI / 2;
              } else if (window.leanToWall === 'back') {
                posX = -effectiveWidth / 2 - outward;
                posZ = along;
                rotY = -Math.PI / 2;
              } else if (window.leanToWall === 'left') {
                posX = along;
                posZ = -attachWallLength / 2 - outward;
                rotY = Math.PI;
              } else if (window.leanToWall === 'right') {
                posX = along;
                posZ = attachWallLength / 2 + outward;
                rotY = 0;
              }

              return (
                <group 
                  key={window.id}
                  ref={(el) => {
                    if (el) windowGroupRefs.current.set(window.id, el);
                    else windowGroupRefs.current.delete(window.id);
                  }}
                  position={[posX, posY, posZ]} 
                  rotation={[0, rotY, 0]}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    (e as any).nativeEvent?.preventDefault?.();
                    try { (e.target as any)?.setPointerCapture?.(e.pointerId); } catch {}
                    setLocalDraggedWindowId(window.id);
                    onDraggedWindowIdChange(window.id);
                    gl.domElement.style.cursor = 'grab';
                    
                    windowDragState.current.set(window.id, {
                      startPosition: window.position,
                      unclamped: window.position
                    });
                    
                    // Set up drag plane for lean-to wall
                    const leanToGroup = leanToGroupRefs.current.get(leanTo.id);
                    if (!leanToGroup) return;
                    
                    const worldPos = new THREE.Vector3();
                    leanToGroup.getWorldPosition(worldPos);
                    const worldQuat = new THREE.Quaternion();
                    leanToGroup.getWorldQuaternion(worldQuat);
                    
                    if (window.leanToWall === 'front' || window.leanToWall === 'back') {
                      const normal = new THREE.Vector3(1, 0, 0);
                      normal.applyQuaternion(worldQuat);
                      const offset = window.leanToWall === 'front' ? effectiveWidth / 2 + outward : -effectiveWidth / 2 - outward;
                      const planePoint = worldPos.clone().add(new THREE.Vector3(offset, 0, 0).applyQuaternion(worldQuat));
                      dragPlaneRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, planePoint);
                    } else {
                      const normal = new THREE.Vector3(0, 0, 1);
                      normal.applyQuaternion(worldQuat);
                      const offset = window.leanToWall === 'right' ? attachWallLength / 2 + outward : -attachWallLength / 2 - outward;
                      const planePoint = worldPos.clone().add(new THREE.Vector3(0, 0, offset).applyQuaternion(worldQuat));
                      dragPlaneRef.current = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, planePoint);
                    }
                    
                    const hit = new THREE.Vector3();
                    if (dragPlaneRef.current && e.ray.intersectPlane(dragPlaneRef.current, hit)) {
                      const localHit = leanToGroup.worldToLocal(hit.clone());
                      const hitCoord = (window.leanToWall === 'front' || window.leanToWall === 'back') ? localHit.z : localHit.x;
                      dragOffsetRef.current = hitCoord - along;
                    } else {
                      dragOffsetRef.current = 0;
                    }
                    if (controlsRef.current) controlsRef.current.enabled = false;
                  }}
                  onPointerMove={(e) => {
                    if (localDraggedWindowId === window.id && dragPlaneRef.current) {
                      setIsDragging(true);
                      gl.domElement.style.cursor = 'grabbing';
                      const hit = new THREE.Vector3();
                      if (e.ray.intersectPlane(dragPlaneRef.current, hit)) {
                        const leanToGroup = leanToGroupRefs.current.get(leanTo.id);
                        if (!leanToGroup) return;
                        
                        const localHit = leanToGroup.worldToLocal(hit.clone());
                        const hitCoord = (window.leanToWall === 'front' || window.leanToWall === 'back') ? localHit.z : localHit.x;
                        const newCenter = hitCoord - dragOffsetRef.current;
                        const axisLen = window.leanToWall === 'front' ? attachWallLength : effectiveWidth;
                        
                        let rawU = (newCenter + axisLen / 2) / axisLen;
                        
                        const dragState = windowDragState.current.get(window.id);
                        if (dragState) {
                          dragState.unclamped = rawU;
                        }
                        
                        const trimBuffer = 0.5;
                        const windowHalfWidth = window.width / 2;
                        const totalBuffer = windowHalfWidth + trimBuffer;
                        const minU = totalBuffer / axisLen;
                        const maxU = 1 - (totalBuffer / axisLen);
                        const clampedU = Math.max(minU, Math.min(maxU, rawU));
                        
                        const windowGroup = windowGroupRefs.current.get(window.id);
                        if (windowGroup) {
                          if (window.leanToWall === 'front' || window.leanToWall === 'back') {
                            windowGroup.position.z = (clampedU - 0.5) * axisLen;
                          } else {
                            windowGroup.position.x = (clampedU - 0.5) * axisLen;
                          }
                        }
                      }
                    }
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    gl.domElement.style.cursor = 'default';
                    if (controlsRef.current) controlsRef.current.enabled = true;
                    onDraggedWindowIdChange(null);
                    setLocalDraggedWindowId(null);
                    setIsDragging(false);
                    
                    const dragState = windowDragState.current.get(window.id);
                    if (dragState) {
                      const finalPosition = Math.max(0, Math.min(1, dragState.unclamped));
                      onWindowMove(window.id, finalPosition);
                      windowDragState.current.delete(window.id);
                    }
                  }}
                >
                  {/* Window pane */}
                  <mesh
                    onClick={(e) => { e.stopPropagation(); if (!isDragging) onWindowClick(window.id); }}
                  >
                    <boxGeometry args={[window.width, window.height, 0.2]} />
                    <meshStandardMaterial 
                      color="#E0F2FE" 
                      transparent 
                      opacity={0.7}
                      roughness={0.1}
                      metalness={0.5}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                  
                  {/* Window grid */}
                  <group>
                    {/* Horizontal grid line */}
                    <mesh key={`window-grid-h-${window.id}-${trimColor}`} position={[0, 0, 0]}>
                      <boxGeometry args={[window.width, 0.08, 0.21]} />
                      <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
                    </mesh>
                    {/* Vertical grid line */}
                    <mesh key={`window-grid-v-${window.id}-${trimColor}`} position={[0, 0, 0]}>
                      <boxGeometry args={[0.08, window.height, 0.21]} />
                      <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
                    </mesh>
                  </group>
                  
                  {/* Window trim frame */}
                  <group>
                    {/* Top trim - extended for flush squared corners */}
                    <mesh key={`window-trim-top-${window.id}-${trimColor}`} position={[0, window.height / 2 + 0.15, 0]}>
                      <boxGeometry args={[window.width + 0.6, 0.3, 0.25]} />
                      <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
                    </mesh>
                    {/* Bottom trim - extended for flush squared corners */}
                    <mesh key={`window-trim-bottom-${window.id}-${trimColor}`} position={[0, -window.height / 2 - 0.15, 0]}>
                      <boxGeometry args={[window.width + 0.6, 0.3, 0.25]} />
                      <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
                    </mesh>
                    {/* Left trim */}
                    <mesh key={`window-trim-left-${window.id}-${trimColor}`} position={[-window.width / 2 - 0.15, 0, 0]}>
                      <boxGeometry args={[0.3, window.height, 0.25]} />
                      <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
                    </mesh>
                    {/* Right trim */}
                    <mesh key={`window-trim-right-${window.id}-${trimColor}`} position={[window.width / 2 + 0.15, 0, 0]}>
                      <boxGeometry args={[0.3, window.height, 0.25]} />
                      <meshStandardMaterial color={resolveColor(trimColor)} metalness={0.8} roughness={0.35} />
                    </mesh>
                  </group>
                </group>
              );
            })}

          </group>
        );
      })}
    </group>
  );
};
