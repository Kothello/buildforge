import { LeanToConfig } from './LeanToConfig';
import { PricingHeader } from './PricingHeader';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DoorOpen, Square, RectangleVertical } from 'lucide-react';
import leanToSingleImage from './assets/lean-to-single.png';
import leanToGableImage from './assets/lean-to-gable.png';

interface ConfigPanelProps {
  width: number;
  length: number;
  height: number;
  wallColor: string;
  roofColor: string;
  trimColor: string;
  roofStyle: 'gable' | 'single-slope';
  roofPitch: number;
  onWidthChange: (value: number) => void;
  onLengthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onWallColorChange: (color: string) => void;
  onRoofColorChange: (color: string) => void;
  onTrimColorChange: (color: string) => void;
  onRoofStyleChange: (style: 'gable' | 'single-slope') => void;
  onRoofPitchChange: (value: number[]) => void;
  onAddRollupDoor: () => void;
  onAddPersonnelDoor: () => void;
  onAddWindow: () => void;
  editMode: boolean;
  onToggleEditMode: () => void;
  wallEnclosure: 'fully-enclosed' | 'fully-open' | 'gable-ends' | 'customize';
  onWallEnclosureChange: (value: 'fully-enclosed' | 'fully-open' | 'gable-ends' | 'customize') => void;
  customWalls: { front: boolean; back: boolean; left: boolean; right: boolean };
  onCustomWallsChange: (walls: { front: boolean; back: boolean; left: boolean; right: boolean }) => void;
  doors: Array<{ id: string; type: 'rollup' | 'personnel'; position: number }>;
  windows: Array<{ id: string; position: number }>;
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
  onLeanTosChange: (leanTos: Array<{
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
  }>) => void;
  editingLeanToId: string | null;
  onEditingLeanToIdChange: (id: string | null) => void;
  onTotalChange?: (total: string) => void;
}

