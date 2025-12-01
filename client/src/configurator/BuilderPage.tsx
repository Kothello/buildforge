import { useState, useMemo, useRef, useEffect } from 'react';
import { Scene3D } from './Scene3D';
import { ConfigPanel } from './ConfigPanel';
import { ErrorBoundary } from './ErrorBoundary';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Send } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import type { Door, Window, LeanTo, BuildingConfig } from './types';

const ROLLUP_SIZES = [
  { width: 10, height: 8 },
  { width: 10, height: 10 },
  { width: 12, height: 12 },
  { width: 12, height: 14 },
  { width: 14, height: 14 },
];

const MIN_GAP_FT = 1.0;
const EPS = 1e-4;

export interface BuildingSpecs {
  width: number;
  length: number;
  height: number;
  roofStyle: string;
  roofPitch: number;
  wallColor: string;
  roofColor: string;
  trimColor: string;
  wallEnclosure: string;
  doorsCount: number;
  windowsCount: number;
  leanTosCount: number;
}

export interface BuilderPageProps {
  initialConfig?: BuildingConfig;
  onSave?: (config: BuildingConfig, buildingSpecs: BuildingSpecs, totalPrice: string) => void;
  isSaving?: boolean;
  showEditPanel?: boolean;
  saveRef?: React.MutableRefObject<(() => void) | null>;
  onTotalChange?: (totalPrice: string) => void;
}

