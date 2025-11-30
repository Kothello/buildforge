import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PricingEngine, getDefaultPricingRules } from './pricingEngine';
import type { BuildingConfig, PricingRulesFile, PricingResult } from './pricingEngine';

const router = Router();

// Path to pricing rules file
const PRICING_RULES_PATH = join(process.cwd(), 'shared', 'pricingRules.json');

/**
 * Load pricing rules from file or return defaults
 */
function loadPricingRules(): PricingRulesFile {
  try {
    const data = readFileSync(PRICING_RULES_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('Using default pricing rules - file not found or invalid');
    return getDefaultPricingRules();
  }
}

/**
 * Save pricing rules to file
 */
function savePricingRules(rules: PricingRulesFile): void {
  try {
    rules.lastUpdated = new Date().toISOString();
    writeFileSync(PRICING_RULES_PATH, JSON.stringify(rules, null, 2));
  } catch (error) {
    console.error('Failed to save pricing rules:', error);
    throw new Error('Failed to save pricing rules');
  }
}

/**
 * GET /api/pricing/calculate
 * Calculate price for a building configuration
 */
router.post('/calculate', (req, res) => {
  try {
    const { config, region, promoCode } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Building configuration required' });
    }

    const rules = loadPricingRules();
    const engine = new PricingEngine(rules, region || 'default');

    const startTime = performance.now();
    const pricing = engine.calculatePrice(config, promoCode);
    const executionTime = performance.now() - startTime;

    res.json({
      ...pricing,
      executionTime: `${executionTime.toFixed(2)}ms`,
      rulesVersion: rules.version
    });
  } catch (error) {
    console.error('Pricing calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate price',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/pricing/rules
 * Get all pricing rules
 */
router.get('/rules', (req, res) => {
  try {
    const rules = loadPricingRules();
    res.json({
      costRules: rules.costRules,
      priceRules: rules.priceRules,
      promoCodes: rules.promoCodes,
      globalSettings: rules.globalSettings,
      regions: rules.regions,
      version: rules.version
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load pricing rules' });
  }
});

/**
 * POST /api/pricing/rules
 * Update pricing rules
 */
router.post('/rules', (req, res) => {
  try {
    const { costRules, priceRules, promoCodes } = req.body;

    const rules = loadPricingRules();

    // Update rules
    if (costRules) rules.costRules = costRules;
    if (priceRules) rules.priceRules = priceRules;
    if (promoCodes) rules.promoCodes = promoCodes;

    savePricingRules(rules);

    res.json({
      success: true,
      message: 'Pricing rules updated successfully',
      version: rules.version
    });
  } catch (error) {
    console.error('Failed to update pricing rules:', error);
    res.status(500).json({
      error: 'Failed to update pricing rules',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/pricing/ai-suggestions
 * Get AI-powered pricing suggestions
 */
router.post('/ai-suggestions', async (req, res) => {
  try {
    const { config, currentPrice } = req.body;

    // TODO: Integrate with OpenAI/Claude/Local LLM
    // This is a placeholder response for now

    res.json({
      recommendedAdjustment: 0,
      reasoning: 'AI pricing suggestions not yet configured. Set up LLM integration to enable.',
      confidence: 0,
      factors: {
        steelMarketCondition: 'stable',
        seasonalDemand: 'moderate',
        competitorPricing: 'unknown',
        volumeDiscount: 'applicable'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate AI suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/pricing/validation
 * Validate configuration and return warnings/errors
 */
router.post('/validation', (req, res) => {
  try {
    const { config } = req.body as { config: BuildingConfig };
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate dimensions
    if (config.width < 20) warnings.push('Building width is unusually small (< 20 ft)');
    if (config.width > 150) warnings.push('Building width is very large (> 150 ft), may incur additional charges');
    if (config.length < 20) warnings.push('Building length is unusually small (< 20 ft)');
    if (config.length > 300) warnings.push('Building length is very large (> 300 ft)');

    // Validate roof pitch
    if (config.roofPitch < 2) warnings.push('Roof pitch is very shallow (< 2:12)');
    if (config.roofPitch > 12) warnings.push('Roof pitch is steep (> 12:12)');

    // Validate doors and windows
    if ((config.doors?.length || 0) > 10) warnings.push('Many doors/openings may increase costs');
    if ((config.windows?.length || 0) > 15) warnings.push('Many windows may increase costs');

    // Validate lean-tos
    const totalLeanToArea = (config.leanTos || [])
      .filter(lt => !lt.parentId)
      .reduce((sum, lt) => sum + lt.width * lt.length, 0);
    const mainArea = config.width * config.length;

    if (totalLeanToArea > mainArea * 0.5) {
      warnings.push('Total lean-to area exceeds 50% of main building - consider structural review');
    }

    res.json({
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    });
  } catch (error) {
    res.status(500).json({
      error: 'Validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/pricing/quote
 * Generate a complete quote
 */
router.post('/quote', (req, res) => {
  try {
    const { config, region, promoCode, customerInfo } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Building configuration required' });
    }

    const rules = loadPricingRules();
    const engine = new PricingEngine(rules, region || 'default');
    const pricing = engine.calculatePrice(config, promoCode);

    // Generate quote document
    const quoteNumber = `QT-${Date.now().toString().slice(-8)}`;
    const quoteDate = new Date().toISOString().split('T')[0];

    res.json({
      quoteNumber,
      quoteDate,
      expiresDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      customerInfo: customerInfo || {},
      config,
      pricing,
      lineItems: pricing.breakdown,
      summary: {
        buildingDimensions: `${config.width}' W x ${config.length}' L x ${config.height}' H`,
        roofStyle: config.roofStyle,
        roofPitch: `${config.roofPitch}:12`,
        doors: (config.doors || []).length,
        windows: (config.windows || []).length,
        leanTos: (config.leanTos || []).filter(lt => !lt.parentId).length
      },
      payment: {
        deposit: pricing.total * 0.5,
        balance: pricing.total * 0.5,
        leadTime: '6-8 weeks'
      }
    });
  } catch (error) {
    console.error('Quote generation error:', error);
    res.status(500).json({
      error: 'Failed to generate quote',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/pricing/compare
 * Compare two configurations
 */
router.post('/compare', (req, res) => {
  try {
    const { config1, config2, region } = req.body;

    const rules = loadPricingRules();
    const engine = new PricingEngine(rules, region || 'default');

    const pricing1 = engine.calculatePrice(config1);
    const pricing2 = engine.calculatePrice(config2);

    const difference = pricing2.total - pricing1.total;
    const percentDifference = ((difference / pricing1.total) * 100).toFixed(2);

    res.json({
      configuration1: {
        description: `${config1.width}' x ${config1.length}' ${config1.roofStyle}`,
        total: pricing1.total,
        margin: pricing1.marginPercent.toFixed(2)
      },
      configuration2: {
        description: `${config2.width}' x ${config2.length}' ${config2.roofStyle}`,
        total: pricing2.total,
        margin: pricing2.marginPercent.toFixed(2)
      },
      difference: {
        dollars: difference.toFixed(2),
        percent: percentDifference,
        expensiveOption: difference > 0 ? 'configuration2' : 'configuration1'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Comparison failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/pricing/audit-log
 * Return audit log (placeholder for future enhancement)
 */
router.get('/audit-log', (req, res) => {
  res.json({
    auditLog: [],
    note: 'Audit logging not yet implemented'
  });
});

export default router;
