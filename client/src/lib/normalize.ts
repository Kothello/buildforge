/**
 * Normalize API responses to arrays safely.
 * Handles common response shapes: raw array, { leads: [] }, { data: [] }, or error objects.
 * 
 * @param response - The response data from an API call
 * @returns A safe array (empty if response is invalid)
 */
export function normalizeArray<T>(response: unknown): T[] {
  // Already an array
  if (Array.isArray(response)) {
    return response;
  }
  
  // Common wrapper formats
  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    
    // { leads: [...] }
    if (Array.isArray(obj.leads)) {
      return obj.leads;
    }
    
    // { data: [...] }
    if (Array.isArray(obj.data)) {
      return obj.data;
    }
    
    // { items: [...] }
    if (Array.isArray(obj.items)) {
      return obj.items;
    }
  }
  
  // Fallback: return empty array to prevent .filter/.map crashes
  return [];
}

/**
 * Extract the best error message from a failed response.
 * 
 * @param response - The fetch Response object
 * @returns A human-readable error message
 */
export async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return json.error || json.message || `Request failed with status ${response.status}`;
    } catch {
      return text || `Request failed with status ${response.status}`;
    }
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
