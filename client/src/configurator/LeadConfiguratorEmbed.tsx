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
    mutationFn: async ({ config, buildingSpecs }: { 
      config: BuildingConfig; 
      buildingSpecs: BuildingSpecs; 
    }) => {
      const pricingResponse = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            width: config.width || 40,
            length: config.length || 60,
            height: config.height || 14,
            roofStyle: config.roofStyle || 'gable',
            roofPitch: config.roofPitch || 3,
            doors: config.doors || [],
            windows: config.windows || [],
            leanTos: config.leanTos || [],
            wallEnclosure: config.wallEnclosure || 'fully-enclosed',
            customWalls: config.customWalls,
          },
          region: 'midwest',
        }),
      });

      let totalPrice = '0';
      if (pricingResponse.ok) {
        const pricingData = await pricingResponse.json();
        if (pricingData?.total) {
          totalPrice = pricingData.total.toString();
        }
      }

      const payload = {
        buildingSpecs,
        configuration: config,
        totalPrice,
      };

      const response = await apiRequest('PATCH', `/api/leads/${lead.id}`, payload);
      return response.json();
    },
    onSuccess: (updatedLead) => {
      setIsSaving(false);
      
      queryClient.setQueryData(['lead', updatedLead.id], updatedLead);
      queryClient.setQueryData(['/api/leads'], (oldData: Lead[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((l: Lead) => l.id === updatedLead.id ? updatedLead : l);
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead', updatedLead.id] });
      
      toast({
        title: 'Success',
        description: 'Configuration saved',
      });
      onSave?.(updatedLead);
    },
    onError: () => {
      setIsSaving(false);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    },
  });

  const handleSave = (config: BuildingConfig, buildingSpecs: BuildingSpecs, _totalPrice: string) => {
    setIsSaving(true);
    updateMutation.mutate({ config, buildingSpecs });
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
