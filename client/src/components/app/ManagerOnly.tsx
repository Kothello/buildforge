import React from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { hasManagerAccess } from "@/lib/access";

interface ManagerOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that only renders children for users with manager-level access
 * (ADMIN, SALES_MANAGER, or MANAGER roles)
 * 
 * @param children - Content to show for managers
 * @param fallback - Optional content to show for non-managers (default: null)
 */
export function ManagerOnly({ children, fallback = null }: ManagerOnlyProps) {
  const { data: user, isLoading } = useCurrentUser();
  
  // Don't render anything while loading to prevent flashing
  if (isLoading) {
    return null;
  }
  
  // Check if user has manager access
  if (hasManagerAccess(user?.role)) {
    return <>{children}</>;
  }
  
  // Render fallback for non-managers
  return <>{fallback}</>;
}
