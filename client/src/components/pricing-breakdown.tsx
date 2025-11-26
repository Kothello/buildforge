import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DollarSign, TrendingUp } from "lucide-react";

interface PricingBreakdownProps {
  buildingSpecs?: {
    width?: number;
    length?: number;
    height?: number;
    roofStyle?: string;
  };
  cost?: number;
  price?: number;
  margin?: number;
}

export function PricingBreakdown({ buildingSpecs, cost, price, margin }: PricingBreakdownProps) {
  const specs = buildingSpecs || {};
  const displayCost = cost || 28500;
  const displayPrice = price || 42000;
  const displayMargin = margin || ((displayPrice - displayCost) / displayPrice * 100);

  const lineItems = [
    { label: "Steel Frame", value: "$12,500" },
    { label: "Roof Panels", value: "$8,200" },
    { label: "Wall Panels", value: "$5,300" },
    { label: "Labor & Installation", value: "$2,500" },
  ];

  return (
    <Card className="border-card-border bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Pricing Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Building Size</span>
            <span className="font-medium">{specs.width || 40}' × {specs.length || 60}' × {specs.height || 14}'</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Roof Style</span>
            <span className="font-medium">{specs.roofStyle || "Gable"}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          {lineItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-3 pt-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Cost</span>
            <span className="font-medium">${displayCost.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-semibold">Client Price</span>
            <span className="font-bold text-primary">${displayPrice.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Margin</span>
            </div>
            <span className="text-lg font-bold text-emerald-400">
              {displayMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
