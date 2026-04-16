import { useState, useEffect, useRef, useCallback } from 'react';
import Scene3D from './Scene3D';
import ConfigPanel from './ConfigPanel';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Send, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import type { BuildingConfig, WallSide } from './types';
import { DEFAULT_CONFIG, ROLLUP_SIZES } from './types';
import { calculatePricing } from './pricing';
import {
  pickVisibleWall, addDoor, addWindow, moveDoor, moveWindow,
  deleteDoor, deleteWindow, resizeDoor,
} from './placement';

export type { BuildingConfig };

export interface BuildingSpecs {
  width: number;
  length: number;
  height: number;
  roofStyle: string;
  roofPitch: number;
  wallColor: string;
  roofColor: string;
  trimColor: string;
  doorsCount: number;
  windowsCount: number;
}

export interface BuilderPageProps {
  initialConfig?: BuildingConfig;
  onSave?: (config: BuildingConfig, buildingSpecs: BuildingSpecs, totalPrice: string) => void;
  isSaving?: boolean;
  showEditPanel?: boolean;
  saveRef?: React.MutableRefObject<(() => void) | null>;
  onTotalChange?: (totalPrice: string) => void;
  mode?: 'public' | 'crm';
}

function configToSpecs(config: BuildingConfig): BuildingSpecs {
  return {
    width: config.width,
    length: config.length,
    height: config.height,
    roofStyle: config.roofStyle,
    roofPitch: config.roofPitch,
    wallColor: config.wallColor,
    roofColor: config.roofColor,
    trimColor: config.trimColor,
    doorsCount: config.doors.length,
    windowsCount: config.windows.length,
  };
}

