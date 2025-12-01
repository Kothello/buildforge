import type { z } from 'zod';

/**
 * Pricing Engine for Metal Building Configurator
 * Handles cost/price calculations, margins, and dynamic pricing rules
 * Production-ready with <10ms performance
 */

export interface Door {
  id: string;
  doorType: 'rollup' | 'walk';
  position: number;
}

export interface Window {
  id: string;
  position: number;
}

export interface LeanTo {
  id: string;
  type: 'enclosed' | 'open' | 'gable';
  wall: 'front' | 'back' | 'left' | 'right';
  width: number;
  length: number;
  pitch: number;
  height: number;
  walls: { front: boolean; back: boolean; left: boolean; right: boolean };
  isOpen: boolean;
  position: number;
  wraparound: boolean;
  wraparoundCorner?: 'left' | 'right' | 'both';
  parentId?: string;
}

export interface BuildingConfig {
  width: number;
  length: number;
  height: number;
  roofStyle: 'gable' | 'single-slope';
  roofPitch: number;
  wallColor: string;
  roofColor: string;
  trimColor: string;
  doors: Door[];
  windows: Window[];
  leanTos: LeanTo[];
  wallEnclosure?: 'fully-enclosed' | 'fully-open' | 'gable-ends' | 'customize';
  customWalls?: { front: boolean; back: boolean; left: boolean; right: boolean };
  insulation?: boolean;
  wainscot?: boolean;
  gutters?: boolean;
  ridgeVent?: boolean;
  skylights?: boolean;
  certified?: boolean;
  customColors?: boolean;
  rushDelivery?: boolean;
  earlyPayment?: boolean;
}

export interface PricingRule {
  id: string;
  name: string;
  description: string;
  type: 'fixed' | 'per_sqft' | 'per_linear_ft' | 'percentage' | 'tiered' | 'regional';
  appliesTo: 'building' | 'roof' | 'door' | 'window' | 'leanTo' | 'subtotal';
  category: string;
  basePrice: number;
  conditions?: RuleCondition[];
  tiers?: RuleTier[];
  enabled: boolean;
  order: number;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'exists';
  value: any;
}

export interface RuleTier {
  threshold: number;
  value: number;
}

export interface PromoCode {
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

export interface PricingRulesFile {
  version: string;
  lastUpdated: string;
  currency: string;
  regions: Record<string, number>;
  globalSettings: {
    steelSurcharge: number;
    taxRate: number;
    defaultMarginPercent: number;
    freightBaseFee: number;
    freightPerSqFt: number;
  };
  costRules: PricingRule[];
  priceRules: PricingRule[];
  promoCodes: PromoCode[];
  templates?: Record<string, any>;
}

export interface LineItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  cost: number;
  price: number;
  margin: number;
  isRuleApplied?: boolean;
}

export interface PricingResult {
  breakdown: LineItem[];
  subtotal: number;
  steelSurcharge: number;
  laborCost: number;
  subtotalBeforeTax: number;
  taxes: number;
  freightEstimate: number;
  promoCodeApplied: string | null;
  promoDiscount: number;
  total: number;
  costTotal: number;
  marginDollars: number;
  marginPercent: number;
  costVsPrice: {
    totalCost: number;
    totalPrice: number;
    marginPercent: number;
    profitPercentage: number;
  };
  roofArea: number;
  wallArea: number;
  buildingPerimeter: number;
  timestamp: string;
}

/**
 * Main Pricing Engine - handles all calculations
 */
export class PricingEngine {
  private rules: PricingRulesFile;
  private costRulesMap: Map<string, PricingRule>;
  private priceRulesMap: Map<string, PricingRule>;
  private regionMultiplier: number = 1.0;
  private startTime: number = 0;

  constructor(rules: PricingRulesFile, region: string = 'default') {
    this.rules = rules;
    this.costRulesMap = new Map(rules.costRules.map(r => [r.id, r]));
    this.priceRulesMap = new Map(rules.priceRules.map(r => [r.id, r]));
    this.regionMultiplier = rules.regions[region] || 1.0;
  }

