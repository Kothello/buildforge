import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2 } from 'lucide-react';

interface LeanTo {
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
}

interface LeanToConfigProps {
  leanTos: LeanTo[];
  onLeanTosChange: (leanTos: LeanTo[]) => void;
  editingLeanToId: string | null;
  onEditingLeanToIdChange: (id: string | null) => void;
  buildingWidth: number;
  buildingLength: number;
  buildingHeight: number;
  roofStyle: 'gable' | 'single-slope';
  roofPitch: number;
}

export const LeanToConfig = ({
  leanTos,
  onLeanTosChange,
  editingLeanToId,
  onEditingLeanToIdChange,
  buildingWidth,
  buildingLength,
  buildingHeight,
  roofStyle,
  roofPitch,
}: LeanToConfigProps) => {
  const heightOptions = Array.from({ length: (32 - 10) + 1 }, (_, i) => 10 + i);

  const getOppositeWall = (wall: 'front' | 'back' | 'left' | 'right'): 'front' | 'back' | 'left' | 'right' => {
    const opposites = { front: 'back', back: 'front', left: 'right', right: 'left' } as const;
    return opposites[wall];
  };

  const getAvailableWalls = () => {
    const usedWalls = new Set(leanTos.map(lt => lt.wall));
    return (['front', 'back', 'left', 'right'] as const).filter(wall => !usedWalls.has(wall));
  };

  const handleAddLeanTo = () => {
    const availableWalls = getAvailableWalls();
    if (availableWalls.length === 0) return;

    let targetWall = availableWalls[0];
    if (leanTos.length > 0) {
      const oppositeWall = getOppositeWall(leanTos[0].wall);
      if (availableWalls.includes(oppositeWall)) {
        targetWall = oppositeWall;
      }
    }

    // Auto-size length to max for the target wall
    const maxLength = (targetWall === 'left' || targetWall === 'right') 
      ? buildingLength 
      : buildingWidth;

    const newLeanTo: LeanTo = {
      id: `leanto-${Date.now()}`,
      type: 'enclosed',
      wall: targetWall,
      width: 12,
      length: maxLength,
      pitch: 2,
      height: 10,
      walls: { front: true, back: true, left: true, right: true },
      isOpen: false,
      position: 0.5,
      wraparound: false,
      parentId: undefined,
    };
    onLeanTosChange([...leanTos, newLeanTo]);
  };

  const handleRemoveLeanTo = (id: string) => {
    const leanTo = leanTos.find(lt => lt.id === id);

    if (leanTo?.wraparound && !leanTo.parentId) {
      // Removing main wraparound lean-to: remove its side children too
      onLeanTosChange(
        leanTos.filter(lt => lt.id !== id && lt.parentId !== id)
      );
    } else {
      // Removing a normal or child lean-to: just remove that one
      onLeanTosChange(leanTos.filter(lt => lt.id !== id));
    }
  };

  const handleUpdateLeanTo = (id: string, updates: Partial<LeanTo>) => {
    onLeanTosChange(leanTos.map(lt => lt.id === id ? { ...lt, ...updates } : lt));
  };

  const getEdgeCoverage = (lt: LeanTo) => {
    const wallDimension = (lt.wall === 'left' || lt.wall === 'right')
      ? buildingLength
      : buildingWidth;
    const effectiveSpan = Math.min(wallDimension, lt.length);
    const halfSpanNormalized = (effectiveSpan / wallDimension) / 2;

    return {
      coversLeft: lt.position - halfSpanNormalized <= 0.01,
      coversRight: lt.position + halfSpanNormalized >= 0.99,
    };
  };

  const getAvailableWraparoundCorners = (leanTo: LeanTo): ('left' | 'right')[] => {
    if (leanTo.type === 'gable') {
      return [];
    }

    const edges = getEdgeCoverage(leanTo);
    const availableCorners: ('left' | 'right')[] = [];

    const isAtRightCorner = edges.coversRight;
    const isAtLeftCorner = edges.coversLeft;

    if (!isAtRightCorner && !isAtLeftCorner) {
      return [];
    }

    // Check if the perpendicular wall is available
    const usedWalls = new Set(leanTos.map(lt => lt.wall));
    
    // For front/back walls: corners wrap to left/right walls
    // For left/right walls: corners wrap to front/back walls
    if (leanTo.wall === 'front' || leanTo.wall === 'back') {
      if (isAtRightCorner && !usedWalls.has('right')) {
        availableCorners.push('right');
      }
      if (isAtLeftCorner && !usedWalls.has('left')) {
        availableCorners.push('left');
      }
    } else if (leanTo.wall === 'left' || leanTo.wall === 'right') {
      // Wraparound disabled for side walls - coming back to this later
      return [];
    }

    return availableCorners;
  };

  const handleToggleWraparound = (leanTo: LeanTo, enable: boolean, corner?: 'left' | 'right' | 'both') => {
    if (enable && corner) {
      // Remove any existing side lean-tos for this main lean-to, then recreate cleanly
      const baseLeanTos = leanTos.filter(lt => lt.parentId !== leanTo.id);
      const newLeanTos = [...baseLeanTos];
      const mainIndex = newLeanTos.findIndex(lt => lt.id === leanTo.id);

      if (mainIndex === -1) return;
      
      const wallDimension = (leanTo.wall === 'left' || leanTo.wall === 'right') 
        ? buildingLength 
        : buildingWidth;
      
      // Calculate position and length based on corner selection
      let position = leanTo.position;
      let length = leanTo.length;
      
      if (corner === 'both') {
        // Center and lock to full wall length
        position = 0.5;
        length = wallDimension;
      } else if (corner === 'right') {
        // Pin to right corner
        const halfSpan = (length / wallDimension) / 2;
        position = 1 - halfSpan;
      } else if (corner === 'left') {
        // Pin to left corner
        const halfSpan = (length / wallDimension) / 2;
        position = halfSpan;
      }
      
      // Update main lean-to
      newLeanTos[mainIndex] = { 
        ...leanTo, 
        wraparound: true, 
        wraparoundCorner: corner, 
        position, 
        length,
        parentId: undefined,
      };

      // Create side lean-to(s)
      const sideLeanToLength = 30;

      if (corner === 'left' || corner === 'both') {
        // Determine child wall based on parent wall
        let childWall: 'front' | 'back' | 'left' | 'right';
        let childPosition: number;
        
        if (leanTo.wall === 'front' || leanTo.wall === 'back') {
          // Front/back parent: left corner wraps to left wall
          childWall = 'left';
          childPosition = leanTo.wall === 'front' ? 0 : 1;
        } else {
          // Left/right parent: left corner wraps to front wall
          childWall = 'front';
          childPosition = leanTo.wall === 'left' ? 1 : 0;
        }
        
        const leftLeanTo: LeanTo = {
          id: `leanto-wrap-left-${Date.now()}`,
          type: leanTo.type,
          wall: childWall,
          width: leanTo.width,
          length: sideLeanToLength,
          pitch: leanTo.pitch,
          height: leanTo.height,
          walls: { front: true, back: true, left: true, right: true },
          isOpen: leanTo.isOpen,
          position: childPosition,
          wraparound: true,
          wraparoundCorner: 'left',
          parentId: leanTo.id,
        };
        newLeanTos.push(leftLeanTo);
      }

      if (corner === 'right' || corner === 'both') {
        // Determine child wall based on parent wall
        let childWall: 'front' | 'back' | 'left' | 'right';
        let childPosition: number;
        
        if (leanTo.wall === 'front' || leanTo.wall === 'back') {
          // Front/back parent: right corner wraps to right wall
          childWall = 'right';
          childPosition = leanTo.wall === 'front' ? 1 : 0;
        } else {
          // Left/right parent: right corner wraps to back wall
          childWall = 'back';
          childPosition = leanTo.wall === 'left' ? 0 : 1;
        }
        
        const rightLeanTo: LeanTo = {
          id: `leanto-wrap-right-${Date.now()}`,
          type: leanTo.type,
          wall: childWall,
          width: leanTo.width,
          length: sideLeanToLength,
          pitch: leanTo.pitch,
          height: leanTo.height,
          walls: { front: true, back: true, left: true, right: true },
          isOpen: leanTo.isOpen,
          position: childPosition,
          wraparound: true,
          wraparoundCorner: 'right',
          parentId: leanTo.id,
        };
        newLeanTos.push(rightLeanTo);
      }

      onLeanTosChange(newLeanTos);
    } else {
      // Remove wraparound and any side lean-tos belonging to this main lean-to
      onLeanTosChange(
        leanTos.map(lt => 
          lt.id === leanTo.id 
            ? { ...lt, wraparound: false, wraparoundCorner: undefined }
            : lt
        ).filter(lt => lt.parentId !== leanTo.id)
      );
    }
  };

  const handleCornerPositionChange = (leanTo: LeanTo, corner: 'left' | 'right' | 'both') => {
    const wallDimension = (leanTo.wall === 'left' || leanTo.wall === 'right') 
      ? buildingLength 
      : buildingWidth;
    
    let position = leanTo.position;
    let length = leanTo.length;
    
    if (corner === 'both') {
      // Center and lock to full wall length
      position = 0.5;
      length = wallDimension;
    } else if (corner === 'right') {
      // Pin to right corner
      const halfSpan = (length / wallDimension) / 2;
      position = 1 - halfSpan;
    } else if (corner === 'left') {
      // Pin to left corner
      const halfSpan = (length / wallDimension) / 2;
      position = halfSpan;
    }
    
    // Toggle wraparound to update corner and recreate side lean-tos
    handleToggleWraparound(leanTo, false);
    setTimeout(() => handleToggleWraparound({ ...leanTo, position, length }, true, corner), 100);
  };

  const handleUpdateWraparoundGroup = (leanTo: LeanTo, updates: Partial<LeanTo>) => {
    const mainId = leanTo.parentId || leanTo.id;

    onLeanTosChange(leanTos.map(lt => {
      if (lt.id === mainId || lt.parentId === mainId) {
        return { ...lt, ...updates };
      }
      return lt;
    }));
  };

  const getWraparoundSideLeanTo = (leanTo: LeanTo, side: 'left' | 'right') => {
    const mainId = leanTo.parentId || leanTo.id;
    const parent = leanTos.find(lt => lt.id === mainId);
    if (!parent) return undefined;
    
    // Determine which wall the child should be on based on parent wall
    let childWall: 'front' | 'back' | 'left' | 'right';
    if (parent.wall === 'front' || parent.wall === 'back') {
      childWall = side; // Front/back parent: children are on left/right walls
    } else {
      childWall = side === 'left' ? 'front' : 'back'; // Left/right parent: children are on front/back walls
    }
    
    return leanTos.find(lt => lt.parentId === mainId && lt.wall === childWall && lt.wraparound);
  };

  // Filter out side lean-tos that are part of wraparound (they're controlled by main lean-to)
  const visibleLeanTos = leanTos.filter(lt => {
    if (lt.wraparound && lt.parentId) {
      return false; // Hide all child wraparound lean-tos regardless of wall
    }
    return true;
  });

  return (
    <div className="space-y-3">
      {visibleLeanTos.map((leanTo, index) => {
        const isEditing = editingLeanToId === leanTo.id;
        const actualIndex = leanTos.findIndex(lt => lt.id === leanTo.id);
        
        return (
          <Card 
            key={leanTo.id}
            className="p-3 space-y-3 cursor-pointer transition-all"
            onClick={() => onEditingLeanToIdChange(isEditing ? null : leanTo.id)}
            style={{
              borderColor: isEditing ? 'hsl(var(--primary))' : 'hsl(var(--border))',
              backgroundColor: isEditing ? 'hsl(var(--primary) / 0.1)' : 'transparent',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Lean-To #{actualIndex + 1}
                  {leanTo.wraparound && <span className="ml-1 text-primary">(w/ Wraparound)</span>}
                </span>
                {!leanTo.wraparound && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full transition-all ${
                    isEditing 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isEditing ? 'Editing' : 'Edit'}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveLeanTo(leanTo.id);
                }}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-md mb-3" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  if (leanTo.wraparound) {
                    handleUpdateWraparoundGroup(leanTo, { 
                      type: leanTo.type === 'gable' ? 'enclosed' : leanTo.type,
                    });
                  } else {
                    // Switching to single slope: set to max length
                    const wallDimension = (leanTo.wall === 'left' || leanTo.wall === 'right') 
                      ? buildingLength 
                      : buildingWidth;
                    
                    handleUpdateLeanTo(leanTo.id, { 
                      type: leanTo.type === 'gable' ? 'enclosed' : leanTo.type,
                      width: leanTo.type === 'gable' ? 12 : leanTo.width,
                      length: wallDimension,
                      position: 0.5
                    });
                  }
                }}
                className={`h-5 text-xs py-0 rounded-sm transition-all ${
                  (leanTo.type === 'enclosed' || leanTo.type === 'open')
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Single Slope
              </button>
              
              <button
                onClick={() => {
                  if (leanTo.wraparound) return; // Can't change to gable when wraparound
                  
                  const wallDimension = (leanTo.wall === 'left' || leanTo.wall === 'right') 
                    ? buildingLength 
                    : buildingWidth;
                  // Gable: 10ft shorter than max width, centered
                  const defaultWidth = Math.max(15, wallDimension - 10);
                  handleUpdateLeanTo(leanTo.id, { 
                    type: 'gable',
                    width: leanTo.type === 'gable' ? leanTo.width : defaultWidth,
                    length: leanTo.type === 'gable' ? leanTo.length : 20,
                    position: 0.5
                  });
                }}
                className={`h-5 text-xs py-0 rounded-sm transition-all ${
                  leanTo.type === 'gable'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                disabled={leanTo.wraparound}
              >
                Gable
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
              <div>
                <Label className="mb-1 block text-xs">Width</Label>
                <Select
                  value={leanTo.width.toString()} 
                  onValueChange={(value) => {
                    if (leanTo.wraparound) {
                      handleUpdateWraparoundGroup(leanTo, { width: Number(value) });
                    } else {
                      handleUpdateLeanTo(leanTo.id, { width: Number(value) });
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    {leanTo.type === 'gable'
                      ? (() => {
                          const wallDimension = (leanTo.wall === 'left' || leanTo.wall === 'right') 
                            ? buildingLength 
                            : buildingWidth;
                          const maxWidth = Math.min(wallDimension, 120);
                          return Array.from(
                            { length: Math.floor((maxWidth - 15) / 5) + 1 }, 
                            (_, i) => 15 + i * 5
                          ).map((w) => (
                            <SelectItem key={w} value={w.toString()}>{w} ft</SelectItem>
                          ));
                        })()
                      : Array.from({ length: 11 }, (_, i) => 10 + i * 2).map((w) => (
                          <SelectItem key={w} value={w.toString()}>{w} ft</SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block text-xs">Length</Label>
                <Select 
                  value={leanTo.length.toString()} 
                  onValueChange={(value) => {
                    const newLength = Number(value);
                    const wallDimension = (leanTo.wall === 'left' || leanTo.wall === 'right') 
                      ? buildingLength 
                      : buildingWidth;
                    
                    let newPosition = leanTo.position;
                    
                    if (leanTo.wraparound && leanTo.wraparoundCorner !== 'both') {
                      // Maintain corner pinning when length changes
                      const halfSpan = (newLength / wallDimension) / 2;
                      if (leanTo.wraparoundCorner === 'right') {
                        newPosition = 1 - halfSpan;
                      } else if (leanTo.wraparoundCorner === 'left') {
                        newPosition = halfSpan;
                      }
                    }
                    
                    handleUpdateLeanTo(leanTo.id, { length: newLength, position: newPosition });
                  }}
                  disabled={leanTo.wraparound && leanTo.wraparoundCorner === 'both'}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    {leanTo.type === 'gable'
                      ? Array.from({ length: 50 }, (_, i) => 10 + i * 10).map((l) => (
                          <SelectItem key={l} value={l.toString()}>{l} ft</SelectItem>
                        ))
                      : (() => {
                          const wallDimension = (leanTo.wall === 'left' || leanTo.wall === 'right') 
                            ? buildingLength 
                            : buildingWidth;
                          const maxLength = Math.min(wallDimension, 500);
                          return Array.from(
                            { length: Math.floor(maxLength / 5) - 1 }, 
                            (_, i) => 10 + i * 5
                          ).map((l) => (
                            <SelectItem key={l} value={l.toString()}>{l} ft</SelectItem>
                          ));
                        })()
                    }
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1 block text-xs">Height</Label>
                <Select
                  value={leanTo.height.toString()} 
                  onValueChange={(value) => {
                    if (leanTo.wraparound) {
                      handleUpdateWraparoundGroup(leanTo, { height: Number(value) });
                    } else {
                      handleUpdateLeanTo(leanTo.id, { height: Number(value) });
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    {heightOptions.filter(h => h <= buildingHeight).map((h) => (
                      <SelectItem key={h} value={h.toString()}>{h} ft</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Wraparound Length Control */}
            {leanTo.wraparound && leanTo.wraparoundCorner === 'both' ? (
              <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                <div>
                  <Label className="mb-1 block text-xs">Left Length</Label>
                  <Select 
                    value={(() => {
                      const leftSide = getWraparoundSideLeanTo(leanTo, 'left');
                      return (leftSide?.length || 30).toString();
                    })()} 
                    onValueChange={(value) => {
                      const leftSide = getWraparoundSideLeanTo(leanTo, 'left');
                      if (!leftSide) return;
                      
                      onLeanTosChange(leanTos.map(lt => {
                        if (lt.id === leftSide.id) {
                          return { ...lt, length: Number(value) };
                        }
                        return lt;
                      }));
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      {(() => {
                        const wallDimension = (leanTo.wall === 'front' || leanTo.wall === 'back') 
                          ? buildingLength 
                          : buildingWidth;
                        const maxLength = Math.min(wallDimension, 500);
                        return Array.from(
                          { length: Math.floor(maxLength / 5) - 1 }, 
                          (_, i) => 10 + i * 5
                        ).map((l) => (
                          <SelectItem key={l} value={l.toString()}>{l} ft</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Right Length</Label>
                  <Select 
                    value={(() => {
                      const rightSide = getWraparoundSideLeanTo(leanTo, 'right');
                      return (rightSide?.length || 30).toString();
                    })()} 
                    onValueChange={(value) => {
                      const rightSide = getWraparoundSideLeanTo(leanTo, 'right');
                      if (!rightSide) return;
                      
                      onLeanTosChange(leanTos.map(lt => {
                        if (lt.id === rightSide.id) {
                          return { ...lt, length: Number(value) };
                        }
                        return lt;
                      }));
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      {(() => {
                        const wallDimension = (leanTo.wall === 'front' || leanTo.wall === 'back') 
                          ? buildingLength 
                          : buildingWidth;
                        const maxLength = Math.min(wallDimension, 500);
                        return Array.from(
                          { length: Math.floor(maxLength / 5) - 1 }, 
                          (_, i) => 10 + i * 5
                        ).map((l) => (
                          <SelectItem key={l} value={l.toString()}>{l} ft</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : leanTo.wraparound ? (
              <div onClick={(e) => e.stopPropagation()}>
                <Label className="mb-1 block text-xs">Wraparound Length</Label>
                <Select 
                  value={(() => {
                    const leftSide = getWraparoundSideLeanTo(leanTo, 'left');
                    const rightSide = getWraparoundSideLeanTo(leanTo, 'right');
                    return (leftSide?.length || rightSide?.length || 30).toString();
                  })()} 
                  onValueChange={(value) => {
                    const connectedWalls = [];
                    if (leanTo.wraparoundCorner === 'left' || leanTo.wraparoundCorner === 'both') {
                      connectedWalls.push('left');
                    }
                    if (leanTo.wraparoundCorner === 'right' || leanTo.wraparoundCorner === 'both') {
                      connectedWalls.push('right');
                    }

                    onLeanTosChange(leanTos.map(lt => {
                      if (connectedWalls.includes(lt.wall) && lt.wraparound) {
                        return { ...lt, length: Number(value) };
                      }
                      return lt;
                    }));
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background">
                    {(() => {
                      const wallDimension = buildingLength;
                      const maxLength = Math.min(wallDimension, 500);
                      return Array.from(
                        { length: Math.floor(maxLength / 5) - 1 }, 
                        (_, i) => 10 + i * 5
                      ).map((l) => (
                        <SelectItem key={l} value={l.toString()}>{l} ft</SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between mb-1">
                <Label className="text-xs">Pitch</Label>
                <span className="text-xs font-medium">{leanTo.pitch}/12</span>
              </div>
              <Slider
                value={[leanTo.pitch]}
                onValueChange={(value) => {
                  if (leanTo.wraparound) {
                    handleUpdateWraparoundGroup(leanTo, { pitch: value[0] });
                  } else {
                    handleUpdateLeanTo(leanTo.id, { pitch: value[0] });
                  }
                }}
                min={1}
                max={Math.min(roofPitch, 12)}
                step={1}
                className="h-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
              <div>
                <Label className="mb-1 block text-xs">Configuration</Label>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    variant={leanTo.type === 'gable' ? (leanTo.isOpen ? 'outline' : 'default') : (leanTo.type === 'enclosed' ? 'default' : 'outline')}
                    onClick={() => {
                      if (leanTo.wraparound) {
                        handleUpdateWraparoundGroup(leanTo, { 
                          type: leanTo.type === 'gable' ? 'gable' : 'enclosed',
                          isOpen: false
                        });
                      } else {
                        handleUpdateLeanTo(leanTo.id, { 
                          type: leanTo.type === 'gable' ? 'gable' : 'enclosed',
                          isOpen: leanTo.type === 'gable' ? false : leanTo.isOpen
                        });
                      }
                    }}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    Enclosed
                  </Button>
                  <Button
                    variant={leanTo.type === 'gable' ? (leanTo.isOpen ? 'default' : 'outline') : (leanTo.type === 'open' ? 'default' : 'outline')}
                    onClick={() => {
                      if (leanTo.wraparound) {
                        handleUpdateWraparoundGroup(leanTo, {
                          type: leanTo.type === 'gable' ? 'gable' : 'open',
                          isOpen: true
                        });
                      } else {
                        handleUpdateLeanTo(leanTo.id, {
                          type: leanTo.type === 'gable' ? 'gable' : 'open',
                          isOpen: leanTo.type === 'gable' ? true : leanTo.isOpen
                        });
                      }
                    }}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    Open
                  </Button>
                </div>
              </div>

              <div>
                <Label className="mb-1 block text-xs">{leanTo.wraparound ? 'Corner Position' : 'Wall'}</Label>
                {leanTo.wraparound ? (
                  <Select 
                    value={leanTo.wraparoundCorner || 'both'} 
                    onValueChange={(value: 'left' | 'right' | 'both') => handleCornerPositionChange(leanTo, value)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Select 
                    value={leanTo.wall} 
                    onValueChange={(value: 'front' | 'back' | 'left' | 'right') => {
                      // Calculate new dimensions based on wall and type
                      const newWallDimension = (value === 'left' || value === 'right') 
                        ? buildingLength 
                        : buildingWidth;
                      
                      let newLength: number;
                      let newWidth: number;
                      let newPosition: number;
                      
                      if (leanTo.type === 'gable') {
                        // Gable: 10ft shorter than max width, centered
                        newWidth = Math.max(15, newWallDimension - 10);
                        newLength = leanTo.length;
                        newPosition = 0.5;
                      } else {
                        // Single slope: max length
                        newLength = newWallDimension;
                        newWidth = leanTo.width;
                        newPosition = 0.5;
                      }
                      
                      handleUpdateLeanTo(leanTo.id, { 
                        wall: value, 
                        length: newLength,
                        width: newWidth,
                        position: newPosition
                      });
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-background">
                      {(['front', 'back', 'left', 'right'] as const).map(wall => {
                        const isUsed = leanTos.some(lt => lt.id !== leanTo.id && lt.wall === wall);
                        return (
                          <SelectItem key={wall} value={wall} disabled={isUsed}>
                            {wall.charAt(0).toUpperCase() + wall.slice(1)} {isUsed ? '(Used)' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Wraparound option */}
            {(() => {
              const availableCorners = getAvailableWraparoundCorners(leanTo);
              if (availableCorners.length === 0) return null;

              return (
                <div onClick={(e) => e.stopPropagation()}>
                  <Label className="mb-2 block text-xs">Wraparound Porch</Label>
                  <div className="grid grid-cols-2 gap-1">
                    <Button
                      variant={!leanTo.wraparound ? 'default' : 'outline'}
                      onClick={() => handleToggleWraparound(leanTo, false)}
                      size="sm"
                      className="h-7 text-xs"
                    >
                      Off
                    </Button>
                    <Button
                      variant={leanTo.wraparound ? 'default' : 'outline'}
                      onClick={() => {
                        if (!leanTo.wraparound) {
                          const defaultCorner = availableCorners.includes('right') ? 'right' : availableCorners[0];
                          handleToggleWraparound(leanTo, true, defaultCorner);
                        }
                      }}
                      size="sm"
                      className="h-7 text-xs"
                    >
                      On
                    </Button>
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-1">
                    Creates side lean-to at selected corner(s)
                  </p>
                </div>
              );
            })()}
          </Card>
        );
      })}

      {leanTos.length < 4 && (
        <Button
          variant="outline"
          onClick={handleAddLeanTo}
          className="w-full h-9 text-xs"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add {leanTos.length > 0 ? 'Another ' : ''}Lean-To
        </Button>
      )}
    </div>
  );
};
