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
      onLeanTosChange(
        leanTos.filter(lt => lt.id !== id && lt.parentId !== id)
      );
    } else {
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

    const usedWalls = new Set(leanTos.map(lt => lt.wall));
    
    if (leanTo.wall === 'front' || leanTo.wall === 'back') {
      if (isAtRightCorner && !usedWalls.has('right')) {
        availableCorners.push('right');
      }
      if (isAtLeftCorner && !usedWalls.has('left')) {
        availableCorners.push('left');
      }
    } else if (leanTo.wall === 'left' || leanTo.wall === 'right') {
      return [];
    }

    return availableCorners;
  };

  const handleToggleWraparound = (leanTo: LeanTo, enable: boolean, corner?: 'left' | 'right' | 'both') => {
    if (enable && corner) {
      const baseLeanTos = leanTos.filter(lt => lt.parentId !== leanTo.id);
      const newLeanTos = [...baseLeanTos];
      const mainIndex = newLeanTos.findIndex(lt => lt.id === leanTo.id);

      if (mainIndex === -1) return;
      
      const wallDimension = (leanTo.wall === 'left' || leanTo.wall === 'right') 
        ? buildingLength 
        : buildingWidth;
      
      let position = leanTo.position;
      let length = leanTo.length;
      
      if (corner === 'both') {
        position = 0.5;
        length = wallDimension;
      } else if (corner === 'right') {
        const halfSpan = (length / wallDimension) / 2;
        position = 1 - halfSpan;
      } else if (corner === 'left') {
        const halfSpan = (length / wallDimension) / 2;
        position = halfSpan;
      }
      
      newLeanTos[mainIndex] = { 
        ...leanTo, 
        wraparound: true, 
        wraparoundCorner: corner, 
        position, 
        length,
        parentId: undefined,
      };

      const sideLeanToLength = 30;

      if (corner === 'left' || corner === 'both') {
        let childWall: 'front' | 'back' | 'left' | 'right';
        let childPosition: number;
        
        if (leanTo.wall === 'front' || leanTo.wall === 'back') {
          childWall = 'left';
          childPosition = leanTo.wall === 'front' ? 0 : 1;
        } else {
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
        let childWall: 'front' | 'back' | 'left' | 'right';
        let childPosition: number;
        
        if (leanTo.wall === 'front' || leanTo.wall === 'back') {
          childWall = 'right';
          childPosition = leanTo.wall === 'front' ? 1 : 0;
        } else {
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
      position = 0.5;
      length = wallDimension;
    } else if (corner === 'right') {
      const halfSpan = (length / wallDimension) / 2;
      position = 1 - halfSpan;
    } else if (corner === 'left') {
      const halfSpan = (length / wallDimension) / 2;
      position = halfSpan;
    }
    
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
    
    let childWall: 'front' | 'back' | 'left' | 'right';
    if (parent.wall === 'front' || parent.wall === 'back') {
      childWall = side;
    } else {
      childWall = side === 'left' ? 'front' : 'back';
    }
    
    return leanTos.find(lt => lt.parentId === mainId && lt.wall === childWall && lt.wraparound);
  };

  const visibleLeanTos = leanTos.filter(lt => {
    if (lt.wraparound && lt.parentId) {
      return false;
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
            data-testid={`card-leanto-${leanTo.id}`}
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
                data-testid={`button-remove-leanto-${leanTo.id}`}
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
                data-testid={`button-leanto-single-slope-${leanTo.id}`}
              >
                Single Slope
              </button>
              
              <button
                onClick={() => {
                  if (leanTo.wraparound) return;
                  
                  const wallDimension = (leanTo.wall === 'left' || leanTo.wall === 'right') 
                    ? buildingLength 
                    : buildingWidth;
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
                data-testid={`button-leanto-gable-${leanTo.id}`}
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
                  <SelectContent className="bg-background">
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
                  <SelectContent className="bg-background">
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
                  <SelectContent className="bg-background">
                    {heightOptions.filter(h => h <= buildingHeight).map((h) => (
                      <SelectItem key={h} value={h.toString()}>{h} ft</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                    <SelectContent className="bg-background">
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
                    <SelectContent className="bg-background">
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
            ) : null}

            {leanTo.type !== 'gable' && !leanTo.wraparound && (
              <div className="pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }} onClick={(e) => e.stopPropagation()}>
                <Label className="mb-2 block text-xs">Wraparound Corner</Label>
                {(() => {
                  const availableCorners = getAvailableWraparoundCorners(leanTo);
                  if (availableCorners.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        Position lean-to at a corner to enable wraparound
                      </p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-3 gap-2">
                      {availableCorners.includes('left') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleWraparound(leanTo, true, 'left')}
                          className="h-7 text-xs"
                        >
                          Left
                        </Button>
                      )}
                      {availableCorners.includes('right') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleWraparound(leanTo, true, 'right')}
                          className="h-7 text-xs"
                        >
                          Right
                        </Button>
                      )}
                      {availableCorners.includes('left') && availableCorners.includes('right') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleWraparound(leanTo, true, 'both')}
                          className="h-7 text-xs"
                        >
                          Both
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {leanTo.wraparound && (
              <div className="pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }} onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleWraparound(leanTo, false)}
                  className="w-full h-7 text-xs text-destructive hover:text-destructive"
                >
                  Remove Wraparound
                </Button>
              </div>
            )}

            <div className="pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">Roof Pitch</Label>
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
                max={4}
                step={1}
              />
            </div>
          </Card>
        );
      })}

      {getAvailableWalls().length > 0 && (
        <Button
          variant="outline"
          onClick={handleAddLeanTo}
          className="w-full gap-2"
          data-testid="button-add-leanto"
        >
          <Plus className="h-4 w-4" />
          Add {leanTos.length > 0 ? 'Another ' : ''}Lean-To
        </Button>
      )}
    </div>
  );
};
