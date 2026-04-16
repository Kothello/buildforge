import { useState, lazy, Suspense, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Pencil, Save } from 'lucide-react';
import type { BuildingSpecs, BuildingConfig } from './BuilderPage';

const LazyBuilderPage = lazy(() => import('./BuilderPage'));

function ConfiguratorSkeleton({ isEditing }: { isEditing: boolean }) {
  return (
    <div className={`h-full w-full flex ${isEditing ? '' : 'items-center justify-center'} bg-muted/20`}>
      {isEditing ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading 3D configurator...</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading 3D view...</span>
        </div>
      )}
    </div>
  );
}

interface LeadConfiguratorEmbedProps {
  lead: Lead;
  leadId?: string;
  onLeadUpdated?: (updatedLead: Lead) => void;
  onSave?: (config: BuildingConfig, specs: BuildingSpecs, totalPrice: string) => void;
}

export function LeadConfiguratorEmbed({ lead, leadId, onLeadUpdated, onSave: onSaveProp }: LeadConfiguratorEmbedProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTotalPrice, setCurrentTotalPrice] = useState<string>(lead.totalPrice || '0');
  const { toast } = useToast();
  const saveRef = useRef<(() => void) | null>(null);

  const initialConfig = (lead.configuration as BuildingConfig) || undefined;
  const resolvedLeadId = leadId || String(lead.id);

  const updateMutation = useMutation({
    mutationFn: async ({ config, buildingSpecs, totalPrice }: {
      config: BuildingConfig;
      buildingSpecs: BuildingSpecs;
      totalPrice: string;
    }) => {
      const response = await apiRequest('PATCH', `/api/leads/${lead.id}`, {
        buildingSpecs,
        configuration: config,
        totalPrice,
      });
      return response.json();
    },
    onSuccess: async (updatedLead: Lead) => {
      setIsSaving(false);

      queryClient.invalidateQueries({ queryKey: ['/api/leads', resolvedLeadId, 'quotes'] });

      queryClient.setQueryData<Lead>(
        ['/api/leads', resolvedLeadId],
        updatedLead
      );

      queryClient.setQueryData<Lead[]>(
        ['/api/leads'],
        (old) => old ? old.map((l) => (l.id === updatedLead.id ? updatedLead : l)) : [updatedLead]
      );

      toast({ title: 'Saved', description: 'Configuration updated successfully' });
      onLeadUpdated?.(updatedLead);
      setIsEditing(false);
    },
    onError: (error) => {
      setIsSaving(false);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    },
  });

  const handleSave = (config: BuildingConfig, buildingSpecs: BuildingSpecs, totalPrice: string) => {
    if (onSaveProp) {
      onSaveProp(config, buildingSpecs, totalPrice);
      return;
    }
    setIsSaving(true);
    updateMutation.mutate({ config, buildingSpecs, totalPrice });
  };

  return (
    <div className="h-full w-full relative flex flex-col">
      {!isEditing && (
        <div className="absolute top-4 right-4 z-50">
          <Button
            onClick={() => setIsEditing(true)}
            className="gap-2 shadow-lg"
            data-testid="button-edit-building"
          >
            <Pencil className="h-4 w-4" />
            Edit Building
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={<ConfiguratorSkeleton isEditing={isEditing} />}>
          <LazyBuilderPage
            initialConfig={initialConfig}
            onSave={handleSave}
            isSaving={isSaving}
            showEditPanel={isEditing}
            saveRef={saveRef}
            onTotalChange={setCurrentTotalPrice}
          />
        </Suspense>
      </div>
      {isEditing && (
        <div className="shrink-0 border-t space-y-3 p-4 bg-background" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estimated Total</p>
            <p className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
              ${parseFloat(currentTotalPrice || '0').toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <Button
            onClick={() => saveRef.current?.()}
            disabled={isSaving}
            className="w-full gap-2"
            data-testid="button-save-configuration"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
}