export const ConfigPanel = ({
  width,
  length,
  height,
  wallColor,
  roofColor,
  trimColor,
  roofStyle,
  roofPitch,
  onWidthChange,
  onLengthChange,
  onHeightChange,
  onWallColorChange,
  onRoofColorChange,
  onTrimColorChange,
  onRoofStyleChange,
  onRoofPitchChange,
  onAddRollupDoor,
  onAddPersonnelDoor,
  onAddWindow,
  editMode,
  onToggleEditMode,
  wallEnclosure,
  onWallEnclosureChange,
  customWalls,
  onCustomWallsChange,
  doors,
  windows,
  leanTos,
  onLeanTosChange,
  editingLeanToId,
  onEditingLeanToIdChange,
  onTotalChange
}: ConfigPanelProps) => {
  const [colorTab, setColorTab] = useState<'walls' | 'roof' | 'trim'>('walls');
  const widthOptions = Array.from({ length: (120 - 35) / 5 + 1 }, (_, i) => 35 + i * 5);
  const lengthOptions = Array.from({ length: (500 - 30) / 10 + 1 }, (_, i) => 30 + i * 10);
  const heightOptions = Array.from({ length: (32 - 10) + 1 }, (_, i) => 10 + i);

  const colorOptions = [
    { name: 'Slate Gray', value: '#6B7280' },
    { name: 'Red Iron', value: '#B8453C' },
    { name: 'Tan', value: '#C9B899' },
    { name: 'White', value: '#F3F4F6' },
    { name: 'Charcoal', value: '#374151' },
    { name: 'Black', value: '#1F2937' },
    { name: 'Bright White', value: '#FFFFFF' },
    { name: 'Beige', value: '#D4C5A9' },
    { name: 'Navy Blue', value: '#1E3A8A' },
    { name: 'Forest Green', value: '#14532D' },
    { name: 'Brown', value: '#78350F' },
    { name: 'Burgundy', value: '#881337' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
      <Card className="p-4 space-y-2">
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Dimensions</h3>
          
          <div className="grid grid-cols-3 gap-2 relative z-40">
            <div className="relative">
              <Label className="mb-1.5 block text-xs">Width</Label>
              <Select value={width.toString()} onValueChange={(value) => onWidthChange(Number(value))}>
                <SelectTrigger data-testid="select-width">
                  <SelectValue placeholder="Select width" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {widthOptions.map((w) => (
                    <SelectItem key={w} value={w.toString()}>
                      {w} ft
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Label className="mb-1.5 block text-xs">Length</Label>
              <Select value={length.toString()} onValueChange={(value) => onLengthChange(Number(value))}>
                <SelectTrigger data-testid="select-length">
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {lengthOptions.map((l) => (
                    <SelectItem key={l} value={l.toString()}>
                      {l} ft
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Label className="mb-1.5 block text-xs">Height</Label>
              <Select value={height.toString()} onValueChange={(value) => onHeightChange(Number(value))}>
                <SelectTrigger data-testid="select-height">
                  <SelectValue placeholder="Select height" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {heightOptions.map((h) => (
                    <SelectItem key={h} value={h.toString()}>
                      {h} ft
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 space-y-3">
            <div>
              <Label className="mb-2 block text-xs">Roof Style</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={roofStyle === 'gable' ? 'default' : 'outline'}
                  onClick={() => onRoofStyleChange('gable')}
                  className="w-full h-8 text-xs"
                  data-testid="button-roof-gable"
                >
                  Gable
                </Button>
                <Button
                  variant={roofStyle === 'single-slope' ? 'default' : 'outline'}
                  onClick={() => onRoofStyleChange('single-slope')}
                  className="w-full h-8 text-xs"
                  data-testid="button-roof-single-slope"
                >
                  Single Slope
                </Button>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">Roof Pitch</Label>
                <span className="text-xs font-medium">{roofPitch}/12</span>
              </div>
              <Slider
                value={[roofPitch]}
                onValueChange={onRoofPitchChange}
                min={1}
                max={4}
                step={1}
                data-testid="slider-roof-pitch"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card 
        className="p-4 space-y-3 cursor-pointer transition-all"
        onClick={onToggleEditMode}
        style={{
          borderColor: editMode ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          backgroundColor: editMode ? 'hsl(var(--primary) / 0.1)' : 'transparent',
        }}
        data-testid="card-edit-mode"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Doors & Windows</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full transition-all ${
              editMode 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {editMode ? 'Edit ON' : 'Click to Edit'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onAddRollupDoor}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105 hover:border-accent aspect-square"
              style={{
                borderColor: 'hsl(var(--border))',
              }}
              data-testid="button-add-rollup-door"
            >
              <DoorOpen className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] text-center text-muted-foreground">Rollup</span>
            </button>
            
            <button
              onClick={onAddPersonnelDoor}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105 hover:border-accent aspect-square"
              style={{
                borderColor: 'hsl(var(--border))',
              }}
              data-testid="button-add-personnel-door"
            >
              <RectangleVertical className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] text-center text-muted-foreground">Personnel</span>
            </button>
            
            <button
              onClick={onAddWindow}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105 hover:border-accent aspect-square"
              style={{
                borderColor: 'hsl(var(--border))',
              }}
              data-testid="button-add-window"
            >
              <Square className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] text-center text-muted-foreground">Window</span>
            </button>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Colors</h3>
          <Tabs value={colorTab} onValueChange={(v) => setColorTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3 mb-3 h-7">
              <TabsTrigger value="walls" className="text-xs h-5 py-0">Walls</TabsTrigger>
              <TabsTrigger value="roof" className="text-xs h-5 py-0">Roof</TabsTrigger>
              <TabsTrigger value="trim" className="text-xs h-5 py-0">Trim</TabsTrigger>
            </TabsList>

            <TabsContent value="walls" className="mt-0">
              <div className="grid grid-cols-6 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => onWallColorChange(color.value)}
                    className="group relative rounded-full transition-all hover:scale-110"
                    title={color.name}
                    data-testid={`button-wall-color-${color.name.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <div
                      className="w-10 h-10 rounded-full transition-all"
                      style={{ 
                        backgroundColor: color.value,
                        boxShadow: wallColor === color.value 
                          ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--primary))` 
                          : '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="roof" className="mt-0">
              <div className="grid grid-cols-6 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => onRoofColorChange(color.value)}
                    className="group relative rounded-full transition-all hover:scale-110"
                    title={color.name}
                    data-testid={`button-roof-color-${color.name.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <div
                      className="w-10 h-10 rounded-full transition-all"
                      style={{ 
                        backgroundColor: color.value,
                        boxShadow: roofColor === color.value 
                          ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--primary))` 
                          : '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="trim" className="mt-0">
              <div className="grid grid-cols-6 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => onTrimColorChange(color.value)}
                    className="group relative rounded-full transition-all hover:scale-110"
                    title={color.name}
                    data-testid={`button-trim-color-${color.name.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <div
                      className="w-10 h-10 rounded-full transition-all"
                      style={{ 
                        backgroundColor: color.value,
                        boxShadow: trimColor === color.value 
                          ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--primary))` 
                          : '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      <LeanToConfig
        leanTos={leanTos}
        onLeanTosChange={onLeanTosChange}
        editingLeanToId={editingLeanToId}
        onEditingLeanToIdChange={onEditingLeanToIdChange}
        buildingWidth={width}
        buildingLength={length}
        buildingHeight={height}
        roofStyle={roofStyle}
        roofPitch={roofPitch}
      />

      <Card className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Walls</h3>
          <Label className="mb-2 block text-xs">Wall Enclosure</Label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Button
              variant={wallEnclosure === 'fully-enclosed' ? 'default' : 'outline'}
              onClick={() => onWallEnclosureChange('fully-enclosed')}
              className="w-full h-8 text-xs"
              data-testid="button-wall-fully-enclosed"
            >
              Fully Enclosed
            </Button>
            <Button
              variant={wallEnclosure === 'fully-open' ? 'default' : 'outline'}
              onClick={() => onWallEnclosureChange('fully-open')}
              className="w-full h-8 text-xs"
              data-testid="button-wall-fully-open"
            >
              Fully Open
            </Button>
            <Button
              variant={wallEnclosure === 'gable-ends' ? 'default' : 'outline'}
              onClick={() => onWallEnclosureChange('gable-ends')}
              className="w-full h-8 text-xs"
              data-testid="button-wall-gable-ends"
            >
              Gable Ends
            </Button>
            <Button
              variant={wallEnclosure === 'customize' ? 'default' : 'outline'}
              onClick={() => onWallEnclosureChange('customize')}
              className="w-full h-8 text-xs"
              data-testid="button-wall-customize"
            >
              Customize by Wall
            </Button>
          </div>

          {wallEnclosure === 'customize' && (
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <Label className="text-xs text-muted-foreground mb-2 block">Select Walls</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={customWalls.front ? 'default' : 'outline'}
                  onClick={() => onCustomWallsChange({ ...customWalls, front: !customWalls.front })}
                  size="sm"
                  className="w-full h-7 text-xs"
                  data-testid="button-custom-wall-front"
                >
                  Front
                </Button>
                <Button
                  variant={customWalls.back ? 'default' : 'outline'}
                  onClick={() => onCustomWallsChange({ ...customWalls, back: !customWalls.back })}
                  size="sm"
                  className="w-full h-7 text-xs"
                  data-testid="button-custom-wall-back"
                >
                  Back
                </Button>
                <Button
                  variant={customWalls.left ? 'default' : 'outline'}
                  onClick={() => onCustomWallsChange({ ...customWalls, left: !customWalls.left })}
                  size="sm"
                  className="w-full h-7 text-xs"
                  data-testid="button-custom-wall-left"
                >
                  Left
                </Button>
                <Button
                  variant={customWalls.right ? 'default' : 'outline'}
                  onClick={() => onCustomWallsChange({ ...customWalls, right: !customWalls.right })}
                  size="sm"
                  className="w-full h-7 text-xs"
                  data-testid="button-custom-wall-right"
                >
                  Right
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="pb-4" data-testid="pricing-section">
        <PricingHeader
          config={{
            width,
            length,
            height,
            roofStyle,
            roofPitch,
            wallColor,
            roofColor,
            trimColor,
            doors: doors.map((d, i) => ({ id: d.id, doorType: d.type === 'rollup' ? 'rollup' : 'walk' as const, position: i })),
            windows: windows.map((w, i) => ({ id: w.id, position: i })),
            leanTos: leanTos
          }}
          region="midwest"
          onTotalChange={onTotalChange}
        />
      </div>
      </div>
    </div>
  );
};
