import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import confetti from "canvas-confetti";

interface BuildingViewer3DProps {
  buildingSpecs?: {
    width?: number;
    length?: number;
    height?: number;
    roofStyle?: string;
    color?: string;
  };
  onScreenshot?: (dataUrl: string) => void;
}

export function BuildingViewer3D({ buildingSpecs, onScreenshot }: BuildingViewer3DProps) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);

  const handleScreenshot = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
    
    const mockDataUrl = "screenshot-" + Date.now();
    onScreenshot?.(mockDataUrl);
  };

  const specs = buildingSpecs || { width: 40, length: 60, height: 14, roofStyle: "Gable", color: "Gray" };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="text-sm text-muted-foreground">
          {specs.width}' × {specs.length}' × {specs.height}' | {specs.roofStyle} | {specs.color}
        </div>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            data-testid="button-zoom-out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            data-testid="button-zoom-in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setRotation(0)}
            data-testid="button-reset-rotation"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="default"
            onClick={handleScreenshot}
            data-testid="button-screenshot"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div 
        className="flex-1 relative bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseMove={(e) => {
          if (e.buttons === 1) {
            setRotation((prev) => prev + e.movementX * 0.5);
          }
        }}
        data-testid="viewer-3d-canvas"
      >
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            transform: `scale(${zoom}) perspective(1000px) rotateY(${rotation}deg)`,
            transition: "transform 0.1s ease-out"
          }}
        >
          <Card className="w-64 h-48 bg-gradient-to-br from-slate-600 to-slate-700 border-slate-500 shadow-2xl shadow-blue-500/20">
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-6xl">🏢</div>
                <div className="text-sm text-slate-300 font-medium">
                  {specs.width}' × {specs.length}'
                </div>
                <div className="text-xs text-slate-400">{specs.roofStyle} Roof</div>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-md">
          Drag to rotate • Scroll to zoom
        </div>
      </div>
    </div>
  );
}
