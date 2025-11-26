import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Lead } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import BuilderPage, { type BuildingSpecs } from './BuilderPage';
import type { BuildingConfig } from './types';

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

  const handleSave = (config: BuildingConfig, buildingSpecs: BuildingSpecs, totalPrice: string) => {
    setIsSaving(true);
    updateMutation.mutate({ config, buildingSpecs, totalPrice });
  };

  return (
    <div className="h-full w-full">
      <BuilderPage
        initialConfig={initialConfig}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
