import { Lead } from "@shared/schema";
import { StageId } from "@shared/pipelineStages";

/**
 * Maps a lead's stage/status field to a canonical StageId.
 * This is the single source of truth for stage mapping across the application.
 * 
 * @param lead - The lead object with stage or status field
 * @returns The canonical StageId, or null if the stage is unknown
 */
export function mapLeadToStageId(lead: Lead | { stage?: string; status?: string }): StageId | null {
  const raw = String(lead.stage || lead.status || "").toLowerCase();
  
  switch (raw) {
    case "working":
    case "working_lead":
      return "working_lead";
    case "callbacks":
    case "callback":
      return "callbacks";
    case "welcome_stage":
    case "welcome":
    case "new":
      return "welcome_stage";
    case "storage":
      return "storage";
    case "carport":
      return "carport";
    case "sold_building":
    case "sold":
      return "sold_building";
    case "building_preparation":
      return "building_preparation";
    case "building_finalization":
      return "building_finalization";
    case "pending_delivery_date":
      return "pending_delivery_date";
    case "permit_hold":
      return "permit_hold";
    case "red_iron_fabrication":
      return "red_iron_fabrication";
    case "cold_form_fabrication":
      return "cold_form_fabrication";
    case "concrete_hold":
      return "concrete_hold";
    case "carport_fabrication":
      return "carport_fabrication";
    case "delivered_red_iron":
      return "delivered_red_iron";
    case "delivered_c_channel":
      return "delivered_c_channel";
    case "delivered_carport":
      return "delivered_carport";
    case "new_parts_order":
      return "new_parts_order";
    case "canceled":
    case "cancelled":
      return "canceled";
    default:
      return null;
  }
}
