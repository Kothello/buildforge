import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DoorOpen, Square, RectangleVertical, Trash2, Warehouse, Home, Plus } from 'lucide-react';
import type { BuildingConfig, WallSide, RoofStyle, WallEnclosure, LeanToType } from './types';
import { WALL_COLORS, ROLLUP_SIZES, STEEL_PRESETS } from './types';
import { calculatePricing } from './pricing';
import { addLeanTo, updateLeanTo, deleteLeanTo, setWallEnclosure, toggleCustomWall } from './placement';

interface ConfigPanelProps {
  config: BuildingConfig;
  onChange: (config: BuildingConfig) => void;
  onWallHover: (wall: WallSide | null) => void;
  onAddRollup?: () => void;
  onAddPersonnel?: () => void;
  onAddWindow?: () => void;
}

export default function ConfigPanel({ config, onChange, onWallHover, onAddRollup, onAddPersonnel, onAddWindow }: ConfigPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [colorTab, setColorTab] = useState<'walls' | 'roof' | 'trim'>('walls');
  const pricing = calculatePricing(config);

  const update = (partial: Partial<BuildingConfig>) => {
    onChange({ ...config, ...partial });
  };

  const widthOptions = Array.from({ length: (120 - 20) / 5 + 1 }, (_, i) => 20 + i * 5);
  const lengthOptions = Array.from({ length: (200 - 20) / 10 + 1 }, (_, i) => 20 + i * 10);
  const heightOptions = Array.from({ length: (30 - 10) + 1 }, (_, i) => 10 + i);

  const removeDoor = (id: string) => {
    update({ doors: config.doors.filter(d => d.id !== id) });
  };

  const removeWindow = (id: string) => {
    update({ windows: config.windows.filter(w => w.id !== id) });
  };

  const applyPreset = (presetId: string) => {
    const preset = STEEL_PRESETS.find(p => p.id === presetId);
    if (preset?.config) {
      onChange({ ...config, ...preset.config } as BuildingConfig);
    }
  };

  return (
    <div className="w-full md:w-[38%] lg:w-[38%] flex flex-col h-full border-l" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background))' }}>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">

        {/* Pricing Header */}
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estimated Price</div>
          <div className="text-3xl font-bold mt-1">${pricing.totalCost.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {config.width}' x {config.length}' = {(config.width * config.length).toLocaleString()} sq ft
            &middot; ${pricing.pricePerSqFt}/sq ft
          </div>
        </div>

        {/* Presets */}
        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Quick Start</h3>
          <div className="grid grid-cols-2 gap-2">
            {STEEL_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <Warehouse className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-[10px] text-muted-foreground">{preset.description}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Dimensions */}
        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Dimensions</h3>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="mb-1.5 block text-xs">Width</Label>
              <Select value={config.width.toString()} onValueChange={(v) => update({ width: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  {widthOptions.map(w => (
                    <SelectItem key={w} value={w.toString()}>{w} ft</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Length</Label>
              <Select value={config.length.toString()} onValueChange={(v) => update({ length: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  {lengthOptions.map(l => (
                    <SelectItem key={l} value={l.toString()}>{l} ft</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Height</Label>
              <Select value={config.height.toString()} onValueChange={(v) => update({ height: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  {heightOptions.map(h => (
                    <SelectItem key={h} value={h.toString()}>{h} ft</SelectItem>
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
                  variant={config.roofStyle === 'gable' ? 'default' : 'outline'}
                  onClick={() => update({ roofStyle: 'gable' })}
                  className="w-full h-8 text-xs"
                >
                  Gable
                </Button>
                <Button
                  variant={config.roofStyle === 'single-slope' ? 'default' : 'outline'}
                  onClick={() => update({ roofStyle: 'single-slope' })}
                  className="w-full h-8 text-xs"
                >
                  Single Slope
                </Button>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <Label className="text-xs">Roof Pitch</Label>
                <span className="text-xs font-medium">{config.roofPitch}/12</span>
              </div>
              <Slider
                value={[config.roofPitch]}
                onValueChange={([v]) => update({ roofPitch: v })}
                min={1} max={6} step={0.5}
              />
            </div>
          </div>
        </Card>

        {/* Doors & Windows */}
        <Card
          className="p-4 space-y-3 cursor-pointer transition-all"
          onClick={() => setEditMode(!editMode)}
          style={{
            borderColor: editMode ? 'hsl(var(--primary))' : 'hsl(var(--border))',
            backgroundColor: editMode ? 'hsl(var(--primary) / 0.1)' : 'transparent',
          }}
        >
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

          <div className="grid grid-cols-3 gap-2 w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onAddRollup}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105 hover:border-accent"
              style={{ borderColor: 'hsl(var(--border))', height: '75px' }}
            >
              <DoorOpen className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] text-center text-muted-foreground">Rollup</span>
            </button>
            <button
              onClick={onAddPersonnel}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105 hover:border-accent"
              style={{ borderColor: 'hsl(var(--border))', height: '75px' }}
            >
              <RectangleVertical className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] text-center text-muted-foreground">Personnel</span>
            </button>
            <button
              onClick={onAddWindow}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105 hover:border-accent"
              style={{ borderColor: 'hsl(var(--border))', height: '75px' }}
            >
              <Square className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] text-center text-muted-foreground">Window</span>
            </button>
          </div>

          {/* Door/Window list when edit mode is on */}
          {editMode && (config.doors.length > 0 || config.windows.length > 0) && (
            <div className="space-y-2 mt-3 pt-3 border-t" style={{ borderColor: 'hsl(var(--border))' }} onClick={(e) => e.stopPropagation()}>
              {config.doors.map(door => (
                <div
                  key={door.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
                  onMouseEnter={() => onWallHover(door.wall)}
                  onMouseLeave={() => onWallHover(null)}
                >
                  <div className="flex-1">
                    <div className="text-xs font-medium capitalize">
                      {door.type === 'rollup' ? 'Rollup' : 'Personnel'} — {door.wall}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {door.width}' x {door.height}'
                    </div>
                  </div>
                  <Select
                    value={door.wall}
                    onValueChange={(wall: WallSide) => {
                      update({
                        doors: config.doors.map(d =>
                          d.id === door.id ? { ...d, wall } : d
                        ),
                      });
                    }}
                  >
                    <SelectTrigger className="w-20 h-7 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['front', 'back', 'left', 'right'] as WallSide[]).map(w => (
                        <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {door.type === 'rollup' && (
                    <Select
                      value={`${door.width}x${door.height}`}
                      onValueChange={(v) => {
                        const [w, h] = v.split('x').map(Number);
                        update({
                          doors: config.doors.map(d =>
                            d.id === door.id ? { ...d, width: w, height: h } : d
                          ),
                        });
                      }}
                    >
                      <SelectTrigger className="w-20 h-7 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLLUP_SIZES.map(s => (
                          <SelectItem key={s.label} value={`${s.width}x${s.height}`} className="text-xs">{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="w-24">
                    <Slider
                      value={[door.position]}
                      onValueChange={([v]) => {
                        update({
                          doors: config.doors.map(d =>
                            d.id === door.id ? { ...d, position: v } : d
                          ),
                        });
                      }}
                      min={1}
                      max={((door.wall === 'front' || door.wall === 'back') ? config.width : config.length) - door.width - 1}
                      step={0.5}
                    />
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeDoor(door.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}

              {config.windows.map(win => (
                <div
                  key={win.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
                  onMouseEnter={() => onWallHover(win.wall)}
                  onMouseLeave={() => onWallHover(null)}
                >
                  <div className="flex-1">
                    <div className="text-xs font-medium capitalize">Window — {win.wall}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {win.width}' x {win.height}'
                    </div>
                  </div>
                  <Select
                    value={win.wall}
                    onValueChange={(wall: WallSide) => {
                      update({
                        windows: config.windows.map(w =>
                          w.id === win.id ? { ...w, wall } : w
                        ),
                      });
                    }}
                  >
                    <SelectTrigger className="w-20 h-7 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['front', 'back', 'left', 'right'] as WallSide[]).map(w => (
                        <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="w-24">
                    <Slider
                      value={[win.position]}
                      onValueChange={([v]) => {
                        update({
                          windows: config.windows.map(w =>
                            w.id === win.id ? { ...w, position: v } : w
                          ),
                        });
                      }}
                      min={1}
                      max={((win.wall === 'front' || win.wall === 'back') ? config.width : config.length) - win.width - 1}
                      step={0.5}
                    />
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeWindow(win.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Colors */}
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Colors</h3>
          <Tabs value={colorTab} onValueChange={(v) => setColorTab(v as 'walls' | 'roof' | 'trim')}>
            <TabsList className="grid w-full grid-cols-3 mb-3 h-7">
              <TabsTrigger value="walls" className="text-xs h-5 py-0">Walls</TabsTrigger>
              <TabsTrigger value="roof" className="text-xs h-5 py-0">Roof</TabsTrigger>
              <TabsTrigger value="trim" className="text-xs h-5 py-0">Trim</TabsTrigger>
            </TabsList>

            {(['walls', 'roof', 'trim'] as const).map(tab => {
              const key = tab === 'walls' ? 'wallColor' : tab === 'roof' ? 'roofColor' : 'trimColor';
              return (
                <TabsContent key={tab} value={tab} className="mt-0">
                  <div className="grid grid-cols-6 gap-2">
                    {WALL_COLORS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => update({ [key]: c.value })}
                        className={`w-9 h-9 rounded-md border-2 transition-all ${
                          config[key] === c.value ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-border hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </Card>

        {/* Wall Enclosure */}
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Wall Enclosure</h3>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'fully-enclosed', label: 'Enclosed' },
              { value: 'fully-open', label: 'Open' },
              { value: 'gable-ends', label: 'Gable Ends' },
              { value: 'customize', label: 'Customize' },
            ] as Array<{ value: WallEnclosure; label: string }>).map(opt => (
              <Button
                key={opt.value}
                variant={(config.wallEnclosure || 'fully-enclosed') === opt.value ? 'default' : 'outline'}
                onClick={() => onChange(setWallEnclosure(config, opt.value))}
                className="w-full h-8 text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>
          {(config.wallEnclosure || 'fully-enclosed') === 'customize' && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              {(['front', 'back', 'left', 'right'] as WallSide[]).map(side => {
                const walls = config.customWalls || { front: true, back: true, left: true, right: true };
                return (
                  <Button
                    key={side}
                    variant={walls[side] ? 'default' : 'outline'}
                    onClick={() => onChange(toggleCustomWall(config, side))}
                    className="w-full h-7 text-xs capitalize"
                  >
                    {side}: {walls[side] ? 'ON' : 'OFF'}
                  </Button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Lean-Tos */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Lean-Tos</h3>
            <span className="text-xs text-muted-foreground">
              {(config.leanTos || []).length} added
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['enclosed', 'open', 'gable'] as LeanToType[]).map(type => (
              <Button
                key={type}
                onClick={() => onChange(addLeanTo(config, type, 'right'))}
                variant="outline"
                className="h-9 text-xs capitalize gap-1"
              >
                <Plus className="h-3 w-3" />
                {type}
              </Button>
            ))}
          </div>

          {(config.leanTos || []).length > 0 && (
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              {(config.leanTos || []).map(lt => (
                <div
                  key={lt.id}
                  className="p-2 rounded-md bg-muted/30 space-y-2"
                  onMouseEnter={() => onWallHover(lt.wall)}
                  onMouseLeave={() => onWallHover(null)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium capitalize flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      {lt.type} — {lt.wall}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => onChange(deleteLeanTo(config, lt.id))}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <Label className="text-[10px]">Wall</Label>
                      <Select value={lt.wall} onValueChange={(w: WallSide) => onChange(updateLeanTo(config, lt.id, { wall: w }))}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['front', 'back', 'left', 'right'] as WallSide[]).map(w => (
                            <SelectItem key={w} value={w} className="text-xs capitalize">{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Depth: {lt.width}'</Label>
                      <Slider
                        value={[lt.width]}
                        onValueChange={([v]) => onChange(updateLeanTo(config, lt.id, { width: v }))}
                        min={6} max={30} step={1}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Length: {lt.length}'</Label>
                      <Slider
                        value={[lt.length]}
                        onValueChange={([v]) => onChange(updateLeanTo(config, lt.id, { length: v }))}
                        min={10}
                        max={(lt.wall === 'front' || lt.wall === 'back') ? config.width : config.length}
                        step={1}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Position</Label>
                      <Slider
                        value={[lt.position]}
                        onValueChange={([v]) => onChange(updateLeanTo(config, lt.id, { position: v }))}
                        min={0.1} max={0.9} step={0.05}
                      />
                    </div>
                  </div>

                  {/* Advanced: wraparound for non-parented lean-tos */}
                  {!lt.parentId && (
                    <div className="pt-2 border-t space-y-2" style={{ borderColor: 'hsl(var(--border))' }}>
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-[10px]">Wraparound</Label>
                        <Select
                          value={lt.wraparound ? (lt.wraparoundCorner || 'right') : 'none'}
                          onValueChange={(v) => {
                            if (v === 'none') {
                              onChange(updateLeanTo(config, lt.id, { wraparound: false, wraparoundCorner: undefined }));
                            } else {
                              onChange(updateLeanTo(config, lt.id, { wraparound: true, wraparoundCorner: v as 'left' | 'right' | 'both' }));
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs">None</SelectItem>
                            <SelectItem value="left" className="text-xs">Left</SelectItem>
                            <SelectItem value="right" className="text-xs">Right</SelectItem>
                            <SelectItem value="both" className="text-xs">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {lt.type === 'gable' && (
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-[10px]">Ridge Along</Label>
                          <Select
                            value={lt.gableAttachmentSide || lt.wall}
                            onValueChange={(v: WallSide) => onChange(updateLeanTo(config, lt.id, { gableAttachmentSide: v }))}
                          >
                            <SelectTrigger className="h-7 text-xs w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="front" className="text-xs">Length</SelectItem>
                              <SelectItem value="left" className="text-xs">Depth</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Add child lean-to */}
                      <div className="flex gap-1">
                        <span className="text-[10px] text-muted-foreground self-center mr-auto">+ Attach child:</span>
                        {(['enclosed', 'open', 'gable'] as LeanToType[]).map(t => (
                          <Button
                            key={t}
                            size="sm"
                            variant="outline"
                            className="h-6 text-[9px] capitalize px-2"
                            onClick={() => onChange(addLeanTo(config, t, 'front', lt.id))}
                          >
                            {t}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {lt.parentId && (
                    <div className="pt-2 border-t text-[10px] text-muted-foreground" style={{ borderColor: 'hsl(var(--border))' }}>
                      ↳ Child of: {lt.parentId.slice(-6)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Price breakdown footer */}
      <div className="shrink-0 p-3 border-t text-xs space-y-1" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="flex justify-between"><span>Base ({(config.width * config.length).toLocaleString()} sf)</span><span>${pricing.baseCost.toLocaleString()}</span></div>
        {pricing.heightMultiplier > 0 && (
          <div className="flex justify-between"><span>Height adder</span><span>+${pricing.heightMultiplier.toLocaleString()}</span></div>
        )}
        {pricing.roofCost > 0 && (
          <div className="flex justify-between"><span>Roof ({config.roofStyle})</span><span>+${pricing.roofCost.toLocaleString()}</span></div>
        )}
        {pricing.doorsCost > 0 && (
          <div className="flex justify-between"><span>Doors ({config.doors.length})</span><span>+${pricing.doorsCost.toLocaleString()}</span></div>
        )}
        {pricing.windowsCost > 0 && (
          <div className="flex justify-between"><span>Windows ({config.windows.length})</span><span>+${pricing.windowsCost.toLocaleString()}</span></div>
        )}
        {pricing.leanTosCost > 0 && (
          <div className="flex justify-between"><span>Lean-Tos ({(config.leanTos || []).length})</span><span>+${pricing.leanTosCost.toLocaleString()}</span></div>
        )}
        <div className="flex justify-between font-semibold text-sm pt-1 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
          <span>Total</span>
          <span>${pricing.totalCost.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
