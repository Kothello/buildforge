import { useState, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Scene3D } from '@/components/Scene3D';
import { ConfigPanel } from '@/components/ConfigPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';

export interface Door {
  id: string;
  type: 'rollup' | 'personnel';
  wall: 'front' | 'back' | 'left' | 'right';
  position: number; // position along the wall (0-1)
  width: number; // in feet
  height: number; // in feet
  leanToId?: string; // ID of lean-to if door is on a lean-to
  leanToWall?: 'front' | 'back' | 'left' | 'right'; // Which wall of the lean-to
}

export interface Window {
  id: string;
  wall: 'front' | 'back' | 'left' | 'right';
  position: number;
  width: number;
  height: number;
  leanToId?: string; // ID of lean-to if window is on a lean-to
  leanToWall?: 'front' | 'back' | 'left' | 'right'; // Which wall of the lean-to
}

const ROLLUP_SIZES = [
  { width: 10, height: 8 },
  { width: 10, height: 10 },
  { width: 12, height: 12 },
  { width: 12, height: 14 },
  { width: 14, height: 14 },
];

// Trim + spacing rules (in feet)
const TRIM_OUTSET_FT = 0.15; // trim extends 0.15' beyond opening on each side
const MIN_GAP_FT = 1.0;      // at least 1' between outer trim edges and corners/other openings
const EPS = 1e-4;            // small numeric buffer