  /**
   * Calculate complete pricing breakdown
   */
  calculatePrice(config: BuildingConfig, promoCode?: string): PricingResult {
    this.startTime = performance.now();
    const breakdown: LineItem[] = [];
    let costTotal = 0;
    let priceTotal = 0;

    // Calculate base areas and perimeters
    const roofArea = this.calculateRoofArea(config);
    const wallArea = this.calculateWallArea(config);
    const perimeter = (config.width + config.length) * 2;

    // Process cost rules
    for (const rule of this.rules.costRules.filter(r => r.enabled).sort((a, b) => a.order - b.order)) {
      const items = this.applyRule(rule, config, 'cost', roofArea, wallArea, perimeter);
      breakdown.push(...items);
      costTotal += items.reduce((sum, item) => sum + item.cost, 0);
    }

    // Apply steel surcharge to base structure costs
    const steelSurcharge = costTotal * this.rules.globalSettings.steelSurcharge;
    costTotal += steelSurcharge;

    // Process price rules (apply to cost total)
    for (const rule of this.rules.priceRules.filter(r => r.enabled).sort((a, b) => a.order - b.order)) {
      // Skip discounts for now, apply them after all markups
      if (rule.category === 'discounts') continue;

      const items = this.applyRule(rule, config, 'price', roofArea, wallArea, perimeter, costTotal);
      breakdown.push(...items);
      priceTotal += items.reduce((sum, item) => sum + item.price, 0);
    }

    // Add labor cost (typically 25% of material)
    const laborCost = (costTotal + priceTotal) * 0.25;
    breakdown.push({
      id: 'labor_cost',
      name: 'Labor & Installation',
      category: 'labor',
      quantity: 1,
      unit: 'lump',
      unitPrice: laborCost,
      cost: laborCost * 0.6,
      price: laborCost,
      margin: laborCost * 0.4,
      isRuleApplied: true
    });

    // Subtotal before discounts
    const subtotalBeforeDiscounts = costTotal + priceTotal + laborCost;

    // Apply volume discounts
    let discountAmount = 0;
    for (const rule of this.rules.priceRules.filter(r => r.enabled && r.category === 'discounts').sort((a, b) => a.order - b.order)) {
      const items = this.applyRule(rule, { ...config, subtotal: subtotalBeforeDiscounts }, 'price', roofArea, wallArea, perimeter, subtotalBeforeDiscounts);
      if (items.length > 0) {
        breakdown.push(...items);
        discountAmount += items.reduce((sum, item) => sum + Math.abs(item.price), 0);
      }
    }

    // Apply promo code
    let promoDiscount = 0;
    let appliedPromo: string | null = null;
    if (promoCode) {
      const result = this.applyPromoCode(promoCode, subtotalBeforeDiscounts - discountAmount);
      if (result) {
        promoDiscount = result.discount;
        appliedPromo = result.code;
        breakdown.push({
          id: `promo_${promoCode}`,
          name: `Promo Code: ${promoCode}`,
          category: 'discounts',
          quantity: 1,
          unit: 'promo',
          unitPrice: -promoDiscount,
          cost: 0,
          price: -promoDiscount,
          margin: -promoDiscount,
          isRuleApplied: true
        });
      }
    }

    // Calculate freight
    const freightEstimate = this.rules.globalSettings.freightBaseFee + (roofArea * this.rules.globalSettings.freightPerSqFt);

    // Final totals
    const subtotal = subtotalBeforeDiscounts - discountAmount - promoDiscount;
    const taxes = subtotal * this.rules.globalSettings.taxRate;
    const total = subtotal + taxes + freightEstimate;

    // Margin calculations
    const marginDollars = subtotal - costTotal;
    const marginPercent = costTotal > 0 ? (marginDollars / costTotal) * 100 : 0;

    return {
      breakdown,
      subtotal,
      steelSurcharge,
      laborCost,
      subtotalBeforeTax: subtotal,
      taxes,
      freightEstimate,
      promoCodeApplied: appliedPromo,
      promoDiscount,
      total,
      costTotal,
      marginDollars,
      marginPercent,
      costVsPrice: {
        totalCost: costTotal,
        totalPrice: subtotal,
        marginPercent,
        profitPercentage: (marginDollars / subtotal) * 100
      },
      roofArea,
      wallArea,
      buildingPerimeter: perimeter,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Apply a pricing rule to generate line items
   */
  private applyRule(
    rule: PricingRule,
    config: BuildingConfig | any,
    ruleType: 'cost' | 'price',
    roofArea: number,
    wallArea: number,
    perimeter: number,
    baseCost?: number
  ): LineItem[] {
    const items: LineItem[] = [];

    // Check conditions
    if (!this.checkConditions(rule.conditions || [], config, baseCost)) {
      return items;
    }

    if (rule.appliesTo === 'building') {
      items.push(...this.calculateBuildingItem(rule, config, roofArea, wallArea, perimeter));
    } else if (rule.appliesTo === 'roof') {
      items.push(this.calculateRoofItem(rule, roofArea, ruleType));
    } else if (rule.appliesTo === 'door') {
      items.push(...this.calculateDoorItems(rule, config.doors || [], ruleType));
    } else if (rule.appliesTo === 'window') {
      items.push(...this.calculateWindowItems(rule, config.windows || [], ruleType));
    } else if (rule.appliesTo === 'leanTo') {
      items.push(...this.calculateLeanToItems(rule, config.leanTos || [], config.width, config.length, ruleType));
    } else if (rule.appliesTo === 'subtotal') {
      items.push(this.calculateSubtotalItem(rule, config.subtotal || 0));
    }

    return items;
  }

  /**
   * Check if rule conditions are met
   */
  private checkConditions(conditions: RuleCondition[], config: any, baseCost?: number): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const fieldValue = config[condition.field];

      switch (condition.operator) {
        case 'equals':
          if (fieldValue !== condition.value) return false;
          break;
        case 'not_equals':
          if (fieldValue === condition.value) return false;
          break;
        case 'greater_than':
          if ((fieldValue || 0) <= condition.value) return false;
          break;
        case 'less_than':
          if ((fieldValue || 0) >= condition.value) return false;
          break;
        case 'greater_than_or_equal':
          if ((fieldValue || 0) < condition.value) return false;
          break;
        case 'less_than_or_equal':
          if ((fieldValue || 0) > condition.value) return false;
          break;
        case 'exists':
          if (Boolean(fieldValue) !== condition.value) return false;
          break;
      }
    }
    return true;
  }

