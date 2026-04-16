import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import SteelBuilding from './SteelBuilding';
import type { BuildingConfig, WallSide } from './types';

interface Scene3DProps {
  config: BuildingConfig;
  highlightedWall?: WallSide | null;
  onCameraChange?: (pos: { x: number; y: number; z: number }) => void;
  onDoorClick?: (doorId: string) => void;
  onWindowClick?: (windowId: string) => void;
  onDoorMove?: (doorId: string, newPosition: number) => void;
  onWindowMove?: (winId: string, newPosition: number) => void;
  draggedDoorId?: string | null;
  draggedWindowId?: string | null;
  onDragStart?: (type: 'door' | 'window', id: string) => void;
  onDragEnd?: () => void;
}

function GroundGrid() {
  const size = 200;
  const divisions = 40;
  return (
    <group position={[0, -0.3, 0]}>
      <gridHelper args={[size, divisions, '#374151', '#6B7280']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#4a7c59" roughness={0.9} />
      </mesh>
    </group>
  );
}

function CameraWatcher({ onCameraChange }: { onCameraChange?: (pos: { x: number; y: number; z: number }) => void }) {
  const { camera } = useThree();
  useFrame(() => {
    if (onCameraChange) {
      onCameraChange({ x: camera.position.x, y: camera.position.y, z: camera.position.z });
    }
  });
  return null;
}

function SceneContent({ config, highlightedWall, onCameraChange, onDoorClick, onWindowClick, onDoorMove, onWindowMove, draggedDoorId, draggedWindowId, onDragStart, onDragEnd }: Scene3DProps) {
  const maxDim = Math.max(config.width, config.length, config.height);
  const cameraDistance = maxDim * 1.5;

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[cameraDistance * 0.7, cameraDistance * 1.0, cameraDistance * 0.5]}
        intensity={2.0}
        castShadow
        shadow-mapSize={new THREE.Vector2(2048, 2048)}
      />
      <directionalLight
        position={[-cameraDistance * 0.4, cameraDistance * 0.6, -cameraDistance * 0.3]}
        intensity={0.8}
      />
      <hemisphereLight args={['#B0D4F1', '#4a7c59', 0.5]} />

      <CameraWatcher onCameraChange={onCameraChange} />

      <SteelBuilding
        config={config}
        highlightedWall={highlightedWall}
        onDoorClick={onDoorClick}
        onWindowClick={onWindowClick}
        onDoorMove={onDoorMove}
        onWindowMove={onWindowMove}
        draggedDoorId={draggedDoorId}
        draggedWindowId={draggedWindowId}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />

      <GroundGrid />

      <OrbitControls
        makeDefault
        minDistance={10}
        maxDistance={300}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, config.height / 3, 0]}
        enabled={!draggedDoorId && !draggedWindowId}
      />
    </>
  );
}

export default function Scene3D(props: Scene3DProps) {
  const maxDim = Math.max(props.config.width, props.config.length, props.config.height);
  const camDist = maxDim * 1.2;

  return (
    <Canvas
      shadows
      camera={{
        position: [camDist, camDist * 0.7, camDist],
        fov: 45,
        near: 0.1,
        far: 1000,
      }}
      style={{ background: 'linear-gradient(180deg, #87CEEB 0%, #E0F2FE 50%, #F0F9FF 100%)' }}
    >
      <Suspense fallback={null}>
        <SceneContent {...props} />
      </Suspense>
    </Canvas>
  );
}
