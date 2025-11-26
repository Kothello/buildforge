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

export interface Quote {
  quoteNumber: string;
  quoteDate: string;
  expiresDate: string;
  customerInfo: Record<string, any>;
  config: BuildingConfig;
  pricing: PricingResult;
  lineItems: LineItem[];
  summary: {
    buildingDimensions: string;
    roofStyle: string;
    roofPitch: string;
    doors: number;
    windows: number;
    leanTos: number;
  };
  payment: {
    deposit: number;
    balance: number;
    leadTime: string;
  };
}
