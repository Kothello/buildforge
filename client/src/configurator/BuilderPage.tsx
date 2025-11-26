import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, CheckCircle, AlertCircle } from 'lucide-react';
import type { Door, Window, LeanTo, BuildingConfig } from './types';
import { PricingDisplay } from './PricingDisplay';
import { Scene3D } from './Scene3D';

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
  
  // 3D viewer interaction state
  const [draggedDoorId, setDraggedDoorId] = useState<string | null>(null);
  const [draggedWindowId, setDraggedWindowId] = useState<string | null>(null);
  const [leanToDragPositions] = useState<Map<string, number>>(new Map());
  const [isDraggingLeanTo] = useState(false);
  
  // Lead capture form state
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
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

  const handleDoorMove = (doorId: string, newPosition: number) => {
    setDoors(prev => prev.map(d => d.id === doorId ? { ...d, position: newPosition } : d));
  };

  const handleWindowMove = (windowId: string, newPosition: number) => {
    setWindows(prev => prev.map(w => w.id === windowId ? { ...w, position: newPosition } : w));
  };

  const handleDoorClick = (doorId: string) => {
    toast({ title: 'Door Selected', description: `Door ${doorId} clicked` });
  };

  const handleWindowClick = (windowId: string) => {
    toast({ title: 'Window Selected', description: `Window ${windowId} clicked` });
  };

  const colorOptions = [
    { name: 'Slate Gray', value: '#6B7280' },
    { name: 'Red Iron', value: '#B8453C' },
    { name: 'Tan', value: '#C9B899' },
    { name: 'White', value: '#F3F4F6' },
    { name: 'Charcoal', value: '#374151' },
    { name: 'Black', value: '#1F2937' },
  ];

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactName || !companyName || !email) {
      setErrorMessage('Name, company, and email are required');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');
    setSuccessMessage('');

    try {
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
        contactName,
        companyName,
        email,
        phone: phone || null,
        source: 'builder',
        temperature: 'warm',
        stage: 'new',
        status: 'new',
        buildingSpecs,
        configuration: config,
        notes: notes || null,
        assignedTo: null,
      };

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit lead');
      }

      const lead = await response.json();
      
      setSuccessMessage(`Thanks, your design has been submitted. Your lead ID is ${lead.id}`);
      setSubmitStatus('success');
      
      // Clear form after successful submission
      setContactName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setNotes('');
      
      toast({
        title: 'Success',
        description: 'Your configuration has been submitted',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit lead';
      setErrorMessage(message);
      setSubmitStatus('error');
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background">
      {/* 3D Viewer */}
      <div className="flex-1 bg-slate-900">
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
          editMode={false}
          wallEnclosure={wallEnclosure}
          customWalls={customWalls}
          leanTos={leanTos}
          leanToEditMode={false}
          leanToDragPositions={leanToDragPositions}
          isDraggingLeanTo={isDraggingLeanTo}
          onLeanToMove={() => {}}
          highlightedWall={null}
          onWallClick={() => {}}
        />
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

        {/* Lead Capture Form */}
        {submitStatus !== 'success' && (
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Submit Your Design</h3>
            <form onSubmit={handleSubmitLead} className="space-y-3">
              <div>
                <Label htmlFor="contact-name" className="text-xs">
                  Name *
                </Label>
                <Input
                  id="contact-name"
                  data-testid="input-contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="company-name" className="text-xs">
                  Company *
                </Label>
                <Input
                  id="company-name"
                  data-testid="input-company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company name"
                  className="mt-1"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs">
                  Email *
                </Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="phone"
                  data-testid="input-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(optional)"
                  className="mt-1"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="notes" className="text-xs">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  data-testid="textarea-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details (optional)"
                  className="mt-1 resize-none"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
              
              {submitStatus === 'error' && errorMessage && (
                <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-md text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                data-testid="button-submit-lead"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Design'}
              </Button>
            </form>
          </Card>
        )}

        {/* Success State */}
        {submitStatus === 'success' && (
          <Card className="p-4 space-y-3 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-green-900 dark:text-green-100">
                  Submitted Successfully
                </h3>
                <p className="text-xs text-green-700 dark:text-green-200 mt-1">
                  {successMessage}
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setSubmitStatus('idle');
                setSuccessMessage('');
              }}
              variant="outline"
              className="w-full"
              data-testid="button-submit-another"
            >
              Submit Another Design
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
