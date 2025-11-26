import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Save } from 'lucide-react';
import type { Door, Window, LeanTo, BuildingConfig } from './types';
import { Lead } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';

interface LeadConfiguratorEmbedProps {
  lead: Lead;
  onSave?: (updatedLead: Lead) => void;
}

export function LeadConfiguratorEmbed({ lead, onSave }: LeadConfiguratorEmbedProps) {
  // Initialize from lead.configuration if available, otherwise use defaults
  const initialConfig = (lead.configuration as BuildingConfig) || null;
  
  const [width, setWidth] = useState(initialConfig?.width ?? 40);
  const [length, setLength] = useState(initialConfig?.length ?? 60);
  const [height, setHeight] = useState(initialConfig?.height ?? 12);
  const [wallColor, setWallColor] = useState(initialConfig?.wallColor ?? '#6B7280');
  const [roofColor, setRoofColor] = useState(initialConfig?.roofColor ?? '#FFFFFF');
  const [trimColor, setTrimColor] = useState(initialConfig?.trimColor ?? '#FFFFFF');
  const [roofStyle, setRoofStyle] = useState<'gable' | 'single-slope'>(initialConfig?.roofStyle ?? 'gable');
  const [roofPitch, setRoofPitch] = useState(initialConfig?.roofPitch ?? 2);
  const [doors, setDoors] = useState<Door[]>(initialConfig?.doors?.map((d: any) => ({
    id: d.id,
    type: d.type,
    wall: 'front',
    position: d.position,
    width: d.width,
    height: d.height,
  })) ?? []);
  const [windows, setWindows] = useState<Window[]>(initialConfig?.windows?.map((w: any) => ({
    id: w.id,
    wall: 'front',
    position: w.position,
    width: w.width,
    height: w.height,
  })) ?? []);
  const [leanTos, setLeanTos] = useState<LeanTo[]>(initialConfig?.leanTos ?? []);
  const [wallEnclosure, setWallEnclosure] = useState<'fully-enclosed' | 'fully-open' | 'gable-ends' | 'customize'>(initialConfig?.wallEnclosure ?? 'fully-enclosed');
  const [customWalls, setCustomWalls] = useState(initialConfig?.customWalls ?? { front: true, back: true, left: true, right: true });

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

  const colorOptions = [
    { name: 'Slate Gray', value: '#6B7280' },
    { name: 'Red Iron', value: '#B8453C' },
    { name: 'Tan', value: '#C9B899' },
    { name: 'White', value: '#F3F4F6' },
    { name: 'Charcoal', value: '#374151' },
    { name: 'Black', value: '#1F2937' },
  ];

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

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Build buildingSpecs from current configuration
      const buildingSpecs = {
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
      };

      const payload = {
        buildingSpecs,
        configuration: config,
      };

      const response = await apiRequest('PATCH', `/api/leads/${lead.id}`, payload);
      return response.json();
    },
    onSuccess: (updatedLead) => {
      toast({
        title: 'Success',
        description: 'Configuration saved',
      });
      onSave?.(updatedLead);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-4">
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
          <div>
            <Label className="text-xs mb-2 block">Trim Color</Label>
            <Select value={trimColor} onValueChange={setTrimColor}>
              <SelectTrigger data-testid="select-trim-color">
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

      {/* Roof */}
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

      {/* Save Button */}
      <Button
        onClick={() => updateMutation.mutate()}
        disabled={updateMutation.isPending}
        className="w-full gap-2"
        data-testid="button-save-configuration"
      >
        <Save className="h-4 w-4" />
        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}