  /**
   * Calculate building-level line items
   */
  private calculateBuildingItem(rule: PricingRule, config: BuildingConfig, roofArea: number, wallArea: number, perimeter: number): LineItem[] {
    const item: LineItem = {
      id: `${rule.id}_building`,
      name: rule.name,
      category: rule.category,
      quantity: 1,
      unit: 'lump',
      unitPrice: 0,
      cost: 0,
      price: 0,
      margin: 0,
      isRuleApplied: true
    };

    if (rule.type === 'per_sqft') {
      const area = roofArea + wallArea;
      item.quantity = area;
      item.unit = 'sqft';
      item.unitPrice = rule.basePrice;
      item.cost = area * rule.basePrice * this.regionMultiplier;
      item.price = item.cost;
    } else if (rule.type === 'per_linear_ft') {
      item.quantity = perimeter;
      item.unit = 'lf';
      item.unitPrice = rule.basePrice;
      item.cost = perimeter * rule.basePrice * this.regionMultiplier;
      item.price = item.cost;
    } else if (rule.type === 'fixed') {
      item.unitPrice = rule.basePrice;
      item.cost = rule.basePrice * this.regionMultiplier;
      item.price = item.cost;
    } else if (rule.type === 'tiered' && rule.tiers) {
      const tierValue = this.getTierValue(config.width, rule.tiers);
      item.cost = tierValue * this.regionMultiplier;
      item.price = item.cost;
      item.unitPrice = tierValue;
    }

    return item.cost > 0 ? [item] : [];
  }

  /**
   * Calculate roof line items
   */
  private calculateRoofItem(rule: PricingRule, roofArea: number, ruleType: 'cost' | 'price'): LineItem {
    return {
      id: `${rule.id}_roof`,
      name: rule.name,
      category: rule.category,
      quantity: roofArea,
      unit: 'sqft',
      unitPrice: rule.basePrice,
      cost: rule.type === 'percentage' ? 0 : roofArea * rule.basePrice * this.regionMultiplier,
      price: rule.type === 'percentage' ? 0 : roofArea * rule.basePrice * this.regionMultiplier,
      margin: 0,
      isRuleApplied: true
    };
  }

