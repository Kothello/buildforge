/**
 * Single Source of Truth for Pipeline Stages
 * 
 * This configuration is used across:
 * - Visual funnel display
 * - Agent dashboard
 * - Lead assignment logic
 * - Stage tracking analytics
 * - Database queries
 */

export type StageId = 
  | 'working_lead'
  | 'callbacks'
  | 'sold_building'
  | 'welcome_stage'
  | 'storage'
  | 'carport'
  | 'building_preparation'
  | 'building_finalization'
  | 'pending_delivery_date'
  | 'permit_hold'
  | 'red_iron_fabrication'
  | 'cold_form_fabrication'
  | 'concrete_hold'
  | 'carport_fabrication'
  | 'delivered_red_iron'
  | 'delivered_c_channel'
  | 'delivered_carport'
  | 'new_parts_order'
  | 'canceled';

export interface PipelineStage {
  id: StageId;
  label: string;
  color: string;
  hexColor: string; // For non-Tailwind usage
  funnelWidth: number; // Width in pixels for funnel visualization
  order: number;
  category: 'sales' | 'manufacturing' | 'delivery' | 'closed';
  description?: string;
  
  // Flags for business logic
  isWonDeal?: boolean;        // Counts as a won deal in reports (sold_building and beyond, excluding canceled)
  isManufacturing?: boolean;  // Stage is in manufacturing phase
  isDelivered?: boolean;      // Stage represents delivered state
  isTerminal?: boolean;       // Terminal state (no further transitions expected)
}

/**
 * Complete pipeline stage configuration
 * Add/modify stages here - changes propagate everywhere
 */
