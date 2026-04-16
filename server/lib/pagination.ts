/**
 * Cursor-based pagination utilities for leads API
 * 
 * Cursor encodes: { t: timestamp_ms, id: string }
 * Sort order: createdAt DESC, id DESC
 */

export interface CursorData {
  t: number;  // timestamp in milliseconds
  id: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Encode cursor data to opaque base64 string
 */
export function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

/**
 * Decode cursor string back to cursor data
 * Returns null if invalid
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const data = JSON.parse(decoded);
    if (typeof data.t === 'number' && typeof data.id === 'string') {
      return data as CursorData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clamp limit to valid range
 */
export function clampLimit(limit: number | undefined, defaultLimit = 50, maxLimit = 200): number {
  if (!limit || isNaN(limit)) return defaultLimit;
  return Math.max(1, Math.min(limit, maxLimit));
}

/**
 * Build cursor from a lead record
 */
export function buildCursorFromLead(lead: { id: string; createdAt: Date | string }): string {
  const timestamp = lead.createdAt instanceof Date 
    ? lead.createdAt.getTime() 
    : new Date(lead.createdAt).getTime();
  return encodeCursor({ t: timestamp, id: lead.id });
}