const Index = () => {
  const [width, setWidth] = useState(40);
  const [length, setLength] = useState(60);
  const [height, setHeight] = useState(12);
  const [wallColor, setWallColor] = useState('#6B7280');
  const [roofColor, setRoofColor] = useState('#FFFFFF');
  const [trimColor, setTrimColor] = useState('#FFFFFF');
  const [roofStyle, setRoofStyle] = useState<'gable' | 'single-slope'>('gable');
  const [roofPitch, setRoofPitch] = useState(2);
  const [doors, setDoors] = useState<Door[]>([]);
  const [windows, setWindows] = useState<Window[]>([]);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [showWindowDialog, setShowWindowDialog] = useState(false);
  const [selectedDoorId, setSelectedDoorId] = useState<string | null>(null);
  const [showDoorSizeDialog, setShowDoorSizeDialog] = useState(false);
  const [draggedDoorId, setDraggedDoorId] = useState<string | null>(null);
  const [draggedWindowId, setDraggedWindowId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [cameraAngle, setCameraAngle] = useState<{ x: number; y: number; z: number } | null>(null);
  const [highlightedWall, setHighlightedWall] = useState<{ 
    wall: 'front' | 'back' | 'left' | 'right'; 
    leanToId?: string; 
    leanToWall?: 'front' | 'back' | 'left' | 'right' 
  } | null>(null);
  const [lockedHighlightedWall, setLockedHighlightedWall] = useState<{ 
    wall: 'front' | 'back' | 'left' | 'right'; 
    leanToId?: string; 
    leanToWall?: 'front' | 'back' | 'left' | 'right' 
  } | null>(null);
  
  // Wall enclosure options
  const [wallEnclosure, setWallEnclosure] = useState<'fully-enclosed' | 'fully-open' | 'gable-ends' | 'customize'>('fully-enclosed');
  const [customWalls, setCustomWalls] = useState({ front: true, back: true, left: true, right: true });
  
  // Lean-to options - now an array supporting multiple lean-tos
  const [leanTos, setLeanTos] = useState<Array<{
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
    wraparoundCorner?: 'left' | 'right' | 'both'; // Which corner to wrap around
    parentId?: string; // Parent lean-to ID for wraparound side lean-tos
  }>>([]);
  
  const [editingLeanToId, setEditingLeanToId] = useState<string | null>(null);
  const [leanToDragPositions, setLeanToDragPositions] = useState<Map<string, number>>(new Map());
  const [isDraggingLeanTo, setIsDraggingLeanTo] = useState(false);
  
  const { toast } = useToast();
 
  // Trailing resolve timers to guarantee post-drag separation
  const doorResolveTimers = useRef<Map<string, number>>(new Map());
  const windowResolveTimers = useRef<Map<string, number>>(new Map());
 
  // Safety: if lean-to edit mode is turned off, ensure drag state is cleared
  useEffect(() => {
    if (!editingLeanToId && isDraggingLeanTo) {
      setIsDraggingLeanTo(false);
    }
  }, [editingLeanToId, isDraggingLeanTo]);

  // Global safety: if pointer is released anywhere, ensure lean-to dragging stops
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDraggingLeanTo) {
        setIsDraggingLeanTo(false);
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [isDraggingLeanTo]);

  // Determine which main building walls are actually visible based on wallEnclosure
  const getMainWallVisibility = () => {
    switch (wallEnclosure) {
      case 'fully-enclosed':
        return { front: true, back: true, left: true, right: true };
      case 'fully-open':
        return { front: false, back: false, left: false, right: false };
      case 'gable-ends':
        return { front: true, back: true, left: false, right: false };
      case 'customize':
        return customWalls;
      default:
        return { front: true, back: true, left: true, right: true };
    }
  };

  // Create a dependency string for lean-to wall changes
  const leanToWallsKey = JSON.stringify(leanTos.map(lt => ({ id: lt.id, walls: lt.walls })));

  // Auto-delete doors and windows when a wall is removed
  useEffect(() => {
    const mainWallVisibility = getMainWallVisibility();
    
    const newDoors = doors.filter(door => {
      // If door is on main building, check if that wall still exists
      if (!door.leanToId) {
        return mainWallVisibility[door.wall as keyof typeof mainWallVisibility];
      }
      // If door is on a lean-to, check if lean-to still has that wall
      const leanTo = leanTos.find(lt => lt.id === door.leanToId);
      if (!leanTo) return false; // Lean-to was deleted
      if (!door.leanToWall) return true;
      return leanTo.walls[door.leanToWall];
    });
    
    const newWindows = windows.filter(window => {
      // If window is on main building, check if that wall still exists
      if (!window.leanToId) {
        return mainWallVisibility[window.wall as keyof typeof mainWallVisibility];
      }
      // If window is on a lean-to, check if lean-to still has that wall
      const leanTo = leanTos.find(lt => lt.id === window.leanToId);
      if (!leanTo) return false; // Lean-to was deleted
      if (!window.leanToWall) return true;
      return leanTo.walls[window.leanToWall];
    });
    
    if (newDoors.length !== doors.length) {
      setDoors(newDoors);
    }
    if (newWindows.length !== windows.length) {
      setWindows(newWindows);
    }
  }, [wallEnclosure, customWalls, leanToWallsKey, doors, windows]);

  // Helper to detect which lean-to wall (if any) the camera is facing
  const pickLeanToWall = (cam?: { x: number; y: number; z: number }): { leanToId: string; leanToWall: 'front' | 'back' | 'left' | 'right' } | null => {
    if (!cam || leanTos.length === 0) return null;
    
    let bestMatch: { leanToId: string; leanToWall: 'front' | 'back' | 'left' | 'right'; score: number } | null = null;
    
    // Get the visible wall from camera position
    const visibleWall = pickVisibleWall(cam);
    
    // For each lean-to, check if it's close enough and if the visible wall exists on it
    for (const leanTo of leanTos) {
      const effectiveWidth = leanTo.type === 'gable' ? leanTo.length : leanTo.width;
      
      // Calculate lean-to position in 3D space
      let leanToX = 0, leanToZ = 0;
      const centerOffset = (leanTo.position - 0.5) * ((leanTo.wall === 'front' || leanTo.wall === 'back') ? width : length);
      
      if (leanTo.wall === 'right') {
        leanToX = width / 2 + effectiveWidth / 2;
        leanToZ = centerOffset;
      } else if (leanTo.wall === 'left') {
        leanToX = -width / 2 - effectiveWidth / 2;
        leanToZ = -centerOffset;
      } else if (leanTo.wall === 'back') {
        leanToX = centerOffset;
        leanToZ = -length / 2 - effectiveWidth / 2;
      } else { // front
        leanToX = centerOffset;
        leanToZ = length / 2 + effectiveWidth / 2;
      }
      
      // Calculate distance to lean-to center vs main building center
      const distToLeanTo = Math.sqrt((cam.x - leanToX) * (cam.x - leanToX) + (cam.z - leanToZ) * (cam.z - leanToZ));
      const distToMainBuilding = Math.sqrt(cam.x * cam.x + cam.z * cam.z);
      
      // Only consider lean-to walls if camera is reasonably close to lean-to
      if (distToLeanTo >= distToMainBuilding * 0.75) continue;
      
      let targetWall = visibleWall;
      
      // For gable lean-tos, map camera-facing wall to actual lean-to wall based on attachment
      // The mapping is derived from the lean-to group rotation applied in BuildingModel.tsx:
      // - RIGHT wall: rotation = 0 (local axes = world axes)
      // - LEFT wall: rotation = π (180°, local +X → world -X, local +Z → world -Z)
      // - BACK wall: rotation = π/2 (local +X → world -Z, local +Z → world +X)
      // - FRONT wall: rotation = -π/2 (local +X → world +Z, local +Z → world -X)
      if (leanTo.type === 'gable') {
        if (leanTo.wall === 'right') {
          // Rotation = 0: Local axes = World axes
          // Outer wall (local +X) at world +X, ends at world ±Z
          if (visibleWall === 'right') targetWall = 'front';      // camera at +X sees outer wall
          else if (visibleWall === 'left') targetWall = 'back';   // camera at -X sees attachment
          else if (visibleWall === 'back') targetWall = 'right';  // camera at +Z sees +Z end (local +Z = 'right')
          else if (visibleWall === 'front') targetWall = 'left';  // camera at -Z sees -Z end (local -Z = 'left')
        } else if (leanTo.wall === 'left') {
          // Rotation = π: Local +X → world -X, Local +Z → world -Z
          // Outer wall (local +X) at world -X, ends at world ±Z (inverted)
          if (visibleWall === 'left') targetWall = 'front';       // camera at -X sees outer wall
          else if (visibleWall === 'right') targetWall = 'back';  // camera at +X sees attachment
          else if (visibleWall === 'front') targetWall = 'right'; // camera at -Z sees +Z end (local +Z → world -Z)
          else if (visibleWall === 'back') targetWall = 'left';   // camera at +Z sees -Z end (local -Z → world +Z)
        } else if (leanTo.wall === 'front') {
          // Rotation = -π/2: Local +X → world +Z, Local +Z → world -X
          // Outer wall (local +X) at world +Z, ends at world ±X
          if (visibleWall === 'back') targetWall = 'front';       // camera at +Z sees outer wall
          else if (visibleWall === 'front') targetWall = 'back';  // camera at -Z sees attachment
          else if (visibleWall === 'left') targetWall = 'right';  // camera at -X sees +Z end (local +Z → world -X)
          else if (visibleWall === 'right') targetWall = 'left';  // camera at +X sees -Z end (local -Z → world +X)
        } else if (leanTo.wall === 'back') {
          // Rotation = π/2: Local +X → world -Z, Local +Z → world +X
          // Outer wall (local +X) at world -Z, ends at world ±X - identity mapping works!
          if (visibleWall === 'front') targetWall = 'front';      // camera at -Z sees outer wall
          else if (visibleWall === 'back') targetWall = 'back';   // camera at +Z sees attachment
          else if (visibleWall === 'right') targetWall = 'right'; // camera at +X sees +Z end (local +Z → world +X)
          else if (visibleWall === 'left') targetWall = 'left';   // camera at -X sees -Z end (local -Z → world -X)
        }
      }
      
      // Use the wall if it exists on this lean-to
      if (leanTo.walls[targetWall]) {
        // Calculate score based on distance (closer is better)
        const score = 1 / (distToLeanTo + 0.1);
        
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { leanToId: leanTo.id, leanToWall: targetWall, score };
        }
      }
    }
    
    return bestMatch ? { leanToId: bestMatch.leanToId, leanToWall: bestMatch.leanToWall } : null;
  };

  // Helpers
  const pickVisibleWall = (cam?: { x: number; y: number; z: number }): Door['wall'] => {
    if (!cam) return 'front';
    const ax = Math.abs(cam.x);
    const az = Math.abs(cam.z);
    if (ax > az) return cam.x > 0 ? 'right' : 'left';
    return cam.z > 0 ? 'back' : 'front';
  };

  const getAxisLength = (wall: Door['wall'], leanToId?: string, leanToWall?: 'front' | 'back' | 'left' | 'right') => {
    if (leanToId && leanToWall) {
      const leanTo = leanTos.find(lt => lt.id === leanToId);
      if (leanTo) {
        const effectiveWidth = leanTo.type === 'gable' ? leanTo.length : leanTo.width;
        const effectiveLength = leanTo.type === 'gable' ? leanTo.width : leanTo.length;
        const attachLen = (leanTo.wall === 'left' || leanTo.wall === 'right') ? length : width;
        if (leanTo.type === 'gable') {
          return (leanToWall === 'front' || leanToWall === 'back') ? effectiveLength : effectiveWidth;
        } else {
          return (leanToWall === 'front' || leanToWall === 'back') ? attachLen : effectiveWidth;
        }
      }
    }
    // Main building walls use building width/length
    return (wall === 'front' || wall === 'back' ? width : length);
  };
  const clampToBounds = (wall: Door['wall'], pos: number, doorWidthFt: number, leanToId?: string, leanToWall?: 'front' | 'back' | 'left' | 'right') => {
    const axis = getAxisLength(wall, leanToId, leanToWall);
    
    // Adjust gap based on wall type
    let effectiveGap = MIN_GAP_FT;
    
    if (leanToId && leanToWall) {
      const leanTo = leanTos.find(lt => lt.id === leanToId);
      if (leanTo) {
        // Both gable and single-slope use same reduced gap for all walls
        effectiveGap = MIN_GAP_FT * 0.3;
      }
    }
    
    const trimWidth = 0.3;
    const halfNormalizedWithTrimAndGap = ((doorWidthFt / 2) + trimWidth + effectiveGap) / axis;
    const minPos = halfNormalizedWithTrimAndGap;
    const maxPos = 1 - halfNormalizedWithTrimAndGap;
    // Add small buffer to prevent corner sticking
    const buffer = 0.001;
    return Math.min(maxPos - buffer, Math.max(minPos + buffer, pos));
  };

  const getBlockedIntervals = (
    wall: Door['wall'], 
    excludeId: string | undefined,
    doorsArr: Door[],
    windowsArr: Window[],
    leanToId?: string,
    leanToWall?: 'front' | 'back' | 'left' | 'right'
  ): Array<{min: number, max: number}> => {
    const intervals: Array<{min: number, max: number}> = [];

    let effectiveGap = MIN_GAP_FT;
    let axis: number;
    
    if (leanToId && leanToWall) {
      const leanTo = leanTos.find(lt => lt.id === leanToId);
      if (!leanTo) return intervals;
      
      const effectiveWidth = leanTo.type === 'gable' ? leanTo.length : leanTo.width;
      const effectiveLength = leanTo.type === 'gable' ? leanTo.width : leanTo.length;
      
      if (leanTo.type === 'gable') {
        axis = (leanToWall === 'front' || leanToWall === 'back') ? effectiveLength : effectiveWidth;
        effectiveGap = MIN_GAP_FT * 0.3;
      } else {
        const attachLen = (leanTo.wall === 'left' || leanTo.wall === 'right') ? length : width;
        axis = (leanToWall === 'front' || leanToWall === 'back') ? attachLen : effectiveWidth;
        effectiveGap = MIN_GAP_FT * 0.3;
      }
    } else {
      axis = (wall === 'front' || wall === 'back' ? width : length);
      effectiveGap = MIN_GAP_FT;
    }

    // Corner bands (always blocked)
    const trimWidth = 0.3;
    const cornerBandSize = (trimWidth + effectiveGap) / axis;
    intervals.push({ min: 0, max: cornerBandSize });
    intervals.push({ min: 1 - cornerBandSize, max: 1 });

    // All doors on same lean-to wall or main wall
    doorsArr.forEach(d => {
      if (d.id === excludeId) return;
      // For lean-to items, only check against items on same lean-to wall
      if (leanToId) {
        if (d.leanToId !== leanToId || d.leanToWall !== leanToWall) return;
      } else {
        // For main building, only check against main building items
        if (d.leanToId || d.wall !== wall) return;
      }
      const half = ((d.width / 2) + trimWidth + effectiveGap / 2) / axis;
      intervals.push({ min: d.position - half, max: d.position + half });
    });

    // All windows on same lean-to wall or main wall
    windowsArr.forEach(w => {
      if (w.id === excludeId) return;
      if (leanToId) {
        if (w.leanToId !== leanToId || w.leanToWall !== leanToWall) return;
      } else {
        if (w.leanToId || w.wall !== wall) return;
      }
      const half = ((w.width / 2) + trimWidth + effectiveGap / 2) / axis;
      intervals.push({ min: w.position - half, max: w.position + half });
    });

    // Merge overlapping intervals
    intervals.sort((a, b) => a.min - b.min);
    const merged: Array<{min: number, max: number}> = [];
    for (const interval of intervals) {
      if (merged.length === 0 || merged[merged.length - 1].max < interval.min - EPS) {
        merged.push({ ...interval });
      } else {
        merged[merged.length - 1].max = Math.max(merged[merged.length - 1].max, interval.max);
      }
    }

    if (leanToId && leanToWall) {
      console.log('📏 Blocked intervals for lean-to wall', {
        wall,
        leanToId,
        leanToWall,
        effectiveGap,
        axis,
        intervals: merged
      });
    }

    return merged;
  };

  const isOverlapping = (wall: Door['wall'], center: number, widthFt: number, excludeId?: string, leanToId?: string, leanToWall?: 'front' | 'back' | 'left' | 'right') => {
    const axis = getAxisLength(wall, leanToId, leanToWall);
    
    // Use effectiveGap for lean-to walls
    let effectiveGap = MIN_GAP_FT;
    if (leanToId && leanToWall) {
      const leanTo = leanTos.find(lt => lt.id === leanToId);
      if (leanTo) {
        // Both gable and single-slope use same reduced gap for all walls
        effectiveGap = MIN_GAP_FT * 0.3;
      }
    }
    
    const trimWidth = 0.3;
    const effHalf = ((widthFt / 2) + trimWidth + effectiveGap / 2) / axis;
    const a0 = center - effHalf;
    const a1 = center + effHalf;

    const blocked = getBlockedIntervals(wall, excludeId, doors, windows, leanToId, leanToWall);
    return blocked.some(b => a0 <= b.max + EPS && a1 >= b.min - EPS);
  };

  // Find nearest valid gap for an item
  const findNearestGap = (
    wall: Door['wall'], 
    currentPos: number, 
    widthFt: number, 
    excludeId: string | undefined,
    doorsArr: Door[],
    windowsArr: Window[],
    leanToId?: string,
    leanToWall?: 'front' | 'back' | 'left' | 'right'
  ): number => {
    const axis = getAxisLength(wall, leanToId, leanToWall);
    
    // Use effectiveGap for lean-to walls
    let effectiveGap = MIN_GAP_FT;
    if (leanToId && leanToWall) {
      const leanTo = leanTos.find(lt => lt.id === leanToId);
      if (leanTo) {
        // Both gable and single-slope use same reduced gap for all walls
        effectiveGap = MIN_GAP_FT * 0.3;
      }
    }
    
    const trimWidth = 0.3;
    const effHalf = ((widthFt / 2) + trimWidth + effectiveGap / 2) / axis;
    const blocked = getBlockedIntervals(wall, excludeId, doorsArr, windowsArr, leanToId, leanToWall);

    // Find gaps between blocked intervals
    const gaps: Array<{min: number, max: number, center: number}> = [];
    for (let i = 0; i < blocked.length - 1; i++) {
      const gapStart = blocked[i].max;
      const gapEnd = blocked[i + 1].min;
      const gapSize = gapEnd - gapStart;
      const needed = effHalf * 2;
      if (gapSize >= needed) {
        const center = (gapStart + gapEnd) / 2;
        gaps.push({ min: gapStart, max: gapEnd, center });
      }
    }

    // If currently in a valid gap, stay there
    const a0 = currentPos - effHalf;
    const a1 = currentPos + effHalf;
    const inValidGap = gaps.some(g => a0 >= g.min - EPS && a1 <= g.max + EPS);
    if (inValidGap) return currentPos;

    // Find nearest gap
    if (gaps.length === 0) return currentPos; // No valid gaps, stay put
    
    gaps.sort((a, b) => Math.abs(a.center - currentPos) - Math.abs(b.center - currentPos));
    const nearestGap = gaps[0];
    
    // Place in gap, preferring the side closest to current position
    const gapCenter = nearestGap.center;
    let targetPos = gapCenter;
    
    // If we're dragging from left, prefer left side of gap
    if (currentPos < gapCenter) {
      targetPos = nearestGap.min + effHalf;
    } else {
      targetPos = nearestGap.max - effHalf;
    }
    
    // Ensure it fits
    targetPos = Math.max(nearestGap.min + effHalf, Math.min(nearestGap.max - effHalf, targetPos));
    return clampToBounds(wall, targetPos, widthFt, leanToId, leanToWall);
  };

  const findSlot = (wall: Door['wall'], widthFt: number, leanToId?: string, leanToWall?: 'front' | 'back' | 'left' | 'right'): number | null => {
    // Try center and common positions first
    const candidates = [0.5, 0.25, 0.75, 0.35, 0.65, 0.15, 0.85];
    for (const c of candidates) {
      const clamped = clampToBounds(wall, c, widthFt, leanToId, leanToWall);
      if (!isOverlapping(wall, clamped, widthFt, undefined, leanToId, leanToWall)) return clamped;
    }
    // Scan from center outward in small steps
    const axis = getAxisLength(wall, leanToId, leanToWall);
    const halfNorm = ((widthFt / 2) + TRIM_OUTSET_FT + MIN_GAP_FT) / axis;
    const minPos = halfNorm + 0.001;
    const maxPos = 1 - halfNorm - 0.001;
    const step = (maxPos - minPos) / 100;
    
    for (let i = 0; i <= 100; i++) {
      const offset = i * step;
      // Try right of center
      const p1 = Math.min(maxPos, 0.5 + offset);
      if (!isOverlapping(wall, p1, widthFt, undefined, leanToId, leanToWall)) return p1;
      // Try left of center
      const p2 = Math.max(minPos, 0.5 - offset);
      if (!isOverlapping(wall, p2, widthFt, undefined, leanToId, leanToWall)) return p2;
    }
    // No space available
    return null;
  };

  // Simple wrapper using current state
  const resolveNonOverlapWindow = (wall: Window['wall'], pos: number, widthFt: number, excludeId?: string, leanToId?: string, leanToWall?: 'front' | 'back' | 'left' | 'right') => {
    return findNearestGap(wall as any, pos, widthFt, excludeId, doors, windows, leanToId, leanToWall);
  };

  const resolveNonOverlap = (wall: Door['wall'], pos: number, widthFt: number, excludeId?: string, leanToId?: string, leanToWall?: 'front' | 'back' | 'left' | 'right') => {
    return findNearestGap(wall, pos, widthFt, excludeId, doors, windows, leanToId, leanToWall);
  };

  // Deterministic resolver for windows with provided arrays
  const resolveNonOverlapWindowWith = (
    wall: Window['wall'],
    pos: number,
    widthFt: number,
    excludeId: string | undefined,
    doorsArr: Door[],
    windowsArr: Window[],
    leanToId?: string,
    leanToWall?: 'front' | 'back' | 'left' | 'right'
  ) => {
    return findNearestGap(wall as any, pos, widthFt, excludeId, doorsArr, windowsArr, leanToId, leanToWall);
  };

  // Deterministic resolver for doors with provided arrays
  const resolveNonOverlapDoorWith = (
    wall: Door['wall'],
    pos: number,
    widthFt: number,
    excludeId: string | undefined,
    doorsArr: Door[],
    windowsArr: Window[],
    leanToId?: string,
    leanToWall?: 'front' | 'back' | 'left' | 'right'
  ) => {
    return findNearestGap(wall, pos, widthFt, excludeId, doorsArr, windowsArr, leanToId, leanToWall);
  };

  // Filter available door sizes based on building height (need 2ft clearance)
  const availableDoorSizes = useMemo(() => {
    const maxDoorHeight = height - 2;
    return ROLLUP_SIZES.filter(size => size.height <= maxDoorHeight);
  }, [height]);

  const handleAddRollupDoor = (cameraAngle?: { x: number; y: number; z: number }) => {
    const targetWallState = lockedHighlightedWall ?? highlightedWall;
    // If a wall is selected/highlighted, always use that first
    if (targetWallState) {
      if (targetWallState.leanToId && targetWallState.leanToWall) {
        const leanTo = leanTos.find(lt => lt.id === targetWallState.leanToId);
        if (!leanTo) return;
        const leanToHeight = Math.min(leanTo.height, height);
        const defaultSize = availableDoorSizes.length > 0 
          ? availableDoorSizes[0]
          : { width: 10, height: Math.max(6, Math.min(10, leanToHeight - 2)) };
        const position = findSlot(targetWallState.wall, defaultSize.width, targetWallState.leanToId, targetWallState.leanToWall);
        if (position === null) {
          toast({ title: "Wall full", variant: "destructive", duration: 1500 });
          return;
        }
        const newDoor: Door = {
          id: `rollup-${Date.now()}`,
          type: 'rollup',
          wall: targetWallState.wall,
          position: position,
          width: defaultSize.width,
          height: defaultSize.height,
          leanToId: targetWallState.leanToId,
          leanToWall: targetWallState.leanToWall,
        };
        const adjusted = resolveNonOverlapDoorWith(targetWallState.wall, position, defaultSize.width, undefined, doors, windows, targetWallState.leanToId, targetWallState.leanToWall);
        setDoors([...doors, { ...newDoor, position: adjusted }]);
        return;
      } else {
        // Main building wall
        const defaultSize = availableDoorSizes[availableDoorSizes.length - 1] ?? {
          width: 10,
          height: Math.max(6, Math.min(10, height - 2)),
        };
        const position = findSlot(targetWallState.wall, defaultSize.width);
        if (position === null) {
          toast({ title: "Wall full", variant: "destructive", duration: 1500 });
          return;
        }
        const newDoor: Door = {
          id: `rollup-${Date.now()}`,
          type: 'rollup',
          wall: targetWallState.wall,
          position: position,
          width: defaultSize.width,
          height: defaultSize.height,
        };
        const adjusted = resolveNonOverlapDoorWith(targetWallState.wall, position, defaultSize.width, undefined, doors, windows);
        setDoors([...doors, { ...newDoor, position: adjusted }]);
        return;
      }
    }
    // existing non-edit-mode logic below stays the same
    
    // First check if camera is facing a lean-to wall
    const leanToTarget = pickLeanToWall(cameraAngle);
    
    // In lean-to edit mode, ONLY allow adding to lean-tos
    if (editingLeanToId !== null && !leanToTarget) {
      toast({
        title: "Lean-To Edit Mode Active",
        description: "Rotate camera to face a lean-to wall to add doors/windows.",
        variant: "destructive"
      });
      return;
    }
    
    // If not in edit mode but facing main building, proceed normally
    if (editingLeanToId === null && !leanToTarget) {
      const wall = pickVisibleWall(cameraAngle);
      const defaultSize = availableDoorSizes[availableDoorSizes.length - 1] ?? {
        width: 10,
        height: Math.max(6, Math.min(10, height - 2)),
      };
      const position = findSlot(wall, defaultSize.width);
      if (position === null) {
        toast({ title: "Wall full", variant: "destructive", duration: 1500 });
        return;
      }
      const newDoor: Door = {
        id: `rollup-${Date.now()}`,
        type: 'rollup',
        wall,
        position: position,
        width: defaultSize.width,
        height: defaultSize.height,
      };
      const adjusted = resolveNonOverlapDoorWith(wall, position, defaultSize.width, undefined, doors, windows);
      setDoors([...doors, { ...newDoor, position: adjusted }]);
      return;
    }
    
    // Not in edit mode but facing a lean-to - add to lean-to
    if (leanToTarget) {
      const leanTo = leanTos.find(lt => lt.id === leanToTarget.leanToId);
      if (!leanTo) return;
      const leanToHeight = Math.min(leanTo.height, height);
      const defaultSize = availableDoorSizes.length > 0 
        ? availableDoorSizes[0]
        : { width: 10, height: Math.max(6, Math.min(10, leanToHeight - 2)) };
      const position = findSlot(leanTo.wall, defaultSize.width, leanTo.id, leanToTarget.leanToWall);
      if (position === null) {
        toast({ title: "Wall full", variant: "destructive", duration: 1500 });
        return;
      }
      const newDoor: Door = {
        id: `rollup-${Date.now()}`,
        type: 'rollup',
        wall: leanTo.wall,
        position: position,
        width: defaultSize.width,
        height: defaultSize.height,
        leanToId: leanTo.id,
        leanToWall: leanToTarget.leanToWall,
      };
      const adjusted = resolveNonOverlapDoorWith(leanTo.wall, position, defaultSize.width, undefined, doors, windows, leanTo.id, leanToTarget.leanToWall);
      setDoors([...doors, { ...newDoor, position: adjusted }]);
      return;
    }
    
    const wall = pickVisibleWall(cameraAngle);
    const defaultSize = availableDoorSizes[availableDoorSizes.length - 1] ?? {
      width: 10,
      height: Math.max(6, Math.min(10, height - 2)),
    };
    const position = findSlot(wall, defaultSize.width);
    if (position === null) {
      toast({ title: "Wall full", variant: "destructive", duration: 1500 });
      return;
    }
    const newDoor: Door = {
      id: `rollup-${Date.now()}`,
      type: 'rollup',
      wall,
      position: position,
      width: defaultSize.width,
      height: defaultSize.height,
    };
    const adjusted = resolveNonOverlap(wall, position, defaultSize.width);
    setDoors([...doors, { ...newDoor, position: adjusted }]);
  };

  const handleAddPersonnelDoor = (cameraAngle?: { x: number; y: number; z: number }) => {
    const targetWallState = lockedHighlightedWall ?? highlightedWall;

    // In door edit mode with a selected wall, use that
    if (editMode && targetWallState) {
      if (targetWallState.leanToId && targetWallState.leanToWall) {
        const leanTo = leanTos.find(lt => lt.id === targetWallState.leanToId);
        if (!leanTo) return;
        
        const position = findSlot(targetWallState.wall, 3, targetWallState.leanToId, targetWallState.leanToWall);
        console.log('🚪 Adding personnel door to lean-to:', {
          wall: targetWallState.wall,
          leanToId: targetWallState.leanToId,
          leanToWall: targetWallState.leanToWall,
          foundPosition: position,
          existingDoors: doors.filter(d => d.leanToId === targetWallState.leanToId && d.leanToWall === targetWallState.leanToWall).map(d => ({ id: d.id, pos: d.position, leanToWall: d.leanToWall })),
          existingWindows: windows.filter(w => w.leanToId === targetWallState.leanToId && w.leanToWall === targetWallState.leanToWall).map(w => ({ id: w.id, pos: w.position, leanToWall: w.leanToWall }))
        });
        if (position === null) {
          toast({
            title: "Wall full",
            variant: "destructive",
            duration: 1500
          });
          return;
        }

        const newDoor: Door = {
          id: `personnel-${Date.now()}`,
          type: 'personnel',
          wall: targetWallState.wall,
          position: position,
          width: 3,
          height: 7,
          leanToId: targetWallState.leanToId,
          leanToWall: targetWallState.leanToWall,
        };
        console.log('✅ Created door:', newDoor);
        const adjusted = resolveNonOverlapDoorWith(targetWallState.wall, position, 3, undefined, doors, windows, targetWallState.leanToId, targetWallState.leanToWall);
        console.log('🔧 Adjusted position:', adjusted);
        setDoors([...doors, { ...newDoor, position: adjusted }]);
        return;
      } else {
        // Main building wall
        const position = findSlot(targetWallState.wall, 3);
        if (position === null) {
          toast({
            title: "Wall full",
            variant: "destructive",
            duration: 1500
          });
          return;
        }

        const newDoor: Door = {
          id: `personnel-${Date.now()}`,
          type: 'personnel',
          wall: targetWallState.wall,
          position: position,
          width: 3,
          height: 7,
        };
        const adjusted = resolveNonOverlapDoorWith(targetWallState.wall, position, 3, undefined, doors, windows);
        setDoors([...doors, { ...newDoor, position: adjusted }]);
        return;
      }
    }
    
    // First check if camera is facing a lean-to wall
    const leanToTarget = pickLeanToWall(cameraAngle);
    
    // In lean-to edit mode, ONLY allow adding to lean-tos
    if (editingLeanToId !== null && !leanToTarget) {
      toast({
        title: "Lean-To Edit Mode Active",
        description: "Rotate camera to face a lean-to wall to add doors/windows.",
        variant: "destructive"
      });
      return;
    }
    
    // If not in edit mode but facing main building, proceed normally
    if (editingLeanToId === null && !leanToTarget) {
      const wall = pickVisibleWall(cameraAngle);
      const position = findSlot(wall, 3);
      if (position === null) {
        toast({
          title: "Wall full",
          variant: "destructive",
          duration: 1500
        });
        return;
      }

      const newDoor: Door = {
        id: `personnel-${Date.now()}`,
        type: 'personnel',
        wall,
        position: position,
        width: 3,
        height: 7,
      };
      const adjusted = resolveNonOverlapDoorWith(wall, position, 3, undefined, doors, windows);
      setDoors([...doors, { ...newDoor, position: adjusted }]);
      return;
    }
    
    // Not in edit mode but facing a lean-to - add to lean-to
    if (leanToTarget) {
      const leanTo = leanTos.find(lt => lt.id === leanToTarget.leanToId);
      if (!leanTo) return;
      
      const position = findSlot(leanTo.wall, 3, leanTo.id, leanToTarget.leanToWall);
      if (position === null) {
        toast({
          title: "Wall full",
          variant: "destructive",
          duration: 1500
        });
        return;
      }
      
      const newDoor: Door = {
        id: `personnel-${Date.now()}`,
        type: 'personnel',
        wall: leanTo.wall,
        position: position,
        width: 3,
        height: 7,
        leanToId: leanTo.id,
        leanToWall: leanToTarget.leanToWall,
      };
      
      const adjusted = resolveNonOverlapDoorWith(leanTo.wall, position, 3, undefined, doors, windows, leanTo.id, leanToTarget.leanToWall);
      setDoors([...doors, { ...newDoor, position: adjusted }]);
      return;
    }
    
    const wall = pickVisibleWall(cameraAngle);

    const widthFt = 3;
    const position = findSlot(wall, widthFt);
    if (position === null) {
      toast({
        title: "Wall full",
        variant: "destructive",
        duration: 1500
      });
      return;
    }

    const newDoor: Door = {
      id: `personnel-${Date.now()}`,
      type: 'personnel',
      wall,
      position: position,
      width: widthFt,
      height: 7,
    };
    const adjusted = resolveNonOverlap(wall, position, widthFt);
    setDoors([...doors, { ...newDoor, position: adjusted }]);
  };

  const handleAddWindow = (cameraAngle?: { x: number; y: number; z: number }) => {
    const targetWallState = lockedHighlightedWall ?? highlightedWall;
    
    // In door edit mode with a selected wall, use that
    if (editMode && targetWallState) {
      if (targetWallState.leanToId && targetWallState.leanToWall) {
        const leanTo = leanTos.find(lt => lt.id === targetWallState.leanToId);
        if (!leanTo) return;
        
        const position = findSlot(targetWallState.wall, 3, targetWallState.leanToId, targetWallState.leanToWall);
        if (position === null) {
          toast({
            title: "Wall full",
            variant: "destructive",
            duration: 1500
          });
          return;
        }

        const newWindow: Window = {
          id: `window-${Date.now()}`,
          wall: targetWallState.wall,
          position: position,
          width: 3,
          height: 3,
          leanToId: targetWallState.leanToId,
          leanToWall: targetWallState.leanToWall,
        };
        
        const adjusted = resolveNonOverlapWindowWith(targetWallState.wall, position, 3, undefined, doors, windows, targetWallState.leanToId, targetWallState.leanToWall);
        setWindows([...windows, { ...newWindow, position: adjusted }]);
        return;
      } else {
        // Main building wall
        const position = findSlot(targetWallState.wall, 3);
        if (position === null) {
          toast({
            title: "Wall full",
            variant: "destructive",
            duration: 1500
          });
          return;
        }

        const newWindow: Window = {
          id: `window-${Date.now()}`,
          wall: targetWallState.wall,
          position: position,
          width: 3,
          height: 3,
        };
        const adjusted = resolveNonOverlapWindow(targetWallState.wall, position, 3);
        setWindows([...windows, { ...newWindow, position: adjusted }]);
        return;
      }
    }
    
    // First check if camera is facing a lean-to wall
    const leanToTarget = pickLeanToWall(cameraAngle);
    
    // In lean-to edit mode, ONLY allow adding to lean-tos
    if (editingLeanToId !== null && !leanToTarget) {
      toast({
        title: "Lean-To Edit Mode Active",
        description: "Rotate camera to face a lean-to wall to add doors/windows.",
        variant: "destructive"
      });
      return;
    }
    
    // If not in edit mode but facing main building, proceed normally
    if (editingLeanToId === null && !leanToTarget) {
      const wall = pickVisibleWall(cameraAngle);
      const position = findSlot(wall, 3);
      if (position === null) {
        toast({
          title: "Wall full",
          variant: "destructive",
          duration: 1500
        });
        return;
      }

      const newWindow: Window = {
        id: `window-${Date.now()}`,
        wall,
        position: position,
        width: 3,
        height: 3,
      };
      const adjusted = resolveNonOverlapWindow(wall, position, 3);
      setWindows([...windows, { ...newWindow, position: adjusted }]);
      return;
    }
    
    // Not in edit mode but facing a lean-to - add to lean-to
    if (leanToTarget) {
      const leanTo = leanTos.find(lt => lt.id === leanToTarget.leanToId);
      if (!leanTo) return;
      
      const position = findSlot(leanTo.wall, 3, leanTo.id, leanToTarget.leanToWall);
      if (position === null) {
        toast({
          title: "Wall full",
          variant: "destructive",
          duration: 1500
        });
        return;
      }
      
      const newWindow: Window = {
        id: `window-${Date.now()}`,
        wall: leanTo.wall,
        position: position,
        width: 3,
        height: 3,
        leanToId: leanTo.id,
        leanToWall: leanToTarget.leanToWall,
      };
      
      const adjusted = resolveNonOverlapWindowWith(leanTo.wall, position, 3, undefined, doors, windows, leanTo.id, leanToTarget.leanToWall);
      setWindows([...windows, { ...newWindow, position: adjusted }]);
      return;
    }
  };

  const handleDoorClick = (doorId: string) => {
    // Close window dialog if open
    setShowWindowDialog(false);
    setSelectedWindowId(null);
    
    // If clicking same door, close the dialog; otherwise open with new door
    if (selectedDoorId === doorId && showDoorSizeDialog) {
      setShowDoorSizeDialog(false);
      setSelectedDoorId(null);
    } else {
      setSelectedDoorId(doorId);
      setShowDoorSizeDialog(true);
    }
  };

  const handleWindowClick = (windowId: string) => {
    // Close door dialog if open
    setShowDoorSizeDialog(false);
    setSelectedDoorId(null);
    
    // If clicking same window, close the dialog; otherwise open with new window
    if (selectedWindowId === windowId && showWindowDialog) {
      setShowWindowDialog(false);
      setSelectedWindowId(null);
    } else {
      setSelectedWindowId(windowId);
      setShowWindowDialog(true);
    }
  };

  const handleDeleteWindow = (windowId: string) => {
    setWindows(windows.filter(w => w.id !== windowId));
    setShowWindowDialog(false);
    setSelectedWindowId(null);
  };

  const handleDeleteDoor = (doorId: string) => {
    setDoors(doors.filter(d => d.id !== doorId));
    setShowDoorSizeDialog(false);
    setSelectedDoorId(null);
  };

  const handleDoorSizeChange = (width: number, height: number) => {
    if (!selectedDoorId) return;
    setDoors(doors.map(door => 
      door.id === selectedDoorId 
        ? { ...door, width, height }
        : door
    ));
    setShowDoorSizeDialog(false);
    setSelectedDoorId(null);
  };

  // Handle lean-to changes and auto-delete doors/windows when changing to 'open'
  const handleLeanTosChange = (newLeanTos: typeof leanTos) => {
    // Find which lean-tos changed to 'open' type (excluding wraparound children)
    const openedLeanToIds = new Set<string>();
    
    for (const newLeanTo of newLeanTos) {
      const oldLeanTo = leanTos.find(lt => lt.id === newLeanTo.id);
      // Only delete doors/windows from non-wraparound lean-tos or main wraparound lean-tos (not children)
      if (oldLeanTo && oldLeanTo.type !== 'open' && newLeanTo.type === 'open' && !newLeanTo.parentId) {
        openedLeanToIds.add(newLeanTo.id);
      }
    }
    
    // If any lean-tos changed to 'open', delete their doors and windows
    if (openedLeanToIds.size > 0) {
      const newDoors = doors.filter(d => !d.leanToId || !openedLeanToIds.has(d.leanToId));
      const newWindows = windows.filter(w => !w.leanToId || !openedLeanToIds.has(w.leanToId));
      setDoors(newDoors);
      setWindows(newWindows);
    }
    
    setLeanTos(newLeanTos);
  };

  // WINDOWS: move with bounds during drag, snap away on release
  const handleWindowMove = (windowId: string, newPosition: number) => {
    const target = windows.find(w => w.id === windowId);
    if (!target) return;

    // Immediate drag update (bounds only) for buttery 1:1 feel; resolve after drag
    const clampedDuringDrag = clampToBounds(target.wall as any, newPosition, target.width, target.leanToId, target.leanToWall);
    setWindows(prev => prev.map(w => w.id === windowId ? { ...w, position: clampedDuringDrag } : w));

    // Schedule trailing resolve - longer delay so it only runs after drag stops
    const timers = windowResolveTimers.current;
    const prevTimer = timers.get(windowId);
    if (prevTimer) clearTimeout(prevTimer);
    const tid = window.setTimeout(() => {
      setWindows(prev => {
        const curr = prev.find(w => w.id === windowId);
        if (!curr) return prev;
        const clamped = clampToBounds(curr.wall as any, curr.position, curr.width, curr.leanToId, curr.leanToWall);
        const adjusted = resolveNonOverlapWindowWith(curr.wall, clamped, curr.width, windowId, doors, prev, curr.leanToId, curr.leanToWall);
        return prev.map(w => w.id === windowId ? { ...w, position: adjusted } : w);
      });
      timers.delete(windowId);
    }, 200);
    timers.set(windowId, tid as unknown as number);
  };

  const handleDoorMove = (doorId: string, newPosition: number) => {
    const target = doors.find(d => d.id === doorId);
    if (!target) return;

    const isLeanTo = !!target.leanToId && !!target.leanToWall;

    // Immediate drag update with corner repel and full non-overlap resolution
    const clampedDuringDrag = clampToBounds(target.wall, newPosition, target.width, target.leanToId, target.leanToWall);
    setDoors(prev => prev.map(d => d.id === doorId ? { ...d, position: clampedDuringDrag } : d));

    if (isLeanTo) {
      console.log('🧲 Door drag on lean-to wall', {
        doorId,
        wall: target.wall,
        leanToId: target.leanToId,
        leanToWall: target.leanToWall,
        newPosition,
        clampedDuringDrag
      });
    }

    // Schedule trailing resolve - longer delay so it only runs after drag stops
    const timers = doorResolveTimers.current;
    const prevTimer = timers.get(doorId);
    if (prevTimer) clearTimeout(prevTimer);
    const tid = window.setTimeout(() => {
      setDoors(prev => {
        const curr = prev.find(d => d.id === doorId);
        if (!curr) return prev;
        const clamped = clampToBounds(curr.wall, curr.position, curr.width, curr.leanToId, curr.leanToWall);
        const adjusted = resolveNonOverlapDoorWith(curr.wall, clamped, curr.width, doorId, prev, windows, curr.leanToId, curr.leanToWall);
        if (curr.leanToId && curr.leanToWall) {
          console.log('✅ Door resolve on lean-to wall', {
            doorId,
            wall: curr.wall,
            leanToId: curr.leanToId,
            leanToWall: curr.leanToWall,
            before: curr.position,
            clamped,
            adjusted
          });
        }
        return prev.map(d => d.id === doorId ? { ...d, position: adjusted } : d);
      });
      timers.delete(doorId);
    }, 200);
    timers.set(doorId, tid as unknown as number);
  };

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'hsl(var(--background))' }}>
      {/* Header - sticky */}
      <header className="flex-shrink-0 border-b m-0 p-0" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background))' }}>
        <div className="px-6 py-2">
          <h1 className="text-2xl font-bold m-0" style={{ color: 'hsl(var(--foreground))' }}>
            Red Iron Building Designer
          </h1>
        </div>
      </header>

      {/* Main content - responsive layout */}
      <div className="flex flex-col md:flex-row lg:flex-row flex-1 m-0 p-0 overflow-hidden">
        {/* 3D Viewer - fixed height on mobile, full size on desktop */}
        <div className="flex-shrink-0 md:flex-1 lg:flex-1 z-10 h-[27.5vh] md:h-full lg:h-full w-full md:w-[62%] lg:w-[62%] px-3 py-2 overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
          <div className="w-full h-full">
            <ErrorBoundary>
            <Scene3D
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
              onDoorClick={handleDoorClick}
              onWindowClick={handleWindowClick}
              onDoorMove={handleDoorMove}
              onWindowMove={handleWindowMove}
              draggedDoorId={draggedDoorId}
              onDraggedDoorIdChange={setDraggedDoorId}
              draggedWindowId={draggedWindowId}
              onDraggedWindowIdChange={setDraggedWindowId}
              editMode={editMode}
              wallEnclosure={wallEnclosure}
              customWalls={customWalls}
              leanTos={leanTos}
              leanToEditMode={editingLeanToId !== null}
              leanToDragPositions={leanToDragPositions}
              highlightedWall={lockedHighlightedWall || highlightedWall}
              isDraggingLeanTo={isDraggingLeanTo}
              onLeanToMove={(leanToId, newPosition, isDragging) => {
                const target = leanTos.find(lt => lt.id === leanToId);
                if (target?.wraparound || target?.parentId) {
                  return; // Prevent sliding for wraparound-connected lean-tos
                }
                if (isDragging) {
                  // During drag, just update visual position without snapping
                  setIsDraggingLeanTo(true);
                  setLeanToDragPositions(prev => new Map(prev).set(leanToId, newPosition));
                } else {
                  // On release, snap to nearest position
                  setIsDraggingLeanTo(false);
                  const snapPositions = [0, 0.25, 0.5, 0.75, 1.0];
                  const closest = snapPositions.reduce((prev, curr) => 
                    Math.abs(curr - newPosition) < Math.abs(prev - newPosition) ? curr : prev
                  );
                  setLeanTos(prev => prev.map(lt => 
                    lt.id === leanToId ? { ...lt, position: closest } : lt
                  ));
                  setLeanToDragPositions(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(leanToId);
                    return newMap;
                  });
                }
              }}
              onGetCameraAngle={(angle) => {
                // Store camera angle for adding doors/windows to visible wall
                (window as any).__cameraAngle = angle;
                setCameraAngle(angle);
                
                // Auto-highlight only when in main building edit mode and no wall is locked
                if (editMode && !lockedHighlightedWall && editingLeanToId === null) {
                  const leanToTarget = pickLeanToWall(angle);
                  if (leanToTarget) {
                    const leanTo = leanTos.find(lt => lt.id === leanToTarget.leanToId);
                    if (leanTo) {
                      setHighlightedWall({
                        wall: leanTo.wall, // Use the main building wall the lean-to is attached to
                        leanToId: leanToTarget.leanToId,
                        leanToWall: leanToTarget.leanToWall
                      });
                    }
                  } else {
                    const mainWall = pickVisibleWall(angle);
                    setHighlightedWall({ wall: mainWall });
                  }
                } else if (!editMode) {
                  setHighlightedWall(null);
                  setLockedHighlightedWall(null);
                }
              }}
              onWallClick={(wall, leanToId, leanToWall) => {
                if (!editMode) return;
                
                // Lock the selected wall for editing without moving camera
                if (leanToId && leanToWall) {
                  const leanTo = leanTos.find(lt => lt.id === leanToId);
                  if (leanTo) {
                    const newHighlight = { wall: leanTo.wall, leanToId, leanToWall };
                    setHighlightedWall(newHighlight);
                    setLockedHighlightedWall(newHighlight);
                  }
                } else {
                  const newHighlight = { wall };
                  setHighlightedWall(newHighlight);
                  setLockedHighlightedWall(newHighlight);
                }
              }}
            />
            </ErrorBoundary>
          </div>
        </div>

        {/* Configuration Panel - scrollable below on mobile, sidebar on desktop */}
        <div 
          className="w-full md:w-[38%] lg:w-[38%] h-full flex-1 overflow-hidden md:border-l lg:border-l"
          style={{ 
            background: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))'
          }}
        >
          <ConfigPanel
            width={width}
            length={length}
            height={height}
            wallColor={wallColor}
            roofColor={roofColor}
            trimColor={trimColor}
            roofStyle={roofStyle}
            roofPitch={roofPitch}
            onWidthChange={setWidth}
            onLengthChange={setLength}
            onHeightChange={setHeight}
            onWallColorChange={setWallColor}
            onRoofColorChange={setRoofColor}
            onTrimColorChange={setTrimColor}
            onRoofStyleChange={setRoofStyle}
            onRoofPitchChange={(value) => setRoofPitch(value[0])}
            onAddRollupDoor={() => handleAddRollupDoor((window as any).__cameraAngle)}
            onAddPersonnelDoor={() => handleAddPersonnelDoor((window as any).__cameraAngle)}
            onAddWindow={() => handleAddWindow((window as any).__cameraAngle)}
            editMode={editMode}
            onToggleEditMode={() => setEditMode(!editMode)}
            wallEnclosure={wallEnclosure}
            onWallEnclosureChange={setWallEnclosure}
            customWalls={customWalls}
            onCustomWallsChange={setCustomWalls}
            doors={doors}
            windows={windows}
            leanTos={leanTos}
            onLeanTosChange={handleLeanTosChange}
            editingLeanToId={editingLeanToId}
            onEditingLeanToIdChange={setEditingLeanToId}
          />
        </div>
      </div>

      {/* Door Size Dialog - bottom positioned, no overlay */}
      <Dialog open={showDoorSizeDialog} onOpenChange={setShowDoorSizeDialog} modal={false}>
        <DialogContent 
          className="sm:max-w-md fixed bottom-20 left-1/2 -translate-x-1/2 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom-8 border-border/40 backdrop-blur-xl bg-background/95 shadow-2xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-center">Door Options</DialogTitle>
          </DialogHeader>
          {(() => {
            const d = doors.find(dd => dd.id === selectedDoorId);
            if (!d) return null;
            if (d.type === 'personnel') {
              return (
                <div className="pt-2">
                  <Button
                    variant="destructive"
                    onClick={() => selectedDoorId && handleDeleteDoor(selectedDoorId)}
                    className="w-full rounded-xl h-11 font-medium"
                  >
                    Delete Door
                  </Button>
                </div>
              );
            }
            if (availableDoorSizes.length === 0) {
              return (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Building height too low. Minimum 10ft required for doors.
                </div>
              );
            }
            return (
              <div className="space-y-3 pt-2">
                <Button 
                  variant="destructive" 
                  onClick={() => selectedDoorId && handleDeleteDoor(selectedDoorId)}
                  className="w-full rounded-xl h-11 font-medium"
                >
                  Delete Door
                </Button>
                <div className="grid grid-cols-3 gap-2">
                  {availableDoorSizes.map((size) => (
                    <button
                      key={`${size.width}x${size.height}`}
                      onClick={() => handleDoorSizeChange(size.width, size.height)}
                      className="p-3 rounded-xl border-2 transition-all hover:scale-105 hover:border-accent hover:bg-accent/5"
                      style={{ borderColor: 'hsl(var(--border))' }}
                    >
                      <div className="text-base font-semibold">{size.width}' × {size.height}'</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          </DialogContent>
      </Dialog>

      {/* Window Options Dialog */}
      <Dialog open={showWindowDialog} onOpenChange={setShowWindowDialog} modal={false}>
        <DialogContent 
          className="sm:max-w-xs fixed bottom-20 left-1/2 -translate-x-1/2 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom-8 border-border/40 backdrop-blur-xl bg-background/95 shadow-2xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-center">Window Options</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <Button 
              variant="destructive" 
              onClick={() => selectedWindowId && handleDeleteWindow(selectedWindowId)}
              className="w-full rounded-xl h-11 font-medium"
            >
              Delete Window
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