export const PIPELINE_STAGES: PipelineStage[] = [
  // SALES STAGES (Blue/Cyan)
  {
    id: 'working_lead',
    label: 'Working Lead',
    color: 'bg-blue-500',
    hexColor: '#1f97ea',
    funnelWidth: 1200,
    order: 1,
    category: 'sales',
    description: 'Initial contact and qualification',
  },
  {
    id: 'callbacks',
    label: 'Callbacks',
    color: 'bg-cyan-500',
    hexColor: '#4EADEE',
    funnelWidth: 1100,
    order: 2,
    category: 'sales',
    description: 'Scheduled follow-up calls',
  },
  {
    id: 'sold_building',
    label: 'Sold Buildings',
    color: 'bg-teal-500',
    hexColor: '#48c9b0',
    funnelWidth: 1050,
    order: 3,
    category: 'sales',
    description: 'Deal closed, awaiting production',
    isWonDeal: true, // First stage that counts as won deal
  },
  {
    id: 'welcome_stage',
    label: 'Welcome Stage',
    color: 'bg-teal-600',
    hexColor: '#45b39d',
    funnelWidth: 1000,
    order: 4,
    category: 'sales',
    description: 'Customer onboarding',
    isWonDeal: true,
  },
  
  // PRODUCT TYPE STAGES (Teal/Green)
  {
    id: 'storage',
    label: 'Storage',
    color: 'bg-emerald-400',
    hexColor: '#76d7c4',
    funnelWidth: 950,
    order: 5,
    category: 'sales',
    description: 'Storage building projects',
    isWonDeal: true,
  },
  {
    id: 'carport',
    label: 'Carport',
    color: 'bg-emerald-500',
    hexColor: '#73c6b6',
    funnelWidth: 900,
    order: 6,
    category: 'sales',
    description: 'Carport projects',
    isWonDeal: true,
  },
  
  // PREPARATION STAGES (Gray)
  {
    id: 'building_preparation',
    label: 'Building Preparation',
    color: 'bg-gray-400',
    hexColor: '#aeb6bf',
    funnelWidth: 850,
    order: 7,
    category: 'manufacturing',
    description: 'Design and engineering phase',
    isWonDeal: true,
    isManufacturing: true,
  },
  {
    id: 'building_finalization',
    label: 'Building Finalization',
    color: 'bg-gray-300',
    hexColor: '#ccd1d1',
    funnelWidth: 800,
    order: 8,
    category: 'manufacturing',
    description: 'Final specifications confirmed',
    isWonDeal: true,
    isManufacturing: true,
  },
  {
    id: 'pending_delivery_date',
    label: 'Pending Delivery Date',
    color: 'bg-gray-200',
    hexColor: '#d5dbdb',
    funnelWidth: 750,
    order: 9,
    category: 'manufacturing',
    description: 'Awaiting delivery scheduling',
    isWonDeal: true,
    isManufacturing: true,
  },
  
  // HOLD STAGES (Gray/Blue)
  {
    id: 'permit_hold',
    label: 'Permit Hold',
    color: 'bg-slate-400',
    hexColor: '#bfc9ca',
    funnelWidth: 700,
    order: 10,
    category: 'manufacturing',
    description: 'Waiting on permits and approvals',
    isWonDeal: true,
    isManufacturing: true,
  },
  {
    id: 'concrete_hold',
    label: 'Concrete Hold',
    color: 'bg-stone-400',
    hexColor: '#f5cba7',
    funnelWidth: 550,
    order: 13,
    category: 'manufacturing',
    description: 'Waiting on concrete foundation',
    isWonDeal: true,
    isManufacturing: true,
  },
  
  // FABRICATION STAGES (Yellow/Orange)
  {
    id: 'red_iron_fabrication',
    label: 'Red Iron Fabrication',
    color: 'bg-yellow-300',
    hexColor: '#f9e79f',
    funnelWidth: 650,
    order: 11,
    category: 'manufacturing',
    description: 'Red iron steel manufacturing in progress',
    isWonDeal: true,
    isManufacturing: true,
  },
  {
    id: 'cold_form_fabrication',
    label: 'Cold Form Fabrication',
    color: 'bg-yellow-400',
    hexColor: '#fad7a0',
    funnelWidth: 600,
    order: 12,
    category: 'manufacturing',
    description: 'Cold-formed steel manufacturing',
    isWonDeal: true,
    isManufacturing: true,
  },
  {
    id: 'carport_fabrication',
    label: 'Carport Fabrication',
    color: 'bg-orange-300',
    hexColor: '#edbb99',
    funnelWidth: 500,
    order: 14,
    category: 'manufacturing',
    description: 'Carport structure manufacturing',
    isWonDeal: true,
    isManufacturing: true,
  },
  
  // DELIVERY STAGES (Purple)
  {
    id: 'delivered_red_iron',
    label: 'Building Delivered - Red Iron',
    color: 'bg-purple-300',
    hexColor: '#d2b4de',
    funnelWidth: 450,
    order: 15,
    category: 'delivery',
    description: 'Red iron building delivered to site',
    isWonDeal: true,
    isDelivered: true,
  },
  {
    id: 'delivered_c_channel',
    label: 'Building Delivered - C-Channel',
    color: 'bg-purple-400',
    hexColor: '#d7bde2',
    funnelWidth: 400,
    order: 16,
    category: 'delivery',
    description: 'C-channel building delivered to site',
    isWonDeal: true,
    isDelivered: true,
  },
  {
    id: 'delivered_carport',
    label: 'Building Delivered - Carport',
    color: 'bg-purple-500',
    hexColor: '#b59bd3ff',
    funnelWidth: 350,
    order: 17,
    category: 'delivery',
    description: 'Carport delivered to site',
    isWonDeal: true,
    isDelivered: true,
  },
  
  // SPECIAL STAGES
  {
    id: 'new_parts_order',
    label: 'New Parts Order',
    color: 'bg-pink-400',
    hexColor: '#ED6AFF',
    funnelWidth: 300,
    order: 18,
    category: 'delivery',
    description: 'Additional parts or modifications ordered',
    isWonDeal: true,
    isDelivered: true,
  },
  {
    id: 'canceled',
    label: 'Canceled',
    color: 'bg-gray-500',
    hexColor: '#95a5a6',
    funnelWidth: 250,
    order: 19,
    category: 'closed',
    description: 'Deal canceled or lost',
    isTerminal: true, // Terminal - no further transitions
  },
];

/**
 * Helper Functions
 */

// Get stage by ID
export function getStage(stageId: StageId): PipelineStage | undefined {
  return PIPELINE_STAGES.find(s => s.id === stageId);
}

// Get stage label
export function getStageLabel(stageId: StageId): string {
  return getStage(stageId)?.label || stageId;
}

// Get stage color (Tailwind class)
export function getStageColor(stageId: StageId): string {
  return getStage(stageId)?.color || 'bg-gray-400';
}

// Get stage hex color
export function getStageHexColor(stageId: StageId): string {
  return getStage(stageId)?.hexColor || '#9ca3af';
}

// Get funnel width for visualization
export function getStageFunnelWidth(stageId: StageId): number {
  return getStage(stageId)?.funnelWidth || 600;
}

// Get stages by category
export function getStagesByCategory(category: 'sales' | 'manufacturing' | 'delivery' | 'closed'): PipelineStage[] {
  return PIPELINE_STAGES.filter(s => s.category === category);
}

// Get stages sorted by order
export function getStagesSorted(): PipelineStage[] {
  return [...PIPELINE_STAGES].sort((a, b) => a.order - b.order);
}

