/**
 * Access control utilities for role-based UI visibility
 */

export type UserRole = "ADMIN" | "SALES_MANAGER" | "MANAGER" | "SALES_REP" | string;

/**
 * Check if user has manager-level access
 * @param role - User role string
 * @returns true if user is ADMIN, SALES_MANAGER, or MANAGER
 */
export function hasManagerAccess(role?: string): boolean {
  if (!role) return false;
  
  const managerRoles = ["ADMIN", "SALES_MANAGER", "MANAGER"];
  return managerRoles.includes(role.toUpperCase());
}

/**
 * Check if user has admin access
 * @param role - User role string
 * @returns true if user is ADMIN
 */
export function hasAdminAccess(role?: string): boolean {
  if (!role) return false;
  return role.toUpperCase() === "ADMIN";
}

/**
 * Check if user has sales rep access (or higher)
 * @param role - User role string
 * @returns true if user is SALES_REP, MANAGER, SALES_MANAGER, or ADMIN
 */
export function hasSalesAccess(role?: string): boolean {
  if (!role) return false;
  
  const salesRoles = ["ADMIN", "SALES_MANAGER", "MANAGER", "SALES_REP"];
  return salesRoles.includes(role.toUpperCase());
}
