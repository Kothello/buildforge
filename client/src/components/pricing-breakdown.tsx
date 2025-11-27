import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DollarSign, TrendingUp } from "lucide-react";

interface BuildingConfig {
  width?: number;
  length?: number;
  height?: number;
  roofStyle?: string;
  roofPitch?: number;
  doors?: any[];
  windows?: any[];
  leanTos?: any[];
  wallEnclosure?: string;
  customWalls?: any;
}

interface PricingBreakdownProps {
  buildingSpecs?: {
    width?: number;
    length?: number;
    height?: number;
    roofStyle?: string;
  };
  configuration?: BuildingConfig;
  totalPrice?: string | number;
  cost?: number;
  price?: number;
  margin?: number;
}

export function PricingBreakdown({ 
  buildingSpecs, 
  configuration, 
  totalPrice: providedTotalPrice,
  cost, 
  price, 
  margin 
}: PricingBreakdownProps) {
  const specs = buildingSpecs || configuration || {};

  const displayWidth = (specs as any).width || 40;
  const displayLength = (specs as any).length || 60;
  const displayHeight = (specs as any).height || 14;
  const displayRoofStyle = (specs as any).roofStyle || "Gable";

  const displayPrice = providedTotalPrice 
    ? parseFloat(String(providedTotalPrice)) 
    : (price || 0);
  const displayCost = cost || (displayPrice * 0.65);
  const displayMargin = margin || (displayPrice > 0 ? ((displayPrice - displayCost) / displayPrice * 100) : 0);

  return (
    <Card className="border-card-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-primary" />
          Pricing Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Building Size</span>
            <span className="font-medium">{displayWidth}' x {displayLength}' x {displayHeight}'</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Roof Style</span>
            <span className="font-medium capitalize">{displayRoofStyle}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Steel Frame</span>
            <span>{displayPrice > 0 ? `$${Math.round(displayPrice * 0.45).toLocaleString()}` : '--'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Labor & Installation</span>
            <span>{displayPrice > 0 ? `$${Math.round(displayPrice * 0.20).toLocaleString()}` : '--'}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2 pt-1">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Cost</span>
            <span className="font-medium">
              {displayCost > 0 ? `$${displayCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '--'}
            </span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-semibold">Quote Total</span>
            <span className="font-bold text-primary">
              {displayPrice > 0 ? `$${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
            </span>
          </div>
          {displayPrice > 0 && displayMargin > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Margin</span>
              </div>
              <span className="text-sm font-bold text-emerald-400">
                {displayMargin.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
