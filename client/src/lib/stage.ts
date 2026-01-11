/**
 * Stage Normalization Utilities
 * 
 * Single source of truth for normalizing stage IDs across the app.
 * Handles variations in stage key formats from URL params, DB, and UI.
 */

import { PIPELINE_STAGES, type StageId } from "@shared/pipelineStages";

/**
 * Aliases mapping various formats to canonical stage IDs
 * DB may store different formats, URLs may have different casing, etc.
 */
const STAGE_ALIASES: Record<string, StageId> = {
  // Working Lead variations
  "workinglead": "working_lead",
  "working_lead": "working_lead",
  "working-lead": "working_lead",
  "working lead": "working_lead",
  "new": "working_lead", // Legacy "new" stage maps to working_lead
  
  // Callbacks variations
  "callbacks": "callbacks",
  "callback": "callbacks",
  "call_back": "callbacks",
  "call-back": "callbacks",
  "call back": "callbacks",
  
  // Sold Building variations
  "sold_building": "sold_building",
  "sold-building": "sold_building",
  "sold building": "sold_building",
  "soldbuilding": "sold_building",
  "sold_buildings": "sold_building",
  "sold-buildings": "sold_building",
  "sold buildings": "sold_building",
  "soldbuildings": "sold_building",
  
  // Welcome Stage variations
  "welcome_stage": "welcome_stage",
  "welcome-stage": "welcome_stage",
  "welcome stage": "welcome_stage",
  "welcomestage": "welcome_stage",
  "welcome": "welcome_stage",
  
  // Storage variations
  "storage": "storage",
  
  // Carport variations
  "carport": "carport",
  
  // Building Preparation variations
  "building_preparation": "building_preparation",
  "building-preparation": "building_preparation",
  "building preparation": "building_preparation",
  "buildingpreparation": "building_preparation",
  
  // Building Finalization variations
  "building_finalization": "building_finalization",
  "building-finalization": "building_finalization",
  "building finalization": "building_finalization",
  "buildingfinalization": "building_finalization",
  
  // Pending Delivery Date variations
  "pending_delivery_date": "pending_delivery_date",
  "pending-delivery-date": "pending_delivery_date",
  "pending delivery date": "pending_delivery_date",
  "pendingdeliverydate": "pending_delivery_date",
  
  // Permit Hold variations
  "permit_hold": "permit_hold",
  "permit-hold": "permit_hold",
  "permit hold": "permit_hold",
  "permithold": "permit_hold",
  
  // Red Iron Fabrication variations
  "red_iron_fabrication": "red_iron_fabrication",
  "red-iron-fabrication": "red_iron_fabrication",
  "red iron fabrication": "red_iron_fabrication",
  "redironfabrication": "red_iron_fabrication",
  
  // Cold Form Fabrication variations
  "cold_form_fabrication": "cold_form_fabrication",
  "cold-form-fabrication": "cold_form_fabrication",
  "cold form fabrication": "cold_form_fabrication",
  "coldformfabrication": "cold_form_fabrication",
  
  // Concrete Hold variations
  "concrete_hold": "concrete_hold",
  "concrete-hold": "concrete_hold",
  "concrete hold": "concrete_hold",
  "concretehold": "concrete_hold",
  
  // Carport Fabrication variations
  "carport_fabrication": "carport_fabrication",
  "carport-fabrication": "carport_fabrication",
  "carport fabrication": "carport_fabrication",
  "carportfabrication": "carport_fabrication",
  
  // Delivered Red Iron variations
  "delivered_red_iron": "delivered_red_iron",
  "delivered-red-iron": "delivered_red_iron",
  "delivered red iron": "delivered_red_iron",
  "deliveredrediron": "delivered_red_iron",
  
  // Delivered C-Channel variations
  "delivered_c_channel": "delivered_c_channel",
  "delivered-c-channel": "delivered_c_channel",
  "delivered c channel": "delivered_c_channel",
  "deliveredcchannel": "delivered_c_channel",
  
  // Delivered Carport variations
  "delivered_carport": "delivered_carport",
  "delivered-carport": "delivered_carport",
  "delivered carport": "delivered_carport",
  "deliveredcarport": "delivered_carport",
  
  // New Parts Order variations
  "new_parts_order": "new_parts_order",
  "new-parts-order": "new_parts_order",
  "new parts order": "new_parts_order",
  "newpartsorder": "new_parts_order",
  
  // Canceled variations
  "canceled": "canceled",
  "cancelled": "canceled",
  "cancel": "canceled",
};

/**
 * Normalize a stage ID from any format to canonical format
 * 
 * @param raw - Raw stage value from URL, DB, or UI
 * @returns Canonical stage ID or null if empty/invalid
 */
export function normalizeStageId(raw: string | null | undefined): StageId | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  
  // Normalize: trim, lowercase, replace spaces/hyphens with underscores
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
  
  // Check alias map first
  if (normalized in STAGE_ALIASES) {
    return STAGE_ALIASES[normalized];
  }
  
  // Check if it's already a valid stage ID
  if (isValidStageId(normalized)) {
    return normalized as StageId;
  }
  
  // Try to find a partial match in canonical IDs
  const canonicalIds = PIPELINE_STAGES.map(s => s.id);
  const match = canonicalIds.find(id => id === normalized || normalized.includes(id) || id.includes(normalized));
  
  return match || null;
}

/**
 * Check if a string is a valid canonical stage ID
 */
export function isValidStageId(id: string): id is StageId {
  return PIPELINE_STAGES.some(s => s.id === id);
}

/**
 * Get all valid stage IDs
 */
export function getAllStageIds(): StageId[] {
  return PIPELINE_STAGES.map(s => s.id);
}

/**
 * Normalize stage ID and return original if normalization fails
 * Useful for display purposes where you want to show something
 */
export function normalizeStageIdOrOriginal(raw: string | null | undefined): string {
  const normalized = normalizeStageId(raw);
  return normalized || raw || '';
}