const BuilderPage = ({ initialConfig, onSave, isSaving, showEditPanel = true, saveRef, onTotalChange }: BuilderPageProps = {}) => {
  const [width, setWidth] = useState(initialConfig?.width ?? 40);
  const [length, setLength] = useState(initialConfig?.length ?? 60);
  const [height, setHeight] = useState(initialConfig?.height ?? 12);
  const [wallColor, setWallColor] = useState(initialConfig?.wallColor ?? '#6B7280');
  const [roofColor, setRoofColor] = useState(initialConfig?.roofColor ?? '#FFFFFF');
  const [trimColor, setTrimColor] = useState(initialConfig?.trimColor ?? '#FFFFFF');
  const [roofStyle, setRoofStyle] = useState<'gable' | 'single-slope'>(initialConfig?.roofStyle ?? 'gable');
  const [roofPitch, setRoofPitch] = useState(initialConfig?.roofPitch ?? 2);
  const [doors, setDoors] = useState<Door[]>(() => {
    if (initialConfig?.doors) {
      return initialConfig.doors.map((d: any) => ({
        id: d.id,
        type: d.type || d.doorType || 'rollup',
        wall: d.wall || 'front',
        position: d.position,
        width: d.width,
        height: d.height,
        leanToId: d.leanToId,
        leanToWall: d.leanToWall,
      }));
    }
    return [];
  });
  const [windows, setWindows] = useState<Window[]>(() => {
    if (initialConfig?.windows) {
      return initialConfig.windows.map((w: any) => ({
        id: w.id,
        wall: w.wall || 'front',
        position: w.position,
        width: w.width,
        height: w.height,
        leanToId: w.leanToId,
        leanToWall: w.leanToWall,
      }));
    }
    return [];
  });
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
  
  const [wallEnclosure, setWallEnclosure] = useState<'fully-enclosed' | 'fully-open' | 'gable-ends' | 'customize'>(initialConfig?.wallEnclosure ?? 'fully-enclosed');
  const [customWalls, setCustomWalls] = useState(initialConfig?.customWalls ?? { front: true, back: true, left: true, right: true });
  
  const [leanTos, setLeanTos] = useState<LeanTo[]>(initialConfig?.leanTos ?? []);
  
  const [editingLeanToId, setEditingLeanToId] = useState<string | null>(null);
  const [leanToDragPositions, setLeanToDragPositions] = useState<Map<string, number>>(new Map());
  const [isDraggingLeanTo, setIsDraggingLeanTo] = useState(false);
  const [currentTotalPrice, setCurrentTotalPrice] = useState<string>('0');
  
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    notes: '',
  });
  
  const { toast } = useToast();

  const getCurrentConfig = (): BuildingConfig => ({
    width,
    length,
    height,
    roofStyle,
    roofPitch,
    wallColor,
    roofColor,
    trimColor,
    doors: doors.map(d => ({ 
      id: d.id, 
      type: d.type, 
      position: d.position, 
      width: d.width, 
      height: d.height,
      wall: d.wall,
      leanToId: d.leanToId,
      leanToWall: d.leanToWall,
    })),
    windows: windows.map(w => ({ 
      id: w.id, 
      position: w.position, 
      width: w.width, 
      height: w.height,
      wall: w.wall,
      leanToId: w.leanToId,
      leanToWall: w.leanToWall,
    })),
    leanTos,
    wallEnclosure,
    customWalls,
  });

  const getCurrentBuildingSpecs = (): BuildingSpecs => ({
    width,
    length,
    height,
    roofStyle,
    roofPitch,
    wallColor,
    roofColor,
    trimColor,
    wallEnclosure,
    doorsCount: doors.length,
    windowsCount: windows.length,
    leanTosCount: leanTos.length,
  });

  const handleSave = async () => {
    if (!onSave) return;
    
    const config = getCurrentConfig();
    const buildingSpecs = getCurrentBuildingSpecs();
    
    let totalPrice = '0';
    
    try {
      const pricingResponse = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config: {
            width,
            length,
            height,
            roofStyle,
            roofPitch,
            wallColor,
            roofColor,
            trimColor,
            doors: doors.map(d => ({ id: d.id, doorType: d.type === 'personnel' ? 'walk' : d.type, position: d.position, width: d.width, height: d.height })),
            windows: windows.map(w => ({ id: w.id, position: w.position, width: w.width, height: w.height })),
            leanTos: leanTos.map(lt => ({
              id: lt.id,
              type: lt.type,
              wall: lt.wall,
              width: lt.width,
              length: lt.length,
              pitch: lt.pitch,
              height: lt.height,
            })),
          }, 
          region: 'midwest' 
        })
      });
      if (pricingResponse.ok) {
        const pricingData = await pricingResponse.json();
        if (pricingData?.total) {
          totalPrice = pricingData.total.toString();
        }
      }
    } catch (e) {
      console.error('Failed to calculate pricing:', e);
    }
    
    onTotalChange?.(totalPrice);
    onSave(config, buildingSpecs, totalPrice);
  };

  // Register save function for parent component to call
  useEffect(() => {
    if (saveRef) {
      saveRef.current = handleSave;
    }
    return () => {
      if (saveRef) {
        saveRef.current = null;
      }
    };
  });

  const handleSubmitDesign = async () => {
    if (!submitForm.name || !submitForm.company || !submitForm.email) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const config = getCurrentConfig();
      const buildingSpecs = getCurrentBuildingSpecs();
      
      let totalPrice = '0';
      try {
        const pricingResponse = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            config: {
              width,
              length,
              height,
              roofStyle,
              roofPitch,
              wallColor,
              roofColor,
              trimColor,
              doors: doors.map(d => ({ id: d.id, doorType: d.type === 'personnel' ? 'walk' : d.type, position: d.position, width: d.width, height: d.height })),
              windows: windows.map(w => ({ id: w.id, position: w.position, width: w.width, height: w.height })),
              leanTos: leanTos.map(lt => ({
                id: lt.id,
                type: lt.type,
                wall: lt.wall,
                width: lt.width,
                length: lt.length,
                pitch: lt.pitch,
                height: lt.height,
              })),
            }, 
            region: 'midwest' 
          })
        });
        if (pricingResponse.ok) {
          const pricingData = await pricingResponse.json();
          if (pricingData?.total) {
            totalPrice = pricingData.total.toString();
          }
        }
      } catch (e) {
        console.error('Failed to calculate pricing:', e);
      }

      const leadData: Record<string, any> = {
        companyName: submitForm.company,
        contactName: submitForm.name,
        email: submitForm.email,
        source: 'builder',
        temperature: 'warm',
        stage: 'new',
        status: 'new',
        totalPrice,
        buildingSpecs,
        configuration: config,
      };
      
      if (submitForm.phone) {
        leadData.phone = submitForm.phone;
      }
      if (submitForm.notes) {
        leadData.notes = submitForm.notes;
      }

      await apiRequest('POST', '/api/leads', leadData);

      toast({
        title: 'Design Submitted!',
        description: 'Your building design has been sent to our team. We\'ll be in touch soon!',
      });

      setShowSubmitDialog(false);
      setSubmitForm({ name: '', company: '', email: '', phone: '', notes: '' });
    } catch (error) {
      console.error('Failed to submit design:', error);
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your design. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const doorResolveTimers = useRef<Map<string, number>>(new Map());
  const windowResolveTimers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!editingLeanToId && isDraggingLeanTo) {
      setIsDraggingLeanTo(false);
    }
  }, [editingLeanToId, isDraggingLeanTo]);

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDraggingLeanTo) {
        setIsDraggingLeanTo(false);
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [isDraggingLeanTo]);

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

  const leanToWallsKey = JSON.stringify(leanTos.map(lt => ({ id: lt.id, walls: lt.walls })));

  useEffect(() => {
    const mainWallVisibility = getMainWallVisibility();
    
    const newDoors = doors.filter(door => {
      if (!door.leanToId) {
        return mainWallVisibility[door.wall as keyof typeof mainWallVisibility];
      }
      const leanTo = leanTos.find(lt => lt.id === door.leanToId);
      if (!leanTo) return false;
      if (!door.leanToWall) return true;
      return leanTo.walls[door.leanToWall];
    });
    
    const newWindows = windows.filter(window => {
      if (!window.leanToId) {
        return mainWallVisibility[window.wall as keyof typeof mainWallVisibility];
      }
      const leanTo = leanTos.find(lt => lt.id === window.leanToId);
      if (!leanTo) return false;
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

  const pickLeanToWall = (cam?: { x: number; y: number; z: number }): { leanToId: string; leanToWall: 'front' | 'back' | 'left' | 'right' } | null => {
    if (!cam || leanTos.length === 0) return null;
    
    let bestMatch: { leanToId: string; leanToWall: 'front' | 'back' | 'left' | 'right'; score: number } | null = null;
    
    for (const leanTo of leanTos) {
      const effectiveWidth = leanTo.type === 'gable' ? leanTo.length : leanTo.width;
      
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
      } else {
        leanToX = centerOffset;
        leanToZ = length / 2 + effectiveWidth / 2;
      }
      
      const distToLeanTo = Math.sqrt((cam.x - leanToX) * (cam.x - leanToX) + (cam.z - leanToZ) * (cam.z - leanToZ));
      const distToMainBuilding = Math.sqrt(cam.x * cam.x + cam.z * cam.z);
      
      if (distToLeanTo >= distToMainBuilding * 0.75) continue;
      
      const toCamera = { x: cam.x - leanToX, z: cam.z - leanToZ };
      const magnitude = Math.sqrt(toCamera.x * toCamera.x + toCamera.z * toCamera.z);
      if (magnitude === 0) continue;
      
      const normalized = { x: toCamera.x / magnitude, z: toCamera.z / magnitude };
      
      if (leanTo.wall === 'right' && normalized.x > 0.5) {
        const score = normalized.x;
        if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { leanToId: leanTo.id, leanToWall: 'front', score };
        }
      }
      if (leanTo.wall === 'left' && normalized.x < -0.5) {
        const score = Math.abs(normalized.x);
        if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { leanToId: leanTo.id, leanToWall: 'front', score };
        }
      }
      if (leanTo.wall === 'back' && normalized.z > 0.5) {
        const score = normalized.z;
        if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { leanToId: leanTo.id, leanToWall: 'front', score };
        }
      }
      if (leanTo.wall === 'front' && normalized.z < -0.5) {
        const score = Math.abs(normalized.z);
        if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { leanToId: leanTo.id, leanToWall: 'front', score };
        }
      }
      
      if (leanTo.type === 'gable' || leanTo.type === 'enclosed') {
        if (leanTo.wall === 'right' || leanTo.wall === 'left') {
          if (normalized.z < -0.5) {
            const score = Math.abs(normalized.z);
            if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
              bestMatch = { leanToId: leanTo.id, leanToWall: 'left', score };
            }
          }
          if (normalized.z > 0.5) {
            const score = normalized.z;
            if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
              bestMatch = { leanToId: leanTo.id, leanToWall: 'right', score };
            }
          }
          if (leanTo.type === 'gable') {
            if (leanTo.wall === 'right' && normalized.x < -0.5) {
              const score = Math.abs(normalized.x);
              if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { leanToId: leanTo.id, leanToWall: 'back', score };
              }
            }
            if (leanTo.wall === 'left' && normalized.x > 0.5) {
              const score = normalized.x;
              if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { leanToId: leanTo.id, leanToWall: 'back', score };
              }
            }
          }
        }
        if (leanTo.wall === 'front' || leanTo.wall === 'back') {
          if (normalized.x < -0.5) {
            const score = Math.abs(normalized.x);
            if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
              bestMatch = { leanToId: leanTo.id, leanToWall: 'right', score };
            }
          }
          if (normalized.x > 0.5) {
            const score = normalized.x;
            if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
              bestMatch = { leanToId: leanTo.id, leanToWall: 'left', score };
            }
          }
          if (leanTo.type === 'gable') {
            if (leanTo.wall === 'back' && normalized.z < -0.5) {
              const score = Math.abs(normalized.z);
              if (score > 0.4 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { leanToId: leanTo.id, leanToWall: 'back', score };
              }
            }
            if (leanTo.wall === 'front' && normalized.z > 0.5) {
              const score = normalized.z;
              if (score > 0.4 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { leanToId: leanTo.id, leanToWall: 'back', score };
              }
            }
          }
        }
      }
    }
    
    return bestMatch ? { leanToId: bestMatch.leanToId, leanToWall: bestMatch.leanToWall } : null;
  };

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
        if (leanTo.type === 'gable') {
          return (leanToWall === 'front' || leanToWall === 'back') ? effectiveWidth : effectiveLength;
        } else {
          return (leanToWall === 'front' || leanToWall === 'back') ? effectiveLength : effectiveWidth;
        }
      }
    }
    return (wall === 'front' || wall === 'back' ? width : length);
  };

  const clampToBounds = (wall: Door['wall'], pos: number, doorWidthFt: number, leanToId?: string, leanToWall?: 'front' | 'back' | 'left' | 'right') => {
    const axis = getAxisLength(wall, leanToId, leanToWall);
    
    let effectiveGap = MIN_GAP_FT;
    
    if (leanToId && leanToWall) {
      const leanTo = leanTos.find(lt => lt.id === leanToId);
      if (leanTo) {
        if (leanTo.type !== 'gable') {
          if (leanToWall === 'left' || leanToWall === 'right') {
            effectiveGap = MIN_GAP_FT * 0.3;
          } else if (leanToWall === 'front' || leanToWall === 'back') {
            effectiveGap = MIN_GAP_FT * 0.3;
          }
        } else {
          if (leanToWall === 'left' || leanToWall === 'right') {
            effectiveGap = MIN_GAP_FT * 0.65;
          } else if (leanToWall === 'back' || leanToWall === 'front') {
            effectiveGap = MIN_GAP_FT * 0.25;
          }
        }
      }
    }
    
    const trimWidth = 0.3;
    const halfNormalizedWithTrimAndGap = ((doorWidthFt / 2) + trimWidth + effectiveGap) / axis;
    const minPos = halfNormalizedWithTrimAndGap;
    const maxPos = 1 - halfNormalizedWithTrimAndGap;
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
        axis = (leanToWall === 'front' || leanToWall === 'back') ? effectiveWidth : effectiveLength;
        if (leanToWall === 'left' || leanToWall === 'right') {
          effectiveGap = MIN_GAP_FT * 0.65;
        } else {
          effectiveGap = MIN_GAP_FT * 0.25;
        }
      } else {
        const attachLen = (leanTo.wall === 'left' || leanTo.wall === 'right') ? length : width;
        axis = (leanToWall === 'front' || leanToWall === 'back') ? attachLen : effectiveWidth;
        effectiveGap = MIN_GAP_FT * 0.3;
      }
    } else {
      axis = (wall === 'front' || wall === 'back' ? width : length);
      effectiveGap = MIN_GAP_FT;
    }

    const trimWidth = 0.3;
    const cornerBandSize = (trimWidth + effectiveGap) / axis;
    intervals.push({ min: 0, max: cornerBandSize });
    intervals.push({ min: 1 - cornerBandSize, max: 1 });

    doorsArr.forEach(d => {
      if (d.id === excludeId) return;
      if (leanToId) {
        if (d.leanToId !== leanToId || d.leanToWall !== leanToWall) return;
      } else {
        if (d.leanToId || d.wall !== wall) return;
      }
      const half = ((d.width / 2) + trimWidth + effectiveGap / 2) / axis;
      intervals.push({ min: d.position - half, max: d.position + half });
    });

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

    intervals.sort((a, b) => a.min - b.min);
    const merged: Array<{min: number, max: number}> = [];
    for (const interval of intervals) {
      if (merged.length === 0 || merged[merged.length - 1].max < interval.min - EPS) {
        merged.push({ ...interval });
      } else {
        merged[merged.length - 1].max = Math.max(merged[merged.length - 1].max, interval.max);
      }
    }

    return merged;
  };

  const isOverlapping = (wall: Door['wall'], center: number, widthFt: number, excludeId?: string, leanToId?: string, leanToWall?: 'front' | 'back' | 'left' | 'right') => {
    const axis = getAxisLength(wall, leanToId, leanToWall);
    
    let effectiveGap = MIN_GAP_FT;
    if (leanToId && leanToWall) {
      const leanTo = leanTos.find(lt => lt.id === leanToId);
      if (leanTo) {
        if (leanTo.type !== 'gable') {
          if (leanToWall === 'left' || leanToWall === 'right') {
            effectiveGap = MIN_GAP_FT * 0.3;
          } else if (leanToWall === 'front' || leanToWall === 'back') {
            effectiveGap = MIN_GAP_FT * 0.3;
          }
        } else {
          if (leanToWall === 'left' || leanToWall === 'right') {
            effectiveGap = MIN_GAP_FT * 0.65;
          } else if (leanToWall === 'back' || leanToWall === 'front') {
            effectiveGap = MIN_GAP_FT * 0.25;
          }
        }
      }
    }
    
    const trimWidth = 0.3;
    const effHalf = ((widthFt / 2) + trimWidth + effectiveGap / 2) / axis;
    const a0 = center - effHalf;
    const a1 = center + effHalf;

    const blocked = getBlockedIntervals(wall, excludeId, doors, windows, leanToId, leanToWall);
    return blocked.some(b => a0 <= b.max + EPS && a1 >= b.min - EPS);
  };

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
    
    let effectiveGap = MIN_GAP_FT;
    if (leanToId && leanToWall) {
      const leanTo = leanTos.find(lt => lt.id === leanToId);
      if (leanTo) {
        if (leanTo.type !== 'gable') {
          if (leanToWall === 'left' || leanToWall === 'right') {
            effectiveGap = MIN_GAP_FT * 0.3;
          } else if (leanToWall === 'front' || leanToWall === 'back') {
            effectiveGap = MIN_GAP_FT * 0.3;
          }
        } else {
          if (leanToWall === 'left' || leanToWall === 'right') {
            effectiveGap = MIN_GAP_FT * 0.65;
          } else if (leanToWall === 'back' || leanToWall === 'front') {
            effectiveGap = MIN_GAP_FT * 0.25;
          }
        }
      }
    }
    
    const trimWidth = 0.3;
    const effHalf = ((widthFt / 2) + trimWidth + effectiveGap / 2) / axis;
    const blocked = getBlockedIntervals(wall, excludeId, doorsArr, windowsArr, leanToId, leanToWall);

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

    const a0 = currentPos - effHalf;
    const a1 = currentPos + effHalf;
    const inValidGap = gaps.some(g => a0 >= g.min - EPS && a1 <= g.max + EPS);
    if (inValidGap) return currentPos;

    if (gaps.length === 0) return currentPos;
    
    gaps.sort((a, b) => Math.abs(a.center - currentPos) - Math.abs(b.center - currentPos));
    const nearestGap = gaps[0];
    
    let targetPos = nearestGap.center;
    
    if (currentPos < nearestGap.center) {
      targetPos = nearestGap.min + effHalf;
    } else {
      targetPos = nearestGap.max - effHalf;
    }
    
    targetPos = Math.max(nearestGap.min + effHalf, Math.min(nearestGap.max - effHalf, targetPos));
    return clampToBounds(wall, targetPos, widthFt, leanToId, leanToWall);
  };

  const findSlot = (wall: Door['wall'], widthFt: number, leanToId?: string, leanToWall?: 'front' | 'back' | 'left' | 'right'): number | null => {
    const candidates = [0.5, 0.25, 0.75, 0.35, 0.65, 0.15, 0.85];
    for (const c of candidates) {
      const clamped = clampToBounds(wall, c, widthFt, leanToId, leanToWall);
      if (!isOverlapping(wall, clamped, widthFt, undefined, leanToId, leanToWall)) return clamped;
    }
    const axis = getAxisLength(wall, leanToId, leanToWall);
    const halfNorm = ((widthFt / 2) + 0.15 + MIN_GAP_FT) / axis;
    const minPos = halfNorm + 0.001;
    const maxPos = 1 - halfNorm - 0.001;
    const step = (maxPos - minPos) / 100;
    
    for (let i = 0; i <= 100; i++) {
      const offset = i * step;
      const p1 = Math.min(maxPos, 0.5 + offset);
      if (!isOverlapping(wall, p1, widthFt, undefined, leanToId, leanToWall)) return p1;
      const p2 = Math.max(minPos, 0.5 - offset);
      if (!isOverlapping(wall, p2, widthFt, undefined, leanToId, leanToWall)) return p2;
    }
    return null;
  };

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

  const availableDoorSizes = useMemo(() => {
    const maxDoorHeight = height - 2;
    return ROLLUP_SIZES.filter(size => size.height <= maxDoorHeight);
  }, [height]);

  const handleAddRollupDoor = (cameraAngle?: { x: number; y: number; z: number }) => {
    const targetWallState = lockedHighlightedWall ?? highlightedWall;
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
    
    const leanToTarget = pickLeanToWall(cameraAngle);
    
    if (editingLeanToId !== null && !leanToTarget) {
      toast({
        title: "Lean-To Edit Mode Active",
        description: "Rotate camera to face a lean-to wall to add doors/windows.",
        variant: "destructive"
      });
      return;
    }
    
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
    const adjusted = findNearestGap(wall, position, defaultSize.width, undefined, doors, windows);
    setDoors([...doors, { ...newDoor, position: adjusted }]);
  };

  const handleAddPersonnelDoor = (cameraAngle?: { x: number; y: number; z: number }) => {
    const targetWallState = lockedHighlightedWall ?? highlightedWall;

    if (editMode && targetWallState) {
      if (targetWallState.leanToId && targetWallState.leanToWall) {
        const leanTo = leanTos.find(lt => lt.id === targetWallState.leanToId);
        if (!leanTo) return;
        
        const position = findSlot(targetWallState.wall, 3, targetWallState.leanToId, targetWallState.leanToWall);
        if (position === null) {
          toast({ title: "Wall full", variant: "destructive", duration: 1500 });
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
        const adjusted = resolveNonOverlapDoorWith(targetWallState.wall, position, 3, undefined, doors, windows, targetWallState.leanToId, targetWallState.leanToWall);
        setDoors([...doors, { ...newDoor, position: adjusted }]);
        return;
      } else {
        const position = findSlot(targetWallState.wall, 3);
        if (position === null) {
          toast({ title: "Wall full", variant: "destructive", duration: 1500 });
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
    
    const leanToTarget = pickLeanToWall(cameraAngle);
    
    if (editingLeanToId !== null && !leanToTarget) {
      toast({
        title: "Lean-To Edit Mode Active",
        description: "Rotate camera to face a lean-to wall to add doors/windows.",
        variant: "destructive"
      });
      return;
    }
    
    if (editingLeanToId === null && !leanToTarget) {
      const wall = pickVisibleWall(cameraAngle);
      const position = findSlot(wall, 3);
      if (position === null) {
        toast({ title: "Wall full", variant: "destructive", duration: 1500 });
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
    
    if (leanToTarget) {
      const leanTo = leanTos.find(lt => lt.id === leanToTarget.leanToId);
      if (!leanTo) return;
      
      const position = findSlot(leanTo.wall, 3, leanTo.id, leanToTarget.leanToWall);
      if (position === null) {
        toast({ title: "Wall full", variant: "destructive", duration: 1500 });
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
      toast({ title: "Wall full", variant: "destructive", duration: 1500 });
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
    const adjusted = findNearestGap(wall, position, widthFt, undefined, doors, windows);
    setDoors([...doors, { ...newDoor, position: adjusted }]);
  };

  const handleAddWindow = (cameraAngle?: { x: number; y: number; z: number }) => {
    const targetWallState = lockedHighlightedWall ?? highlightedWall;
    
    if (editMode && targetWallState) {
      if (targetWallState.leanToId && targetWallState.leanToWall) {
        const leanTo = leanTos.find(lt => lt.id === targetWallState.leanToId);
        if (!leanTo) return;
        
        const position = findSlot(targetWallState.wall, 3, targetWallState.leanToId, targetWallState.leanToWall);
        if (position === null) {
          toast({ title: "Wall full", variant: "destructive", duration: 1500 });
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
        const position = findSlot(targetWallState.wall, 3);
        if (position === null) {
          toast({ title: "Wall full", variant: "destructive", duration: 1500 });
          return;
        }

        const newWindow: Window = {
          id: `window-${Date.now()}`,
          wall: targetWallState.wall,
          position: position,
          width: 3,
          height: 3,
        };
        const adjusted = resolveNonOverlapWindowWith(targetWallState.wall, position, 3, undefined, doors, windows);
        setWindows([...windows, { ...newWindow, position: adjusted }]);
        return;
      }
    }
    
    const leanToTarget = pickLeanToWall(cameraAngle);
    
    if (editingLeanToId !== null && !leanToTarget) {
      toast({
        title: "Lean-To Edit Mode Active",
        description: "Rotate camera to face a lean-to wall to add doors/windows.",
        variant: "destructive"
      });
      return;
    }
    
    if (editingLeanToId === null && !leanToTarget) {
      const wall = pickVisibleWall(cameraAngle);
      const position = findSlot(wall, 3);
      if (position === null) {
        toast({ title: "Wall full", variant: "destructive", duration: 1500 });
        return;
      }

      const newWindow: Window = {
        id: `window-${Date.now()}`,
        wall,
        position: position,
        width: 3,
        height: 3,
      };
      const adjusted = resolveNonOverlapWindowWith(wall, position, 3, undefined, doors, windows);
      setWindows([...windows, { ...newWindow, position: adjusted }]);
      return;
    }
    
    if (leanToTarget) {
      const leanTo = leanTos.find(lt => lt.id === leanToTarget.leanToId);
      if (!leanTo) return;
      
      const position = findSlot(leanTo.wall, 3, leanTo.id, leanToTarget.leanToWall);
      if (position === null) {
        toast({ title: "Wall full", variant: "destructive", duration: 1500 });
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
    setShowWindowDialog(false);
    setSelectedWindowId(null);
    
    if (selectedDoorId === doorId && showDoorSizeDialog) {
      setShowDoorSizeDialog(false);
      setSelectedDoorId(null);
    } else {
      setSelectedDoorId(doorId);
      setShowDoorSizeDialog(true);
    }
  };

  const handleWindowClick = (windowId: string) => {
    setShowDoorSizeDialog(false);
    setSelectedDoorId(null);
    
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

  const handleDoorSizeChange = (doorWidth: number, doorHeight: number) => {
    if (!selectedDoorId) return;
    setDoors(doors.map(door => 
      door.id === selectedDoorId 
        ? { ...door, width: doorWidth, height: doorHeight }
        : door
    ));
    setShowDoorSizeDialog(false);
    setSelectedDoorId(null);
  };

  const handleLeanTosChange = (newLeanTos: typeof leanTos) => {
    const openedLeanToIds = new Set<string>();
    
    for (const newLeanTo of newLeanTos) {
      const oldLeanTo = leanTos.find(lt => lt.id === newLeanTo.id);
      if (oldLeanTo && oldLeanTo.type !== 'open' && newLeanTo.type === 'open' && !newLeanTo.parentId) {
        openedLeanToIds.add(newLeanTo.id);
      }
    }
    
    if (openedLeanToIds.size > 0) {
      const newDoors = doors.filter(d => !d.leanToId || !openedLeanToIds.has(d.leanToId));
      const newWindows = windows.filter(w => !w.leanToId || !openedLeanToIds.has(w.leanToId));
      setDoors(newDoors);
      setWindows(newWindows);
    }
    
    setLeanTos(newLeanTos);
  };

  const handleWindowMove = (windowId: string, newPosition: number) => {
    const target = windows.find(w => w.id === windowId);
    if (!target) return;

    const clampedDuringDrag = clampToBounds(target.wall as any, newPosition, target.width, target.leanToId, target.leanToWall);
    setWindows(prev => prev.map(w => w.id === windowId ? { ...w, position: clampedDuringDrag } : w));

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

    const clampedDuringDrag = clampToBounds(target.wall, newPosition, target.width, target.leanToId, target.leanToWall);
    setDoors(prev => prev.map(d => d.id === doorId ? { ...d, position: clampedDuringDrag } : d));

    const timers = doorResolveTimers.current;
    const prevTimer = timers.get(doorId);
    if (prevTimer) clearTimeout(prevTimer);
    const tid = window.setTimeout(() => {
      setDoors(prev => {
        const curr = prev.find(d => d.id === doorId);
        if (!curr) return prev;
        const clamped = clampToBounds(curr.wall, curr.position, curr.width, curr.leanToId, curr.leanToWall);
        const adjusted = resolveNonOverlapDoorWith(curr.wall, clamped, curr.width, doorId, prev, windows, curr.leanToId, curr.leanToWall);
        return prev.map(d => d.id === doorId ? { ...d, position: adjusted } : d);
      });
      timers.delete(doorId);
    }, 200);
    timers.set(doorId, tid as unknown as number);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      <div className="flex flex-col md:flex-row lg:flex-row m-0 p-0">
        <div className={`flex-1 min-h-[600px] z-10 w-full md:w-[62%] lg:w-[62%] px-3 py-2 overflow-hidden flex items-center justify-center`} style={{ background: 'hsl(var(--background))' }}>
          <div className="w-full h-full flex items-center justify-center">
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
                  return;
                }
                if (isDragging) {
                  setIsDraggingLeanTo(true);
                  setLeanToDragPositions(prev => new Map(prev).set(leanToId, newPosition));
                } else {
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
                (window as any).__cameraAngle = angle;
                setCameraAngle(angle);
                
                if (editMode && !lockedHighlightedWall && editingLeanToId === null) {
                  const leanToTarget = pickLeanToWall(angle);
                  if (leanToTarget) {
                    const leanTo = leanTos.find(lt => lt.id === leanToTarget.leanToId);
                    if (leanTo) {
                      setHighlightedWall({
                        wall: leanTo.wall,
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

        {showEditPanel && (
        <div 
          className="w-full md:w-[38%] lg:w-[38%] mt-1 md:mt-0 lg:mt-0 flex flex-col md:border-l lg:border-l h-screen max-h-screen"
          style={{ 
            background: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))'
          }}
        >
          <div className="flex-1 overflow-y-auto px-4">
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
              onTotalChange={setCurrentTotalPrice}
            />
          </div>
          
          {onSave && (
            <div className="shrink-0 p-4 border-t bg-background" style={{ borderColor: 'hsl(var(--border))' }}>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full gap-2"
                data-testid="button-save-configuration"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
          
          {!onSave && (
            <div className="shrink-0 p-4 border-t bg-background" style={{ borderColor: 'hsl(var(--border))' }}>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                className="w-full gap-2"
                data-testid="button-submit-design"
              >
                <Send className="h-4 w-4" />
                Submit Your Design
              </Button>
            </div>
          )}
        </div>
        )}
      </div>

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
                    data-testid="button-delete-door"
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
                  data-testid="button-delete-door"
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
                      data-testid={`button-door-size-${size.width}x${size.height}`}
                    >
                      <div className="text-base font-semibold">{size.width}' x {size.height}'</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          </DialogContent>
      </Dialog>

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
              data-testid="button-delete-window"
            >
              Delete Window
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Submit Your Design</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="submit-name">Name *</Label>
              <Input
                id="submit-name"
                placeholder="Your name"
                value={submitForm.name}
                onChange={(e) => setSubmitForm(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-submit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submit-company">Company *</Label>
              <Input
                id="submit-company"
                placeholder="Company name"
                value={submitForm.company}
                onChange={(e) => setSubmitForm(prev => ({ ...prev, company: e.target.value }))}
                data-testid="input-submit-company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submit-email">Email *</Label>
              <Input
                id="submit-email"
                type="email"
                placeholder="your@email.com"
                value={submitForm.email}
                onChange={(e) => setSubmitForm(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-submit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submit-phone">Phone</Label>
              <Input
                id="submit-phone"
                type="tel"
                placeholder="(optional)"
                value={submitForm.phone}
                onChange={(e) => setSubmitForm(prev => ({ ...prev, phone: e.target.value }))}
                data-testid="input-submit-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submit-notes">Notes</Label>
              <Textarea
                id="submit-notes"
                placeholder="Any additional details (optional)"
                value={submitForm.notes}
                onChange={(e) => setSubmitForm(prev => ({ ...prev, notes: e.target.value }))}
                className="min-h-[80px]"
                data-testid="input-submit-notes"
              />
            </div>
            <Button
              onClick={handleSubmitDesign}
              disabled={isSubmitting}
              className="w-full"
              data-testid="button-confirm-submit"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Design'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuilderPage;
