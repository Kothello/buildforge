import { useState, lazy, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import type { BuildingSpecs } from './BuilderPage';
import type { BuildingConfig } from './types';

const LazyBuilderPage = lazy(() => import('./BuilderPage'));

function ConfiguratorSkeleton() {
  return (
    <div className="h-full w-full flex">
      <div className="w-80 border-r border-border p-4 space-y-4">
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
      <div className="flex-1 bg-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading 3D view...</span>
        </div>
      </div>
    </div>
  );
}

interface LeadConfiguratorEmbedProps {
  lead: Lead;
  onSave?: (updatedLead: Lead) => void;
}

export function LeadConfiguratorEmbed({ lead, onSave }: LeadConfiguratorEmbedProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
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
      return response.json();
    },
    onSuccess: async (updatedLead) => {
      setIsSaving(false);
      
      queryClient.setQueryData(["/api/leads", lead.id], updatedLead);
      
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      
      toast({
        title: 'Saved',
        description: 'Configuration updated successfully',
      });
      
      onSave?.(updatedLead);
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

  return (
    <div className="h-full w-full">
      <Suspense fallback={<ConfiguratorSkeleton />}>
        <LazyBuilderPage
          initialConfig={initialConfig}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </Suspense>
    </div>
  );
}
