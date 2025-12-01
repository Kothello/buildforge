import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { BuildingModel } from './BuildingModel';
import type { Door, Window } from './types';

// Camera tracker and auto-zoom component with smooth transitions
const CameraTracker = ({ 
  onGetCameraAngle,
  modelGroupRef,
  controlsRef,
  expectedDimensions,
  editMode,
  isDraggingLeanTo
}: { 
  onGetCameraAngle?: (angle: { x: number; y: number; z: number }) => void;
  modelGroupRef: React.RefObject<THREE.Group>;
  controlsRef: React.RefObject<any>;
  expectedDimensions: { width: number; length: number; height: number };
  editMode: boolean;
  isDraggingLeanTo: boolean;
}) => {
  // Reusable objects
  const tempBox = useRef(new THREE.Box3());
  const tempSize = useRef(new THREE.Vector3());
  const tempCenter = useRef(new THREE.Vector3());
  const tempDirection = useRef(new THREE.Vector3());
  const lastSizeRef = useRef<{ width: number; height: number; depth: number }>({ width: 0, height: 0, depth: 0 });
  const lastRequiredDistanceRef = useRef(0);
  const frameCounterRef = useRef(0);
  const isUserControllingRef = useRef(false);

  // Track when the user is actively rotating/zooming the camera
  useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    const handleStart = () => {
      isUserControllingRef.current = true;
    };
    const handleEnd = () => {
      isUserControllingRef.current = false;
    };

    controls.addEventListener('start', handleStart);
    controls.addEventListener('end', handleEnd);

    return () => {
      controls.removeEventListener('start', handleStart);
      controls.removeEventListener('end', handleEnd);
    };
  }, [controlsRef]);

  useFrame(({ camera }) => {
    if (onGetCameraAngle) {
      onGetCameraAngle(camera.position);
    }
 
    if (!modelGroupRef.current || !controlsRef.current || editMode || isUserControllingRef.current || isDraggingLeanTo) {
      return;
    }
 
    // Compute center from actual geometry bounds (for orbit target)
    const center = tempCenter.current;
    tempBox.current.setFromObject(modelGroupRef.current);
    tempBox.current.getCenter(center);

    // Use logical expected dimensions (building + lean-tos) for zoom logic
    const logicalWidth = expectedDimensions.width;
    const logicalHeight = expectedDimensions.height;
    const logicalDepth = expectedDimensions.length;

    // Skip if logical size not ready yet
    if (logicalWidth === 0 || logicalHeight === 0 || logicalDepth === 0) return;

    const prev = lastSizeRef.current;
    const isFirstMeasurement = prev.width === 0 && prev.height === 0 && prev.depth === 0;

    // Store initial size without moving camera
    if (isFirstMeasurement) {
      lastSizeRef.current = { width: logicalWidth, height: logicalHeight, depth: logicalDepth };
      return;
    }

    // Only react to *increases* in logical size to avoid zooming when toggling types/walls
    const widthIncrease = logicalWidth - prev.width;
    const heightIncrease = logicalHeight - prev.height;
    const depthIncrease = logicalDepth - prev.depth;

    // Require at least 1ft growth in any axis before zooming out
    const significantIncrease = widthIncrease > 1 || heightIncrease > 1 || depthIncrease > 1;
    if (!significantIncrease) return;

    const controls = controlsRef.current;

    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = (camera.fov * Math.PI) / 180;
      const halfFovTan = Math.tan(fov / 2);

      // Use logical 3D diagonal for zoom distance so only real size changes matter
      const diagonal3D = Math.sqrt(
        logicalWidth * logicalWidth +
        logicalHeight * logicalHeight +
        logicalDepth * logicalDepth
      );
      const maxSize = diagonal3D * 22.0; // padding so extreme gable lean-tos fully fit
      const fitHeightDistance = maxSize / (2 * halfFovTan);
      const fitWidthDistance = fitHeightDistance / camera.aspect;
      const requiredDistance = Math.max(fitHeightDistance, fitWidthDistance) * 1.08; // small extra buffer

      // Smoothly recenter the orbit target on the logical center
      controls.target.lerp(center, 0.25);

      tempDirection.current.subVectors(camera.position, controls.target).normalize();

      const currentDistance = camera.position.distanceTo(controls.target);
      const targetDistance = requiredDistance;

      // Adaptive smooth step: faster for large changes, slower for small changes
      const distanceDiff = Math.abs(targetDistance - currentDistance);
      const adaptiveRate = distanceDiff > 30 ? 0.015 : 0.006;
      const maxStep = targetDistance * adaptiveRate;
      const distanceStep = targetDistance - currentDistance;
      const clampedStep = THREE.MathUtils.clamp(distanceStep, -maxStep, maxStep);
      const newDistance = currentDistance + clampedStep;

      camera.position
        .copy(controls.target)
        .add(tempDirection.current.multiplyScalar(newDistance));
      camera.updateProjectionMatrix();

      // Remember new logical size
      lastSizeRef.current = {
        width: logicalWidth,
        height: logicalHeight,
        depth: logicalDepth,
      };
    }
  });
  
  return null;
};