// Check if stage is a manufacturing stage
export function isManufacturingStage(stageId: StageId): boolean {
  const stage = getStage(stageId);
  return stage?.category === 'manufacturing';
}

// Check if stage is a delivery stage
export function isDeliveryStage(stageId: StageId): boolean {
  const stage = getStage(stageId);
  return stage?.category === 'delivery';
}

// Check if stage is closed (won/lost)
export function isClosedStage(stageId: StageId): boolean {
  const stage = getStage(stageId);
  return stage?.category === 'closed';
}

// Check if stage is a won deal
export function isWonDealStage(stageId: StageId): boolean {
  const stage = getStage(stageId);
  return stage?.isWonDeal === true;
}

// Check if stage is a terminal stage
export function isTerminalStage(stageId: StageId): boolean {
  const stage = getStage(stageId);
  return stage?.isTerminal === true;
}

// Get all stage IDs
export function getAllStageIds(): StageId[] {
  return PIPELINE_STAGES.map(s => s.id);
}

// Validate if a string is a valid stage ID
export function isValidStageId(id: string): id is StageId {
  return PIPELINE_STAGES.some(s => s.id === id);
}

// Get all won deal stages
export function getWonDealStages(): PipelineStage[] {
  return PIPELINE_STAGES.filter(s => s.isWonDeal === true);
}

// Get all won deal stage IDs
export function getWonDealStageIds(): StageId[] {
  return PIPELINE_STAGES.filter(s => s.isWonDeal === true).map(s => s.id);
}

// Get all manufacturing stages
export function getManufacturingStages(): PipelineStage[] {
  return PIPELINE_STAGES.filter(s => s.isManufacturing === true);
}

// Get all manufacturing stage IDs
export function getManufacturingStageIds(): StageId[] {
  return PIPELINE_STAGES.filter(s => s.isManufacturing === true).map(s => s.id);
}

// Get all delivered stages
export function getDeliveredStages(): PipelineStage[] {
  return PIPELINE_STAGES.filter(s => s.isDelivered === true);
}

// Get all delivered stage IDs
export function getDeliveredStageIds(): StageId[] {
  return PIPELINE_STAGES.filter(s => s.isDelivered === true).map(s => s.id);
}

/**
 * Stage Transition Rules
 * Define which stages can transition to which other stages
 */
export const STAGE_TRANSITIONS: Record<StageId, StageId[]> = {
  working_lead: ['callbacks', 'sold_building', 'canceled'],
  callbacks: ['sold_building', 'canceled', 'working_lead'],
  sold_building: ['welcome_stage', 'storage', 'carport', 'canceled'],
  welcome_stage: ['storage', 'carport', 'building_preparation', 'canceled'],
  storage: ['building_preparation', 'canceled'],
  carport: ['carport_fabrication', 'canceled'],
  building_preparation: ['building_finalization', 'canceled'],
  building_finalization: ['pending_delivery_date', 'red_iron_fabrication', 'cold_form_fabrication', 'canceled'],
  pending_delivery_date: ['permit_hold', 'red_iron_fabrication', 'cold_form_fabrication', 'carport_fabrication', 'canceled'],
  permit_hold: ['red_iron_fabrication', 'cold_form_fabrication', 'carport_fabrication', 'canceled'],
  red_iron_fabrication: ['concrete_hold', 'delivered_red_iron', 'canceled'],
  cold_form_fabrication: ['concrete_hold', 'delivered_c_channel', 'canceled'],
  concrete_hold: ['delivered_red_iron', 'delivered_c_channel', 'delivered_carport', 'canceled'],
  carport_fabrication: ['delivered_carport', 'canceled'],
  delivered_red_iron: ['new_parts_order'],
  delivered_c_channel: ['new_parts_order'],
  delivered_carport: ['new_parts_order'],
  new_parts_order: ['delivered_red_iron', 'delivered_c_channel', 'delivered_carport'],
  canceled: [], // Terminal state
};

// Check if transition is allowed
export function isValidTransition(fromStage: StageId, toStage: StageId): boolean {
  return STAGE_TRANSITIONS[fromStage]?.includes(toStage) || false;
}

// Get allowed next stages
export function getAllowedNextStages(currentStage: StageId): PipelineStage[] {
  const allowedIds = STAGE_TRANSITIONS[currentStage] || [];
  return PIPELINE_STAGES.filter(s => allowedIds.includes(s.id));
}

/**
 * Export for backward compatibility with existing schema
 */
export const STAGES = PIPELINE_STAGES.map(s => s.id);
