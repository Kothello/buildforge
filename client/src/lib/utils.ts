import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildExportUrl(entityType: string, params?: Record<string, string>): string {
  // Build URL with .csv extension: /api/exports/{entityType}.csv
  const url = new URL(`/api/exports/${entityType}.csv`, window.location.origin);
  
  // Add query parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });
  }
  
  // Set default limit to 10000, clamped to max 10000
  const limit = params?.limit ? Math.min(parseInt(params.limit), 10000) : 10000;
  url.searchParams.set('limit', limit.toString());
  
  return url.toString();
}
