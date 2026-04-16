import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Save, X, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

interface Rule {
  id: string;
  name: string;
  description: string;
  type: 'fixed' | 'per_sqft' | 'per_linear_ft' | 'percentage' | 'tiered' | 'regional';
  appliesTo: 'building' | 'roof' | 'door' | 'window' | 'leanTo' | 'subtotal';
  category: string;
  basePrice: number;
  enabled: boolean;
  order: number;
}

interface PromoCode {
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number | null;
  maxOrderValue: number | null;
  validFrom: string;
  validUntil: string;
  maxUsage: number;
  timesUsed: number;
  enabled: boolean;
}

export default function PricingAdminPage() {
  const [costRules, setCostRules] = useState<Rule[]>([]);
  const [priceRules, setPriceRules] = useState<Rule[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    loadPricingRules();
  }, []);

  async function loadPricingRules() {
    try {
      setLoading(true);
      const response = await fetch('/api/pricing/rules', { credentials: 'include' });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to load rules: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setCostRules(data.costRules || []);
      setPriceRules(data.priceRules || []);
      setPromoCodes(data.promoCodes || []);
    } catch (error) {
      console.error('Pricing rules load error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load pricing rules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveRules() {
    try {
      const response = await fetch('/api/pricing/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ costRules, priceRules, promoCodes })
      });

      if (!response.ok) throw new Error('Failed to save rules');

      toast({
        title: 'Success',
        description: 'Pricing rules saved successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save pricing rules',
        variant: 'destructive'
      });
    }
  }

  function addCostRule() {
    const newRule: Rule = {
      id: `cost_${Date.now()}`,
      name: 'New Cost Rule',
      description: '',
      type: 'per_sqft',
      appliesTo: 'building',
      category: 'custom',
      basePrice: 0,
      enabled: true,
      order: Math.max(...costRules.map(r => r.order), 0) + 10
    };
    setCostRules([...costRules, newRule]);
  }

  function addPriceRule() {
    const newRule: Rule = {
      id: `price_${Date.now()}`,
      name: 'New Price Rule',
      description: '',
      type: 'percentage',
      appliesTo: 'subtotal',
      category: 'custom',
      basePrice: 0,
      enabled: true,
      order: Math.max(...priceRules.map(r => r.order), 0) + 10
    };
    setPriceRules([...priceRules, newRule]);
  }

  function addPromoCode() {
    const newPromo: PromoCode = {
      code: 'PROMO' + Date.now().toString().slice(-6),
      description: 'New promotion',
      type: 'percentage',
      value: 0.1,
      minOrderValue: null,
      maxOrderValue: null,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      maxUsage: 100,
      timesUsed: 0,
      enabled: true
    };
    setPromoCodes([...promoCodes, newPromo]);
  }

  function updateRule(updatedRule: Rule, isPrice: boolean) {
    if (isPrice) {
      setPriceRules(priceRules.map(r => r.id === updatedRule.id ? updatedRule : r));
    } else {
      setCostRules(costRules.map(r => r.id === updatedRule.id ? updatedRule : r));
    }
  }

  function deleteRule(id: string, isPrice: boolean) {
    if (isPrice) {
      setPriceRules(priceRules.filter(r => r.id !== id));
    } else {
      setCostRules(costRules.filter(r => r.id !== id));
    }
  }

  function updatePromo(updatedPromo: PromoCode) {
    setPromoCodes(promoCodes.map(p => p.code === updatedPromo.code ? updatedPromo : p));
  }

  function deletePromo(code: string) {
    setPromoCodes(promoCodes.filter(p => p.code !== code));
  }

  if (loading) {
    return (
      <div className="h-full overflow-auto p-3 sm:p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          Loading pricing rules...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            data-testid="button-back-to-admin"
            onClick={() => setLocation('/admin')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold" data-testid="text-pricing-admin-title">Pricing Rules Admin</h1>
        </div>
        <Button onClick={saveRules} className="gap-2" data-testid="button-save-rules">
          <Save className="w-4 h-4" />
          Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="cost" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cost" data-testid="tab-cost-rules">Cost Rules</TabsTrigger>
          <TabsTrigger value="price" data-testid="tab-price-rules">Price Rules</TabsTrigger>
          <TabsTrigger value="promo" data-testid="tab-promo-codes">Promo Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="cost" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">Cost Rules (Materials & Labor)</h2>
            <Button onClick={addCostRule} size="sm" variant="outline" data-testid="button-add-cost-rule">
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <div className="space-y-3">
            {costRules.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                No cost rules configured. Add a rule to get started.
              </Card>
            ) : (
              costRules.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onUpdate={(updated) => updateRule(updated, false)}
                  onDelete={() => deleteRule(rule.id, false)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="price" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">Price Rules (Markups & Discounts)</h2>
            <Button onClick={addPriceRule} size="sm" variant="outline" data-testid="button-add-price-rule">
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <div className="space-y-3">
            {priceRules.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                No price rules configured. Add a rule to get started.
              </Card>
            ) : (
              priceRules.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  onUpdate={(updated) => updateRule(updated, true)}
                  onDelete={() => deleteRule(rule.id, true)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="promo" className="space-y-4 mt-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">Promotional Codes</h2>
            <Button onClick={addPromoCode} size="sm" variant="outline" data-testid="button-add-promo-code">
              <Plus className="w-4 h-4 mr-2" />
              Add Code
            </Button>
          </div>

          <div className="space-y-3">
            {promoCodes.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                No promo codes configured. Add a code to get started.
              </Card>
            ) : (
              promoCodes.map(promo => (
                <PromoCodeCard
                  key={promo.code}
                  promo={promo}
                  onUpdate={(updated) => updatePromo(updated)}
                  onDelete={() => deletePromo(promo.code)}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RuleCard({ rule, onUpdate, onDelete }: { rule: Rule; onUpdate: (rule: Rule) => void; onDelete: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editing, setEditing] = useState(rule);

  if (!isEditing) {
    return (
      <Card className="p-4" data-testid={`rule-display-${rule.id}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <Switch
                checked={editing.enabled}
                onCheckedChange={(checked) => {
                  const updated = { ...editing, enabled: checked };
                  setEditing(updated);
                  onUpdate(updated);
                }}
                data-testid={`switch-enable-${rule.id}`}
              />
              <h3 className="font-semibold text-lg">{rule.name}</h3>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                {rule.type}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{rule.description}</p>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <p>Base Price: {rule.basePrice} | Category: {rule.category} | Order: {rule.order}</p>
              <p>Applies To: {rule.appliesTo}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              data-testid={`button-edit-${rule.id}`}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              data-testid={`button-delete-${rule.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4" data-testid={`rule-editor-${rule.id}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Enable</label>
          <Switch
            checked={editing.enabled}
            onCheckedChange={(checked) => setEditing({ ...editing, enabled: checked })}
            data-testid={`switch-enable-edit-${rule.id}`}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Rule Name</label>
          <Input
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            data-testid={`input-name-${rule.id}`}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={editing.description}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            data-testid={`input-description-${rule.id}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Type</label>
            <Select value={editing.type} onValueChange={(value: Rule['type']) => setEditing({ ...editing, type: value })}>
              <SelectTrigger data-testid={`select-type-${rule.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed ($)</SelectItem>
                <SelectItem value="per_sqft">Per Sq Ft</SelectItem>
                <SelectItem value="per_linear_ft">Per Linear Ft</SelectItem>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="tiered">Tiered</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Applies To</label>
            <Select value={editing.appliesTo} onValueChange={(value: Rule['appliesTo']) => setEditing({ ...editing, appliesTo: value })}>
              <SelectTrigger data-testid={`select-applies-to-${rule.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="building">Building</SelectItem>
                <SelectItem value="roof">Roof</SelectItem>
                <SelectItem value="door">Door</SelectItem>
                <SelectItem value="window">Window</SelectItem>
                <SelectItem value="leanTo">Lean-To</SelectItem>
                <SelectItem value="subtotal">Subtotal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Category</label>
            <Input
              value={editing.category}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              data-testid={`input-category-${rule.id}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Base Price</label>
            <Input
              type="number"
              step="0.01"
              value={editing.basePrice}
              onChange={(e) => setEditing({ ...editing, basePrice: parseFloat(e.target.value) })}
              data-testid={`input-base-price-${rule.id}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Order</label>
            <Input
              type="number"
              value={editing.order}
              onChange={(e) => setEditing({ ...editing, order: parseInt(e.target.value) })}
              data-testid={`input-order-${rule.id}`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setIsEditing(false)}
            data-testid={`button-cancel-${rule.id}`}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={() => {
              onUpdate(editing);
              setIsEditing(false);
            }}
            data-testid={`button-save-${rule.id}`}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PromoCodeCard({ promo, onUpdate, onDelete }: { promo: PromoCode; onUpdate: (promo: PromoCode) => void; onDelete: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editing, setEditing] = useState(promo);

  if (!isEditing) {
    return (
      <Card className="p-4" data-testid={`promo-display-${promo.code}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <Switch
                checked={editing.enabled}
                onCheckedChange={(checked) => {
                  const updated = { ...editing, enabled: checked };
                  setEditing(updated);
                  onUpdate(updated);
                }}
                data-testid={`switch-enable-promo-${promo.code}`}
              />
              <h3 className="font-mono font-bold text-lg">{promo.code}</h3>
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                {promo.type === 'percentage' ? `${(promo.value * 100).toFixed(0)}%` : `$${promo.value}`}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{promo.description}</p>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <p>Valid: {promo.validFrom} to {promo.validUntil}</p>
              <p>Min: ${promo.minOrderValue || '—'} | Max: ${promo.maxOrderValue || '—'}</p>
              <p>Usage: {promo.timesUsed} / {promo.maxUsage}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              data-testid={`button-edit-promo-${promo.code}`}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              data-testid={`button-delete-promo-${promo.code}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4" data-testid={`promo-editor-${promo.code}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Enable</label>
          <Switch
            checked={editing.enabled}
            onCheckedChange={(checked) => setEditing({ ...editing, enabled: checked })}
            data-testid={`switch-enable-promo-edit-${promo.code}`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Promo Code</label>
            <Input
              value={editing.code}
              disabled
              data-testid={`input-code-${promo.code}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Type</label>
            <Select value={editing.type} onValueChange={(value: PromoCode['type']) => setEditing({ ...editing, type: value })}>
              <SelectTrigger data-testid={`select-type-promo-${promo.code}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Value</label>
            <Input
              type="number"
              step={editing.type === 'percentage' ? '0.01' : '1'}
              value={editing.value}
              onChange={(e) => setEditing({ ...editing, value: parseFloat(e.target.value) })}
              data-testid={`input-value-${promo.code}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Min Order</label>
            <Input
              type="number"
              value={editing.minOrderValue || ''}
              onChange={(e) => setEditing({ ...editing, minOrderValue: e.target.value ? parseFloat(e.target.value) : null })}
              data-testid={`input-min-order-${promo.code}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Valid From</label>
            <Input
              type="date"
              value={editing.validFrom}
              onChange={(e) => setEditing({ ...editing, validFrom: e.target.value })}
              data-testid={`input-valid-from-${promo.code}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Valid Until</label>
            <Input
              type="date"
              value={editing.validUntil}
              onChange={(e) => setEditing({ ...editing, validUntil: e.target.value })}
              data-testid={`input-valid-until-${promo.code}`}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Max Usage</label>
            <Input
              type="number"
              value={editing.maxUsage}
              onChange={(e) => setEditing({ ...editing, maxUsage: parseInt(e.target.value) })}
              data-testid={`input-max-usage-${promo.code}`}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Textarea
            value={editing.description}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            data-testid={`input-description-promo-${promo.code}`}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setIsEditing(false)}
            data-testid={`button-cancel-promo-${promo.code}`}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={() => {
              onUpdate(editing);
              setIsEditing(false);
            }}
            data-testid={`button-save-promo-${promo.code}`}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
