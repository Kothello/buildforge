import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DollarSign, TrendingUp, Loader2 } from "lucide-react";

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
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  const specs = buildingSpecs || configuration || {};
  const hasConfig = configuration && configuration.width && configuration.length;
  
  const configKey = useMemo(() => {
    if (!configuration) return '';
    return JSON.stringify({
      width: configuration.width,
      length: configuration.length,
      height: configuration.height,
      roofStyle: configuration.roofStyle,
      doorsCount: configuration.doors?.length || 0,
      windowsCount: configuration.windows?.length || 0,
      leanTosCount: configuration.leanTos?.length || 0,
    });
  }, [configuration]);

  useEffect(() => {
    if (configKey && !hasFetched.current) {
      hasFetched.current = true;
      calculatePricing();
    }
  }, [configKey]);

  async function calculatePricing() {
    if (!configuration) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          config: {
            width: configuration.width || 40,
            length: configuration.length || 60,
            height: configuration.height || 14,
            roofStyle: configuration.roofStyle || 'gable',
            roofPitch: configuration.roofPitch || 3,
            doors: configuration.doors || [],
            windows: configuration.windows || [],
            leanTos: configuration.leanTos || [],
            wallEnclosure: configuration.wallEnclosure || 'fully-enclosed',
            customWalls: configuration.customWalls,
          }, 
          region: 'midwest' 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPricing(data);
      }
    } catch (error) {
      console.error('Pricing calculation failed:', error);
    } finally {
      setLoading(false);
    }
  }

  const displayWidth = (specs as any).width || 40;
  const displayLength = (specs as any).length || 60;
  const displayHeight = (specs as any).height || 14;
  const displayRoofStyle = (specs as any).roofStyle || "Gable";

  const displayPrice = pricing?.total || (providedTotalPrice ? parseFloat(String(providedTotalPrice)) : null) || price || 0;
  const displayCost = pricing?.costTotal || cost || (displayPrice * 0.65);
  const displayMargin = pricing?.marginPercent || margin || ((displayPrice - displayCost) / displayPrice * 100) || 0;

  const categories: string[] = pricing?.breakdown ? 
    Array.from(new Map(pricing.breakdown.map((item: any) => [item.category, item.category])).values()) as string[] : [];

  const getCategoryTotal = (category: string) => {
    if (!pricing?.breakdown) return 0;
    return pricing.breakdown
      .filter((item: any) => item.category === category)
      .reduce((sum: number, item: any) => sum + (item.price || 0), 0);
  };

  const categoryLabels: Record<string, string> = {
    structure: 'Steel Frame',
    roof: 'Roof System',
    doors: 'Doors & Openings',
    windows: 'Windows',
    lean_to: 'Lean-Tos',
    labor: 'Labor & Installation',
    insulation: 'Insulation',
    cladding: 'Cladding',
    trim: 'Trim & Gutters',
    ventilation: 'Ventilation',
    openings: 'Skylights',
    upgrades: 'Upgrades',
    customization: 'Customization',
  };

  return (
    <Card className="border-card-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-primary" />
          Pricing Breakdown
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
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
          {pricing?.breakdown && categories.length > 0 ? (
            categories
              .filter((cat: string) => getCategoryTotal(cat) > 0)
              .slice(0, 5)
              .map((category: string) => (
                <div key={category} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{categoryLabels[category] || category}</span>
                  <span>${getCategoryTotal(category).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              ))
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Steel Frame</span>
                <span>--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Roof Panels</span>
                <span>--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Wall Panels</span>
                <span>--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Labor & Installation</span>
                <span>--</span>
              </div>
            </>
          )}
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
              {displayPrice > 0 ? `$${displayPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '--'}
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