const BuilderPage = ({
  initialConfig,
  onSave,
  isSaving,
  showEditPanel = true,
  saveRef,
  onTotalChange,
  mode = 'public',
}: BuilderPageProps = {}) => {
  const [config, setConfig] = useState<BuildingConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  }));
  const [highlightedWall, setHighlightedWall] = useState<WallSide | null>(null);
  const [cameraPos, setCameraPos] = useState<{ x: number; y: number; z: number } | null>(null);
  const [selectedDoorId, setSelectedDoorId] = useState<string | null>(null);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [draggedDoorId, setDraggedDoorId] = useState<string | null>(null);
  const [draggedWindowId, setDraggedWindowId] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    name: '', company: '', email: '', phone: '', notes: '',
  });

  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const pricing = calculatePricing(config);

  useEffect(() => {
    onTotalChange?.(String(pricing.totalCost));
  }, [pricing.totalCost, onTotalChange]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(config, configToSpecs(config), String(pricing.totalCost));
    }
  }, [config, pricing.totalCost, onSave]);

  useEffect(() => {
    if (saveRef) saveRef.current = handleSave;
  }, [handleSave, saveRef]);

  // Update highlighted wall based on camera position
  useEffect(() => {
    if (cameraPos) {
      setHighlightedWall(pickVisibleWall(cameraPos));
    }
  }, [cameraPos]);

  // Camera-aware add handlers
  const handleAddRollup = useCallback(() => {
    const result = addDoor(config, 'rollup', cameraPos);
    if ('error' in result) {
      toast({ title: 'Cannot add door', description: result.error, variant: 'destructive' });
    } else {
      setConfig(result);
    }
  }, [config, cameraPos, toast]);

  const handleAddPersonnel = useCallback(() => {
    const result = addDoor(config, 'personnel', cameraPos);
    if ('error' in result) {
      toast({ title: 'Cannot add door', description: result.error, variant: 'destructive' });
    } else {
      setConfig(result);
    }
  }, [config, cameraPos, toast]);

  const handleAddWindow = useCallback(() => {
    const result = addWindow(config, cameraPos);
    if ('error' in result) {
      toast({ title: 'Cannot add window', description: result.error, variant: 'destructive' });
    } else {
      setConfig(result);
    }
  }, [config, cameraPos, toast]);

  // Click to select (opens edit dialog)
  const handleDoorClick = useCallback((doorId: string) => {
    setSelectedDoorId(doorId);
    setSelectedWindowId(null);
  }, []);

  const handleWindowClick = useCallback((winId: string) => {
    setSelectedWindowId(winId);
    setSelectedDoorId(null);
  }, []);

  // Drag handlers
  const handleDoorMove = useCallback((doorId: string, newPosition: number) => {
    setConfig(prev => moveDoor(prev, doorId, newPosition));
  }, []);

  const handleWindowMove = useCallback((winId: string, newPosition: number) => {
    setConfig(prev => moveWindow(prev, winId, newPosition));
  }, []);

  const handleDragStart = useCallback((type: 'door' | 'window', id: string) => {
    if (type === 'door') setDraggedDoorId(id);
    else setDraggedWindowId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedDoorId(null);
    setDraggedWindowId(null);
  }, []);

  // Edit dialog actions
  const selectedDoor = config.doors.find(d => d.id === selectedDoorId);
  const selectedWindow = config.windows.find(w => w.id === selectedWindowId);

  const handleDeleteSelected = () => {
    if (selectedDoorId) {
      setConfig(prev => deleteDoor(prev, selectedDoorId));
      setSelectedDoorId(null);
    } else if (selectedWindowId) {
      setConfig(prev => deleteWindow(prev, selectedWindowId));
      setSelectedWindowId(null);
    }
  };

  const handleResizeDoor = (width: number, height: number) => {
    if (!selectedDoorId) return;
    setConfig(prev => resizeDoor(prev, selectedDoorId, width, height));
    setSelectedDoorId(null);
  };

  const handlePublicSubmit = async () => {
    if (!submitForm.name || !submitForm.email || !submitForm.phone) {
      toast({
        title: 'Missing info',
        description: 'Please fill in your name, email, and phone.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', '/api/leads', {
        name: submitForm.name,
        company: submitForm.company,
        email: submitForm.email,
        phone: submitForm.phone,
        notes: submitForm.notes,
        source: 'website_configurator',
        buildingSpecs: configToSpecs(config),
        configuration: config,
        totalPrice: String(pricing.totalCost),
      });

      const lead = await response.json();
      toast({ title: 'Quote request submitted!', description: "We'll be in touch within 24 hours." });
      setShowSubmitDialog(false);

      if (mode === 'crm') {
        setLocation(`/sales/leads/${lead.id}`);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to submit. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(var(--background))' }}>
      <div className="flex flex-col md:flex-row lg:flex-row m-0 p-0 h-screen">
        <div className="flex-1 min-h-[600px] z-10 w-full md:w-[62%] lg:w-[62%] px-3 py-2 overflow-hidden relative" style={{ background: 'hsl(var(--background))' }}>
          <Scene3D
            config={config}
            highlightedWall={highlightedWall}
            onCameraChange={setCameraPos}
            onDoorClick={handleDoorClick}
            onWindowClick={handleWindowClick}
            onDoorMove={handleDoorMove}
            onWindowMove={handleWindowMove}
            draggedDoorId={draggedDoorId}
            draggedWindowId={draggedWindowId}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />

          {/* Dimension overlay */}
          <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-sm z-10">
            <span className="font-semibold">{config.width}' × {config.length}' × {config.height}'</span>
            <span className="text-muted-foreground ml-2">|</span>
            <span className="ml-2 capitalize">{config.roofStyle}</span>
            <span className="text-muted-foreground ml-2">|</span>
            <span className="ml-2 font-semibold">${pricing.totalCost.toLocaleString()}</span>
            {highlightedWall && (
              <>
                <span className="text-muted-foreground ml-2">|</span>
                <span className="ml-2 text-primary text-xs">Facing: {highlightedWall}</span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="absolute bottom-4 left-4 flex gap-2 z-10">
            {onSave && (
              <Button onClick={handleSave} disabled={isSaving} className="gap-2 shadow-lg">
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
            {!onSave && (
              <Button onClick={() => setShowSubmitDialog(true)} className="gap-2 shadow-lg">
                <Send className="h-4 w-4" />
                Get a Quote
              </Button>
            )}
          </div>
        </div>

        {showEditPanel && (
          <ConfigPanel
            config={config}
            onChange={setConfig}
            onWallHover={setHighlightedWall}
            onAddRollup={handleAddRollup}
            onAddPersonnel={handleAddPersonnel}
            onAddWindow={handleAddWindow}
          />
        )}
      </div>

      {/* Door edit dialog */}
      <Dialog open={!!selectedDoor} onOpenChange={() => setSelectedDoorId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDoor?.type === 'rollup' ? 'Rollup Door' : 'Personnel Door'} — {selectedDoor?.wall} wall
            </DialogTitle>
          </DialogHeader>
          {selectedDoor?.type === 'rollup' && (
            <div className="space-y-2">
              <Label>Size</Label>
              <div className="grid grid-cols-3 gap-2">
                {ROLLUP_SIZES.map(size => (
                  <Button
                    key={size.label}
                    variant={selectedDoor.width === size.width && selectedDoor.height === size.height ? 'default' : 'outline'}
                    onClick={() => handleResizeDoor(size.width, size.height)}
                    className="text-xs"
                  >
                    {size.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <Button variant="destructive" onClick={handleDeleteSelected} className="gap-2">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </DialogContent>
      </Dialog>

      {/* Window edit dialog */}
      <Dialog open={!!selectedWindow} onOpenChange={() => setSelectedWindowId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Window — {selectedWindow?.wall} wall</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            {selectedWindow?.width}' × {selectedWindow?.height}' at position {selectedWindow?.position.toFixed(1)}'
          </div>
          <Button variant="destructive" onClick={handleDeleteSelected} className="gap-2">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </DialogContent>
      </Dialog>

      {/* Public submit dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Get Your Free Quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="font-medium">{config.width}' × {config.length}' Steel Building</div>
              <div className="text-muted-foreground">
                {(config.width * config.length).toLocaleString()} sq ft &middot; {config.roofStyle} roof
                &middot; {config.doors.length} doors &middot; {config.windows.length} windows
              </div>
              <div className="font-semibold mt-1">Estimated: ${pricing.totalCost.toLocaleString()}</div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input value={submitForm.name} onChange={e => setSubmitForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={submitForm.company} onChange={e => setSubmitForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={submitForm.email} onChange={e => setSubmitForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input type="tel" value={submitForm.phone} onChange={e => setSubmitForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={submitForm.notes} onChange={e => setSubmitForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
              </div>
            </div>
            <Button onClick={handlePublicSubmit} disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Submitting...' : 'Submit Quote Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuilderPage;
