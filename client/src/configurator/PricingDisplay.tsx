import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Lock, Tag, Download } from 'lucide-react';
import type { BuildingConfig } from './types';

interface PricingDisplayProps {
  config: BuildingConfig;
  region?: string;
  onPricingUpdate?: (pricing: any) => void;
  showAdmin?: boolean;
}

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

  if (!pricing || loading) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Loading pricing...</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Quote</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocked(!locked)}
          data-testid="button-lock-pricing"
        >
          <Lock className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {pricing.breakdown?.slice(0, 5).map((item: any) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.name}</span>
            <span>${item.price.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="border-t pt-2 space-y-1">
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>${pricing.total?.toFixed(2) || '0.00'}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Input
          placeholder="Promo code"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          data-testid="input-promo-code"
        />
        <Button
          onClick={applyPromoCode}
          disabled={isApplyingPromo || locked}
          className="w-full"
          data-testid="button-apply-promo"
        >
          <Tag className="h-4 w-4 mr-2" />
          Apply Code
        </Button>
      </div>
    </Card>
  );
}