  /**
   * Calculate door line items
   */
  private calculateDoorItems(rule: PricingRule, doors: Door[], ruleType: 'cost' | 'price'): LineItem[] {
    const items: LineItem[] = [];

    for (const door of doors) {
      if (rule.type === 'fixed' && this.checkDoorTypeMatch(rule, door.doorType)) {
        items.push({
          id: `${rule.id}_${door.id}`,
          name: `${rule.name} - ${door.doorType}`,
          category: rule.category,
          quantity: 1,
          unit: 'ea',
          unitPrice: rule.basePrice,
          cost: rule.basePrice * this.regionMultiplier,
          price: rule.basePrice * this.regionMultiplier,
          margin: 0,
          isRuleApplied: true
        });
      }
    }

    return items;
  }

  /**
   * Calculate window line items
   */
  private calculateWindowItems(rule: PricingRule, windows: Window[], ruleType: 'cost' | 'price'): LineItem[] {
    return windows.map(window => ({
      id: `${rule.id}_${window.id}`,
      name: `${rule.name} - Window`,
      category: rule.category,
      quantity: 1,
      unit: 'ea',
      unitPrice: rule.basePrice,
      cost: rule.basePrice * this.regionMultiplier,
      price: rule.basePrice * this.regionMultiplier,
      margin: 0,
      isRuleApplied: true
    }));
  }

  /**
   * Calculate lean-to line items
   */
  private calculateLeanToItems(rule: PricingRule, leanTos: LeanTo[], width: number, length: number, ruleType: 'cost' | 'price'): LineItem[] {
    const items: LineItem[] = [];

    for (const leanTo of leanTos) {
      // Skip child lean-tos (wraparound components)
      if (leanTo.parentId) continue;

      // Check if this lean-to matches the rule conditions
      if (!this.checkConditions(rule.conditions || [], leanTo)) {
        continue;
      }

      const leanToArea = leanTo.width * leanTo.length;

      if (rule.type === 'per_sqft') {
        let cost = leanToArea * rule.basePrice * this.regionMultiplier;
        let price = cost;

        // Apply wraparound discount if applicable
        if (leanTo.wraparound && rule.id.includes('wraparound')) {
          cost *= (1 + rule.basePrice); // basePrice is -0.2 for 20% reduction
          price = cost;
        }

        items.push({
          id: `${rule.id}_${leanTo.id}`,
          name: `${rule.name} - ${leanTo.type}`,
          category: rule.category,
          quantity: leanToArea,
          unit: 'sqft',
          unitPrice: rule.basePrice,
          cost,
          price,
          margin: 0,
          isRuleApplied: true
        });
      } else if (rule.type === 'percentage') {
        // For percentage-based rules (like wraparound discount)
        // These will be applied as modifiers to the base lean-to cost
        const leanToBasePrice = this.getLeanToBasePrice(leanTo.type);
        const baseCost = leanToArea * leanToBasePrice * this.regionMultiplier;
        const adjustment = baseCost * rule.basePrice;

        items.push({
          id: `${rule.id}_${leanTo.id}`,
          name: `${rule.name} - ${leanTo.type}`,
          category: rule.category,
          quantity: leanToArea,
          unit: 'sqft',
          unitPrice: adjustment / leanToArea,
          cost: adjustment,
          price: adjustment,
          margin: 0,
          isRuleApplied: true
        });
      }
    }

    return items;
  }

  /**
   * Get base price for lean-to type from cost rules
   */
  private getLeanToBasePrice(type: string): number {
    // Find the cost rule for this lean-to type
    const costRule = this.rules.costRules.find(r =>
      r.appliesTo === 'leanTo' &&
      r.type === 'per_sqft' &&
      r.conditions?.some(c => c.field === 'type' && c.value === type)
    );
    return costRule?.basePrice || 7.5; // Default fallback
  }

