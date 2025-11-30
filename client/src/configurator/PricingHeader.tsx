import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Download, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { BuildingConfig } from './pricingTypes';

interface PricingHeaderProps {
  config: BuildingConfig;
  region?: string;
  onTotalChange?: (total: string) => void;
}

export function PricingHeader({ config, region = 'midwest', onTotalChange }: PricingHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pricing, setPricing] = useState<any>(null);
  const [promoCode, setPromoCode] = useState('');
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Calculate pricing when config changes
  useEffect(() => {
    calculatePricing();
  }, [config, region]);

  async function calculatePricing() {
    try {
      setLoading(true);
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, region })
      });

      if (!response.ok) throw new Error('Pricing calculation failed');
      const data = await response.json();
      setPricing(data);
      if (data?.total && onTotalChange) {
        onTotalChange(data.total.toString());
      }
    } catch (error) {
      console.error('Pricing error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function applyPromoCode() {
    if (!promoCode.trim()) return;

    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, region, promoCode })
      });

      if (!response.ok) throw new Error('Failed to apply promo code');
      const data = await response.json();
      setPricing(data);

      if (data.promoCodeApplied) {
        toast({
          title: 'Success',
          description: `Promo code applied! Saved $${data.promoDiscount.toFixed(2)}`
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply promo code',
        variant: 'destructive'
      });
    }
  }

  if (!pricing) {
    return null;
  }

  // Group breakdown by category
  const categories = new Map<string, any[]>();
  pricing.breakdown.forEach((item: any) => {
    if (!categories.has(item.category)) {
      categories.set(item.category, []);
    }
    categories.get(item.category)!.push(item);
  });

  return (
    <div className="w-full space-y-2" data-testid="pricing-header">
      {/* Compact Header - Always Visible */}
      <Card
        className="p-3 cursor-pointer hover-elevate bg-secondary/50 border-secondary"
        onClick={() => !locked && setIsExpanded(!isExpanded)}
        data-testid="pricing-header-summary"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-secondary-foreground">Quote Total</p>
            <p className="text-2xl font-bold text-primary">
              {pricing.total.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="p-1"
              onClick={(e) => e.stopPropagation()}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </Card>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <Card className="p-4 border-secondary space-y-3" data-testid="pricing-breakdown">
          {/* Promo Code Section */}
          <div className="flex gap-2 pb-3 border-b">
            <Input
              placeholder="Enter promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              disabled={locked}
              className="text-sm"
              data-testid="input-promo-code"
            />
            <Button
              onClick={applyPromoCode}
              disabled={locked}
              variant="outline"
              size="sm"
              className="px-2"
              data-testid="button-apply-promo"
            >
              <Tag className="w-4 h-4" />
            </Button>
          </div>

          {pricing.promoCodeApplied && (
            <p className="text-sm text-green-600 dark:text-green-400" data-testid="text-promo-applied">
              ✓ Promo {pricing.promoCodeApplied} applied (-${pricing.promoDiscount.toFixed(2)})
            </p>
          )}

          {/* Line Items */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Array.from(categories.entries()).map(([category, items]) => (
              <div key={category} className="space-y-1" data-testid={`category-${category}`}>
                <div className="flex justify-between text-xs font-semibold text-secondary-foreground px-1">
                  <span className="capitalize">{category.replace('_', ' ')}</span>
                  <span>
                    ${items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                  </span>
                </div>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-xs px-2 py-1 bg-background rounded"
                    data-testid={`item-${item.id}`}
                  >
                    <span className="text-tertiary-foreground truncate">{item.name}</span>
                    <span className="font-medium">${item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Summary Totals */}
          <div className="space-y-1 text-sm border-t pt-3">
            <div className="flex justify-between">
              <span className="text-secondary-foreground">Subtotal:</span>
              <span className="font-semibold">
                ${pricing.subtotal.toFixed(2)}
              </span>
            </div>
            {pricing.steelSurcharge > 0 && (
              <div className="flex justify-between">
                <span className="text-secondary-foreground">Steel Surcharge:</span>
                <span className="font-semibold">
                  ${pricing.steelSurcharge.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-secondary-foreground">Freight:</span>
              <span className="font-semibold">
                ${pricing.freightEstimate.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span className="text-secondary-foreground">Tax:</span>
              <span className="font-semibold">
                ${pricing.taxes.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-bold text-primary">
              <span>Total:</span>
              <span>
                {pricing.total.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD'
                })}
              </span>
            </div>
          </div>

          {/* Download Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            data-testid="button-download-quote"
          >
            <Download className="w-3 h-3 mr-2" />
            Download Quote
          </Button>
        </Card>
      )}
    </div>
  );
}
