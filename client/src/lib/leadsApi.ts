/**
 * Leads API with cursor-based pagination support
 */

import { authedFetch } from "./authedFetch";

export interface LeadsPageResponse {
  items: any[];
  nextCursor: string | null;
}

export interface FetchLeadsPageParams {
  mine?: boolean;
  stage?: string | null;
  cursor?: string | null;
  limit?: number;
}

/**
 * Fetch a page of leads using cursor-based pagination
 */
export async function fetchLeadsPage({
  mine = false,
  stage,
  cursor,
  limit = 50,
}: FetchLeadsPageParams): Promise<LeadsPageResponse> {
  const params = new URLSearchParams();
  params.set("paged", "1");
  params.set("limit", String(limit));
  
  if (mine) {
    params.set("mine", "true");
  }
  
  if (stage && stage !== "ALL") {
    params.set("stage", stage);
  }
  
  if (cursor) {
    params.set("cursor", cursor);
  }
  
  const url = `/api/leads?${params.toString()}`;
  const response = await authedFetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch leads: ${response.status}`);
  }
  
  return response.json();
}