interface Scene3DProps {
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
  onWindowMove: (windowId: string, newPosition: number) => void;
  onGetCameraAngle?: (angle: { x: number; y: number; z: number }) => void;
  draggedDoorId: string | null;
  onDraggedDoorIdChange: (id: string | null) => void;
  draggedWindowId: string | null;
  onDraggedWindowIdChange: (id: string | null) => void;
  editMode: boolean;
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
  }>;
  leanToEditMode: boolean;
  leanToDragPositions: Map<string, number>;
  isDraggingLeanTo: boolean;
  onLeanToMove: (leanToId: string, newPosition: number, isDragging: boolean) => void;
  highlightedWall: {
    wall: 'front' | 'back' | 'left' | 'right';
    leanToId?: string;
    leanToWall?: 'front' | 'back' | 'left' | 'right';
  } | null;
  onWallClick?: (wall: 'front' | 'back' | 'left' | 'right', leanToId?: string, leanToWall?: 'front' | 'back' | 'left' | 'right') => void;
}

export const Scene3D = ({ width, length, height, wallColor, roofColor, trimColor, roofStyle, roofPitch, doors, windows, onDoorClick, onWindowClick, onDoorMove, onWindowMove, onGetCameraAngle, draggedDoorId, onDraggedDoorIdChange, draggedWindowId, onDraggedWindowIdChange, editMode, wallEnclosure, customWalls, leanTos, leanToEditMode, leanToDragPositions, isDraggingLeanTo, onLeanToMove, highlightedWall, onWallClick }: Scene3DProps) => {
  const roofRise = roofStyle === 'gable' ? (width / 2) * (roofPitch / 12) : width * (roofPitch / 12);
  const totalY = height + roofRise;
  const controlsRef = useRef<any>(null);
  const modelGroupRef = useRef<THREE.Group>(null!);
  const lockedDirectionRef = useRef<THREE.Vector3 | null>(null);
  const lockedTargetRef = useRef<THREE.Vector3 | null>(null);
  const isInitializedRef = useRef(false);
  
  

  // Scale camera and controls based on actual model size including lean-tos
  const actualWidth = width + (leanTos.reduce((max, lt) => {
    if (lt.wall === 'left' || lt.wall === 'right') {
      const effectiveWidth = lt.type === 'gable' ? lt.length : lt.width;
      return Math.max(max, effectiveWidth);
    }
    return max;
  }, 0) || 0);
  const actualLength = length + (leanTos.reduce((max, lt) => {
    if (lt.wall === 'front' || lt.wall === 'back') {
      const effectiveWidth = lt.type === 'gable' ? lt.length : lt.width;
      return Math.max(max, effectiveWidth);
    }
    return max;
  }, 0) || 0);
  const diag = Math.sqrt(actualWidth * actualWidth + actualLength * actualLength + totalY * totalY);
  const camDist = Math.max(120, diag * 1.15);
  const camFar = Math.max(1500, diag * 9); // slightly tighter for faster-feeling controls
  const maxOrbit = Math.max(800, diag * 6.5); // keeps movement responsive while still supporting large buildings

  // Initial camera setup ONLY - never touch camera after first setup
  useEffect(() => {
    if (!controlsRef.current || !modelGroupRef.current || isInitializedRef.current) return;
 
    const controls = controlsRef.current as any;
    const camera = controls.object as THREE.PerspectiveCamera;
 
    modelGroupRef.current.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(modelGroupRef.current);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    // Lock target and direction forever
    controls.target.copy(center);
    lockedTargetRef.current = center.clone();
    
    // Camera direction - positioned for bird's-eye view similar to IdeaRoom (30-35° from horizontal)
    const dir = new THREE.Vector3(1.2, 1.2, -1.4).normalize();
    lockedDirectionRef.current = dir.clone();
    
    // Start more zoomed out so the whole building is visible, but keep things snappy
    const maxSize = Math.max(size.x, size.y, size.z);
    const fov = (camera.fov * Math.PI) / 180;
    const fitHeightDistance = maxSize / (2 * Math.tan(fov / 2));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = 3.8 * Math.max(fitHeightDistance, fitWidthDistance);
    
    camera.position.copy(center).add(dir.multiplyScalar(distance));
    
    camera.near = 0.1;
    camera.far = 10000;
    camera.updateProjectionMatrix();
    
    controls.maxDistance = 5000;
    controls.minDistance = 5;
    controls.update();
    
    // Mark as initialized immediately for faster initial render
    isInitializedRef.current = true;
  }, []); // Only run once on mount




  return (
    <div className="w-full h-full overflow-hidden rounded-lg border flex items-center justify-center" style={{ borderColor: 'hsl(var(--border))' }}>
      <Canvas className="w-full h-full" gl={{ logarithmicDepthBuffer: true }} dpr={[1, 2]}>
        <CameraTracker 
          onGetCameraAngle={onGetCameraAngle} 
          modelGroupRef={modelGroupRef}
          controlsRef={controlsRef}
          expectedDimensions={{ 
            width: width +
              (leanTos.reduce((max, lt) => {
                if (lt.wall === 'left' || lt.wall === 'right') {
                  const effectiveWidth = lt.type === 'gable' ? lt.length : lt.width; // match BuildingModel footprint logic
                  return Math.max(max, effectiveWidth);
                }
                return max;
              }, 0) || 0),
            length: length +
              (leanTos.reduce((max, lt) => {
                if (lt.wall === 'front' || lt.wall === 'back') {
                  const effectiveWidth = lt.type === 'gable' ? lt.length : lt.width; // perpendicular stick-out along Z
                  return Math.max(max, effectiveWidth);
                }
                return max;
              }, 0) || 0),
            height: totalY,
          }}
          editMode={editMode || leanToEditMode}
          isDraggingLeanTo={isDraggingLeanTo}
        />
        <PerspectiveCamera makeDefault position={[camDist, camDist * 0.2, camDist]} near={0.5} far={camFar} />
        <OrbitControls 
          ref={controlsRef}
          enablePan={false}
          enableZoom={true}
          enableRotate={!isDraggingLeanTo}
          enableDamping
          dampingFactor={0.03}
          minDistance={5}
          maxDistance={maxOrbit}
        />
        
        
        <ambientLight intensity={1.2} />
        <directionalLight position={[15, 8, 12]} intensity={1.2} color="white" />
        <directionalLight position={[-15, 8, -12]} intensity={0.8} color="#ffcc99" />
        <directionalLight position={[0, 5, 20]} intensity={0.8} color="white" />
        <directionalLight position={[-10, 3, 0]} intensity={0.5} color="#ccddff" />
        
        <group ref={modelGroupRef} scale={1.25} position={[1, -2, 0]}>
          {/* Ground plane - scales with building + lean-tos */}
          
          <BuildingModel 
            width={width}
            length={length}
            height={height}
            wallColor={wallColor}
            roofColor={roofColor}
            trimColor={trimColor}
            roofStyle={roofStyle}
            roofPitch={roofPitch}
            doors={doors}
            windows={windows}
            onDoorClick={onDoorClick}
            onWindowClick={onWindowClick}
            onDoorMove={onDoorMove}
            onWindowMove={onWindowMove}
            controlsRef={controlsRef}
            draggedDoorId={draggedDoorId}
            onDraggedDoorIdChange={onDraggedDoorIdChange}
            draggedWindowId={draggedWindowId}
            onDraggedWindowIdChange={onDraggedWindowIdChange}
            wallEnclosure={wallEnclosure}
            customWalls={customWalls}
            leanTos={leanTos}
            leanToEditMode={leanToEditMode}
            leanToDragPositions={leanToDragPositions}
            onLeanToMove={onLeanToMove}
            highlightedWall={highlightedWall}
            onWallClick={onWallClick}
          />
        </group>
        

        <Environment preset="studio" />
      </Canvas>
    </div>
  );
};
