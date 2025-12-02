import { useState, lazy, Suspense, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Pencil, Save } from 'lucide-react';
import type { BuildingSpecs } from './BuilderPage';
import type { BuildingConfig } from './types';

const LazyBuilderPage = lazy(() => import('./BuilderPage'));

function ConfiguratorSkeleton({ isEditing }: { isEditing: boolean }) {
  if (!isEditing) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading 3D view...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full w-full flex">
      <div className="flex-1 bg-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading 3D view...</span>
        </div>
      </div>
      <div className="w-80 border-l border-border p-4 space-y-4">
        <div className="h-12 bg-muted/50 rounded-lg animate-pulse" />
        <div className="h-8 bg-muted/30 rounded animate-pulse" />
        <div className="space-y-3">
          <div className="h-10 bg-muted/40 rounded animate-pulse" />
          <div className="h-10 bg-muted/40 rounded animate-pulse" />
          <div className="h-10 bg-muted/40 rounded animate-pulse" />
        </div>
        <div className="h-8 bg-muted/30 rounded animate-pulse mt-6" />
        <div className="space-y-3">
          <div className="h-10 bg-muted/40 rounded animate-pulse" />
          <div className="h-10 bg-muted/40 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

interface LeadConfiguratorEmbedProps {
  lead: Lead;
  leadId: string;
  onLeadUpdated?: (updatedLead: Lead) => void;
}

export function LeadConfiguratorEmbed({ lead, leadId, onLeadUpdated }: LeadConfiguratorEmbedProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTotalPrice, setCurrentTotalPrice] = useState<string>(lead.totalPrice || '0');
  const { toast } = useToast();
  const saveRef = useRef<(() => void) | null>(null);
  
  const initialConfig = (lead.configuration as BuildingConfig) || undefined;

  const updateMutation = useMutation({
    mutationFn: async ({ config, buildingSpecs, totalPrice }: { 
      config: BuildingConfig; 
      buildingSpecs: BuildingSpecs; 
      totalPrice: string;
    }) => {
      if (!lead.id) {
        throw new Error('Lead ID is required');
      }
      
      const payload = {
        buildingSpecs,
        configuration: config,
        totalPrice,
      };

      const response = await apiRequest('PATCH', `/api/leads/${lead.id}`, payload);
      const data = await response.json();
      console.log('[LeadConfiguratorEmbed] PATCH response:', data);
      console.log('[LeadConfiguratorEmbed] updatedLead.totalPrice:', data.totalPrice);
      return data;
    },
    onSuccess: async (updatedLead: Lead) => {
      console.log('[LeadConfiguratorEmbed] onSuccess called with:', updatedLead);
      console.log('[LeadConfiguratorEmbed] Cache key for detail:', ["/api/leads", leadId]);
      
      // Create a quote snapshot after successful lead update
      try {
        await apiRequest('POST', `/api/leads/${leadId}/quotes`, {
          buildingSpecs: updatedLead.buildingSpecs,
          configuration: updatedLead.configuration,
          totalPrice: updatedLead.totalPrice,
          marginPercent: null,
          source: 'crm',
        });
        
        // Invalidate quote history cache to refetch latest
        queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "quotes"] });
      } catch (quoteError) {
        console.error('Failed to create quote snapshot:', quoteError);
        // Don't fail the mutation if quote creation fails
      }
      
      setIsSaving(false);
      
      // Update individual lead query cache (used by lead detail page)
      queryClient.setQueryData<Lead>(
        ["/api/leads", leadId],
        updatedLead
      );
      
      // Update leads list query cache (used by /sales My Leads page)
      queryClient.setQueryData<Lead[]>(
        ["/api/leads"],
        (old) => {
          console.log('[LeadConfiguratorEmbed] Updating list cache. Old leads count:', old?.length);
          return old ? old.map((l) => (l.id === updatedLead.id ? updatedLead : l)) : [updatedLead];
        }
      );
      
      toast({
        title: 'Saved',
        description: 'Configuration updated successfully',
      });
      
      // Notify parent component of the update
      onLeadUpdated?.(updatedLead);
      
      // Exit edit mode after successful save
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
    setIsSaving(true);
    updateMutation.mutate({ config, buildingSpecs, totalPrice });
  };

  const triggerSave = () => {
    if (saveRef.current) {
      saveRef.current();
    }
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
            onClick={triggerSave}
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
