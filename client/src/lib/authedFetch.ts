/**
 * Auto-refresh fetch wrapper
 * 
 * Automatically attempts to refresh the access token when receiving a 401 response,
 * then retries the original request once. This prevents users from being logged out
 * when their access token expires during the day.
 */

// Module-level promise to ensure only one refresh happens at a time
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempts to refresh the session by calling the refresh endpoint
 */
async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return response.ok;
  } catch (error) {
    console.error("[authedFetch] Refresh failed:", error);
    return false;
  }
}

/**
 * Authenticated fetch wrapper with automatic token refresh
 * 
 * @param input - URL or Request object
 * @param init - Fetch options
 * @returns Response from the server
 * 
 * Behavior:
 * 1. Makes request with credentials: "include"
 * 2. If 401 received, attempts to refresh the session
 * 3. If refresh succeeds, retries the original request once
 * 4. If refresh fails or second request fails, returns the failed response
 * 
 * Note: Does not retry if the request is already to /api/auth/refresh or /api/auth/login
 */
export async function authedFetch(
  input: RequestInfo,
  init: RequestInit = {}
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof Request ? input.url : "";
  
  // Helper to perform the actual fetch
  const doFetch = () => fetch(input, { ...init, credentials: "include" });

  // Never try to refresh while refreshing or logging in (prevent infinite loops)
  if (
    url.includes("/api/auth/refresh") ||
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register")
  ) {
    return doFetch();
  }

  // Make the initial request
  let response = await doFetch();

  // If not 401, return immediately
  if (response.status !== 401) {
    return response;
  }

  // 401 received - attempt refresh
  console.log("[authedFetch] 401 received, attempting token refresh");

  // Use shared refresh promise to prevent multiple simultaneous refreshes
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }

  const refreshed = await refreshPromise;

  // If refresh failed, return the original 401 response
  if (!refreshed) {
    console.log("[authedFetch] Refresh failed, returning 401");
    return response;
  }

  // Refresh succeeded - retry the original request once
  console.log("[authedFetch] Refresh succeeded, retrying original request");
  return doFetch();
}
