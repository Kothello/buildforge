import { lazy, Suspense } from 'react';
import type { BuildingConfig } from '@/configurator/types';
import { DEFAULT_CONFIG } from '@/configurator/types';

const Scene3D = lazy(() => import('@/configurator/Scene3D'));

interface BuildingViewer3DProps {
  buildingSpecs?: {
    width?: number;
    length?: number;
    height?: number;
    roofStyle?: string;
    color?: string;
  };
  configuration?: BuildingConfig;
  onScreenshot?: (dataUrl: string) => void;
}

export function BuildingViewer3D({ buildingSpecs, configuration }: BuildingViewer3DProps) {
  const config: BuildingConfig = configuration || {
    ...DEFAULT_CONFIG,
    width: buildingSpecs?.width ?? 40,
    length: buildingSpecs?.length ?? 60,
    height: buildingSpecs?.height ?? 14,
    roofStyle: (buildingSpecs?.roofStyle?.toLowerCase() === 'single-slope' ? 'single-slope' : 'gable') as 'gable' | 'single-slope',
    wallColor: buildingSpecs?.color ?? DEFAULT_CONFIG.wallColor,
  };

  return (
    <div className="h-full w-full" data-testid="viewer-3d-canvas">
      <Suspense fallback={
        <div className="h-full w-full flex items-center justify-center bg-muted/20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading 3D view...</span>
          </div>
        </div>
      }>
        <Scene3D config={config} />
      </Suspense>
    </div>
  );
}