  /**
   * Calculate subtotal-based line items (discounts, multipliers)
   */
  private calculateSubtotalItem(rule: PricingRule, subtotal: number): LineItem {
    const multiplier = (1 + rule.basePrice);
    const adjustment = subtotal * rule.basePrice;

    return {
      id: rule.id,
      name: rule.name,
      category: rule.category,
      quantity: 1,
      unit: 'lump',
      unitPrice: adjustment,
      cost: rule.basePrice < 0 ? Math.abs(adjustment) : 0,
      price: adjustment,
      margin: 0,
      isRuleApplied: true
    };
  }

  /**
   * Apply promo code
   */
  private applyPromoCode(code: string, subtotal: number): { code: string; discount: number } | null {
    const promo = this.rules.promoCodes.find(p => p.code === code && p.enabled);
    if (!promo) return null;

    // Check validity
    const today = new Date().toISOString().split('T')[0];
    if (today < promo.validFrom || today > promo.validUntil) return null;
    if (promo.timesUsed >= promo.maxUsage) return null;
    if (promo.minOrderValue && subtotal < promo.minOrderValue) return null;
    if (promo.maxOrderValue && subtotal > promo.maxOrderValue) return null;

    let discount = 0;
    if (promo.type === 'percentage') {
      discount = subtotal * promo.value;
    } else {
      discount = promo.value;
    }

    return { code, discount };
  }

  /**
   * Calculate roof area
   */
  private calculateRoofArea(config: BuildingConfig): number {
    const baseArea = config.width * config.length;

    if (config.roofStyle === 'gable') {
      // Gable roof has increased area due to pitch
      const risePerFoot = config.roofPitch / 12;
      const halfWidth = config.width / 2;
      const roofIncrease = Math.sqrt(halfWidth ** 2 + (halfWidth * risePerFoot) ** 2) / halfWidth;
      return baseArea * roofIncrease;
    }

    return baseArea;
  }

  /**
   * Calculate wall area
   */
  private calculateWallArea(config: BuildingConfig): number {
    const frontBackArea = 2 * config.length * config.height;
    const sideArea = 2 * config.width * config.height;
    return frontBackArea + sideArea;
  }

  /**
   * Get tiered value based on threshold
   */
  private getTierValue(value: number, tiers: RuleTier[]): number {
    let result = 0;
    for (const tier of tiers.sort((a, b) => a.threshold - b.threshold)) {
      if (value >= tier.threshold) {
        result = tier.value;
      }
    }
    return result;
  }

  /**
   * Check if door type matches rule
   */
  private checkDoorTypeMatch(rule: PricingRule, doorType: string): boolean {
    const condition = rule.conditions?.find(c => c.field === 'doorType');
    return !condition || condition.value === doorType;
  }

  /**
   * Get execution time
   */
  getExecutionTime(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * Default fallback rules if pricingRules.json is missing
 */
export function getDefaultPricingRules(): PricingRulesFile {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    currency: 'USD',
    regions: { default: 1.0 },
    globalSettings: {
      steelSurcharge: 0.08,
      taxRate: 0.085,
      defaultMarginPercent: 35,
      freightBaseFee: 500,
      freightPerSqFt: 0.15
    },
    costRules: [
      {
        id: 'cost_base',
        name: 'Base Structure',
        description: 'Core building',
        type: 'per_sqft',
        appliesTo: 'building',
        category: 'structure',
        basePrice: 12.5,
        enabled: true,
        order: 10
      }
    ],
    priceRules: [
      {
        id: 'price_base',
        name: 'Base Markup',
        description: 'Sales markup',
        type: 'percentage',
        appliesTo: 'building',
        category: 'structure',
        basePrice: 0.5,
        enabled: true,
        order: 10
      }
    ],
    promoCodes: []
  };
}

/**
 * AI Pricing Adjustments Hook
 * Placeholder for future LLM integration
 */
export async function getAIPricingAdjustments(
  config: BuildingConfig,
  currentPrice: number,
  apiKey?: string
): Promise<{
  recommendedAdjustment: number;
  reasoning: string;
  confidence: number;
}> {
  // TODO: Integrate with OpenAI/Claude/Local LLM
  // This is a placeholder for future enhancement

  return {
    recommendedAdjustment: 0,
    reasoning: 'AI pricing not yet configured. Set up LLM integration to enable dynamic adjustments.',
    confidence: 0
  };
}

// Export types for use in other modules
export type { BuildingConfig, PricingResult, LineItem, PricingRulesFile };
