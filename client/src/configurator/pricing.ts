import type { BuildingConfig } from './types';

export interface PricingBreakdown {
  baseCost: number;
  heightMultiplier: number;
  roofCost: number;
  doorsCost: number;
  windowsCost: number;
  leanTosCost: number;
  totalCost: number;
  pricePerSqFt: number;
}

const BASE_PRICE_PER_SQFT = 12;
const HEIGHT_MULTIPLIER_BASE = 12;
const GABLE_ROOF_MULTIPLIER = 1.15;
const SINGLE_SLOPE_ROOF_MULTIPLIER = 1.0;
const ROLLUP_DOOR_PRICE = 1200;
const PERSONNEL_DOOR_PRICE = 450;
const WINDOW_PRICE = 350;

export function calculatePricing(config: BuildingConfig): PricingBreakdown {
  const sqft = config.width * config.length;
  const baseCost = sqft * BASE_PRICE_PER_SQFT;

  const heightFactor = 1 + Math.max(0, (config.height - HEIGHT_MULTIPLIER_BASE) * 0.03);
  const heightMultiplier = baseCost * (heightFactor - 1);

  const roofMultiplier = config.roofStyle === 'gable'
    ? GABLE_ROOF_MULTIPLIER
    : SINGLE_SLOPE_ROOF_MULTIPLIER;
  const roofCost = baseCost * (roofMultiplier - 1);

  const doorsCost = config.doors.reduce((sum, d) => {
    return sum + (d.type === 'rollup' ? ROLLUP_DOOR_PRICE : PERSONNEL_DOOR_PRICE);
  }, 0);

  const windowsCost = config.windows.length * WINDOW_PRICE;

  // Lean-to cost: $8/sqft for open, $10/sqft for enclosed/gable (additional sqft)
  const leanTosCost = (config.leanTos || []).reduce((sum, lt) => {
    const leanSqft = lt.width * lt.length;
    const pricePerSqft = lt.type === 'open' ? 8 : 10;
    return sum + (leanSqft * pricePerSqft);
  }, 0);

  const totalCost = (baseCost + heightMultiplier + roofCost + doorsCost + windowsCost + leanTosCost);
  const pricePerSqFt = totalCost / sqft;

  return {
    baseCost: Math.round(baseCost),
    heightMultiplier: Math.round(heightMultiplier),
    roofCost: Math.round(roofCost),
    doorsCost: Math.round(doorsCost),
    windowsCost: Math.round(windowsCost),
    leanTosCost: Math.round(leanTosCost),
    totalCost: Math.round(totalCost),
    pricePerSqFt: Math.round(pricePerSqFt * 100) / 100,
  };
}
