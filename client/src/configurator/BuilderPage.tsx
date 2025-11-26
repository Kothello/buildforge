import { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import type { Door, Window, LeanTo, BuildingConfig } from './types';
import { PricingDisplay } from './PricingDisplay';

export default function BuilderPage() {
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
  const [leanTos, setLeanTos] = useState<LeanTo[]>([]);
  const [wallEnclosure, setWallEnclosure] = useState<'fully-enclosed' | 'fully-open' | 'gable-ends' | 'customize'>('fully-enclosed');
  const [customWalls, setCustomWalls] = useState({ front: true, back: true, left: true, right: true });
  const { toast } = useToast();

  const config: BuildingConfig = useMemo(
    () => ({
      width,
      length,
      height,
      roofStyle,
      roofPitch,
      wallColor,
      roofColor,
      trimColor,
      doors: doors.map(d => ({ id: d.id, type: d.type, position: d.position, width: d.width, height: d.height })),
      windows: windows.map(w => ({ id: w.id, position: w.position, width: w.width, height: w.height })),
      leanTos,
      wallEnclosure,
      customWalls,
    }),
    [width, length, height, roofStyle, roofPitch, wallColor, roofColor, trimColor, doors, windows, leanTos, wallEnclosure, customWalls]
  );

  const addRollupDoor = () => {
    const newDoor: Door = {
      id: `door-${Date.now()}`,
      type: 'rollup',
      wall: 'front',
      position: 0.5,
      width: 10,
      height: 8,
    };
    setDoors([...doors, newDoor]);
    toast({
      title: 'Door Added',
      description: 'Rollup door added to front wall'
    });
  };

  const addWindow = () => {
    const newWindow: Window = {
      id: `window-${Date.now()}`,
      wall: 'front',
      position: 0.5,
      width: 4,
      height: 4,
    };
    setWindows([...windows, newWindow]);
    toast({
      title: 'Window Added',
      description: 'Window added to front wall'
    });
  };

  const colorOptions = [
    { name: 'Slate Gray', value: '#6B7280' },
    { name: 'Red Iron', value: '#B8453C' },
    { name: 'Tan', value: '#C9B899' },
    { name: 'White', value: '#F3F4F6' },
    { name: 'Charcoal', value: '#374151' },
    { name: 'Black', value: '#1F2937' },
  ];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background">
      {/* 3D Viewer Placeholder */}
      <div className="flex-1 flex items-center justify-center bg-slate-900">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-2">3D Building Configurator</h2>
          <p className="text-muted-foreground">3D viewer coming soon...</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-80 border-l bg-background overflow-y-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">Building Configurator</h1>

        {/* Dimensions */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Dimensions</h3>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Width: {width} ft</Label>
              <Slider
                value={[width]}
                onValueChange={(v) => setWidth(v[0])}
                min={35}
                max={120}
                step={5}
                data-testid="slider-width"
              />
            </div>
            <div>
              <Label className="text-xs">Length: {length} ft</Label>
              <Slider
                value={[length]}
                onValueChange={(v) => setLength(v[0])}
                min={30}
                max={500}
                step={10}
                data-testid="slider-length"
              />
            </div>
            <div>
              <Label className="text-xs">Height: {height} ft</Label>
              <Slider
                value={[height]}
                onValueChange={(v) => setHeight(v[0])}
                min={10}
                max={32}
                step={1}
                data-testid="slider-height"
              />
            </div>
          </div>
        </Card>

        {/* Colors */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Colors</h3>
          <div className="space-y-2">
            <div>
              <Label className="text-xs mb-2 block">Wall Color</Label>
              <Select value={wallColor} onValueChange={setWallColor}>
                <SelectTrigger data-testid="select-wall-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {colorOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: c.value }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Roof Color</Label>
              <Select value={roofColor} onValueChange={setRoofColor}>
                <SelectTrigger data-testid="select-roof-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  {colorOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: c.value }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Roof Style */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Roof</h3>
          <div className="space-y-2">
            <div>
              <Label className="text-xs mb-2 block">Style</Label>
              <Select value={roofStyle} onValueChange={(v: any) => setRoofStyle(v)}>
                <SelectTrigger data-testid="select-roof-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="gable">Gable</SelectItem>
                  <SelectItem value="single-slope">Single Slope</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Pitch: {roofPitch} / 12</Label>
              <Slider
                value={[roofPitch]}
                onValueChange={(v) => setRoofPitch(v[0])}
                min={1}
                max={12}
                step={1}
                data-testid="slider-roof-pitch"
              />
            </div>
          </div>
        </Card>

        {/* Openings */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Openings</h3>
          <div className="space-y-2">
            <Button
              onClick={addRollupDoor}
              variant="outline"
              size="sm"
              className="w-full"
              data-testid="button-add-door"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Door ({doors.length})
            </Button>
            <Button
              onClick={addWindow}
              variant="outline"
              size="sm"
              className="w-full"
              data-testid="button-add-window"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Window ({windows.length})
            </Button>
          </div>
        </Card>

        {/* Pricing */}
        <PricingDisplay config={config} region="default" />
      </div>
    </div>
  );
}
