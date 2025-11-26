import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Lock, Tag, Download } from 'lucide-react';
import type { BuildingConfig } from '../lib/pricingTypes';

interface PricingDisplayProps {
  config: BuildingConfig;
  region?: string;
  onPricingUpdate?: (pricing: any) => void;
  showAdmin?: boolean;
}

/**
 * Pricing Display Component
 * Shows real-time pricing breakdown and quote details
 */
export function PricingDisplay({
  config,
  region = 'default',
  onPricingUpdate,
  showAdmin = false
}: PricingDisplayProps) {
  const [pricing, setPricing] = useState<any>(null);
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [locked, setLocked] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Calculate pricing when config changes
  useMemo(() => {
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
      onPricingUpdate?.(data);
    } catch (error) {
      toast({
        title: 'Pricing Error',
        description: 'Failed to calculate price',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function applyPromoCode() {
    if (!promoCode.trim()) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a promo code'
      });
      return;
    }

    try {
      setIsApplyingPromo(true);
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, region, promoCode })
      });

      if (!response.ok) throw new Error('Promo code application failed');

      const data = await response.json();
      setPricing(data);

      if (data.promoCodeApplied) {
        toast({
          title: 'Success',
          description: `Promo code applied! Saved $${data.promoDiscount.toFixed(2)}`
        });
      } else {
        toast({
          title: 'Invalid Code',
          description: 'Promo code not found or expired'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply promo code',
        variant: 'destructive'
      });
    } finally {
      setIsApplyingPromo(false);
    }
  }

  async function downloadQuote() {
    try {
      const response = await fetch('/api/pricing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, region, promoCode })
      });

      if (!response.ok) throw new Error('Failed to generate quote');

      const quote = await response.json();

      // Create downloadable quote (JSON for now, could be PDF in future)
      const element = document.createElement('a');
      element.setAttribute('href', `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(quote, null, 2))}`);
      element.setAttribute('download', `quote-${quote.quoteNumber}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast({
        title: 'Quote Downloaded',
        description: `Quote ${quote.quoteNumber} downloaded successfully`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download quote',
        variant: 'destructive'
      });
    }
  }

  if (loading || !pricing) {
    return <div className="p-4 text-center text-secondary-foreground">Calculating pricing...</div>;
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
    <div className="w-full max-w-2xl space-y-4" data-testid="pricing-display">
      {/* Header */}
      <Card className="p-4 bg-secondary/50 border-secondary" data-testid="pricing-header">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-secondary-foreground">Building Summary</p>
            <p className="font-semibold">
              {config.width}' W × {config.length}' L × {config.height}' H | {config.roofStyle}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-secondary-foreground">Roof Area</p>
            <p className="font-semibold">{pricing.roofArea.toFixed(0)} sqft</p>
          </div>
        </div>
      </Card>

      {/* Promo Code Input */}
      <Card className="p-4 border-secondary" data-testid="promo-input">
        <div className="flex gap-2">
          <Input
            placeholder="Enter promo code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            disabled={locked}
            data-testid="input-promo-code"
          />
          <Button
            onClick={applyPromoCode}
            disabled={isApplyingPromo || locked}
            variant="outline"
            size="sm"
            data-testid="button-apply-promo"
          >
            <Tag className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setLocked(!locked)}
            variant={locked ? 'default' : 'outline'}
            size="icon"
            data-testid="button-lock-price"
          >
            <Lock className="w-4 h-4" />
          </Button>
        </div>
        {pricing.promoCodeApplied && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-2" data-testid="text-promo-applied">
            Promo code {pricing.promoCodeApplied} applied - Saved ${pricing.promoDiscount.toFixed(2)}
          </p>
        )}
      </Card>

      {/* Line Items by Category */}
      <div className="space-y-2" data-testid="line-items">
        {Array.from(categories.entries()).map(([category, items]) => (
          <Card key={category} className="p-4 border-secondary" data-testid={`category-${category}`}>
            <button
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              className="w-full flex items-center justify-between gap-2 hover-elevate p-1"
              data-testid={`button-expand-${category}`}
            >
              <div className="flex items-center justify-between flex-1 gap-2">
                <span className="font-semibold capitalize">{category.replace('_', ' ')}</span>
                <span className="text-sm text-secondary-foreground">
                  {items.reduce((sum, item) => sum + item.price, 0).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  })}
                </span>
              </div>
              {expandedCategory === category ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {expandedCategory === category && (
              <div className="mt-3 space-y-2 border-t pt-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm gap-2"
                    data-testid={`item-${item.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.quantity && item.unit && (
                        <p className="text-xs text-tertiary-foreground">
                          {item.quantity} {item.unit} @ ${item.unitPrice.toFixed(2)}/{item.unit}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {item.price.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD'
                        })}
                      </p>
                      {item.margin > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Margin: ${item.margin.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Summary Card */}
      <Card className="p-4 bg-secondary/50 border-secondary space-y-2" data-testid="pricing-summary">
        <div className="flex justify-between text-sm">
          <span className="text-secondary-foreground">Subtotal:</span>
          <span className="font-semibold">
            {pricing.subtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </span>
        </div>

        {pricing.steelSurcharge > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-secondary-foreground">Steel Surcharge (8%):</span>
            <span className="font-semibold">
              {pricing.steelSurcharge.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-secondary-foreground">Freight Estimate:</span>
          <span className="font-semibold">
            {pricing.freightEstimate.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </span>
        </div>

        <div className="flex justify-between text-sm border-t pt-2">
          <span className="text-secondary-foreground">Tax ({(pricing.globalSettings?.taxRate * 100 || 8.5).toFixed(1)}%):</span>
          <span className="font-semibold">
            {pricing.taxes.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </span>
        </div>

        <div className="flex justify-between text-lg font-bold border-t pt-2 text-primary">
          <span>Total Quote:</span>
          <span>
            {pricing.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </span>
        </div>
      </Card>

      {/* Margin Analysis */}
      {showAdmin && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" data-testid="margin-analysis">
          <h4 className="font-semibold mb-2">Margin Analysis (Admin)</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-secondary-foreground">Total Cost:</p>
              <p className="font-semibold">
                {pricing.costTotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </p>
            </div>
            <div>
              <p className="text-secondary-foreground">Total Price:</p>
              <p className="font-semibold">
                {pricing.costVsPrice.totalPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </p>
            </div>
            <div>
              <p className="text-secondary-foreground">Margin Dollars:</p>
              <p className="font-semibold text-green-600 dark:text-green-400">
                ${pricing.marginDollars.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-secondary-foreground">Margin %:</p>
              <p className="font-semibold text-green-600 dark:text-green-400">
                {pricing.marginPercent.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2" data-testid="pricing-actions">
        <Button
          onClick={downloadQuote}
          variant="outline"
          className="flex-1"
          data-testid="button-download-quote"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Quote
        </Button>
      </div>
    </div>
  );
}

export type PricingDisplayProps = typeof PricingDisplay;
