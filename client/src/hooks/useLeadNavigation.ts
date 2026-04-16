import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

/**
 * Hook to provide consistent lead navigation across the application.
 * 
 * Managers/Admins navigate to: /leads/:id
 * Reps navigate to: /sales/leads/:id
 * 
 * This ensures all "View Lead" actions use the same routing pattern.
 */
export function useLeadNavigation() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const isManagerOrAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  return {
    /**
     * Navigate to the lead detail page
     * @param leadId - The ID of the lead to view
     */
    viewLead(leadId: string) {
      if (isManagerOrAdmin) {
        navigate(`/leads/${leadId}`);
      } else {
        navigate(`/sales/leads/${leadId}`);
      }
    },

    /**
     * Get the path for a lead detail page (useful for Link components)
     * @param leadId - The ID of the lead
     * @returns The path to the lead detail page
     */
    getLeadPath(leadId: string): string {
      return isManagerOrAdmin ? `/leads/${leadId}` : `/sales/leads/${leadId}`;
    },

    /**
     * Check if current user is a manager/admin
     */
    isManagerOrAdmin,
  };
}
