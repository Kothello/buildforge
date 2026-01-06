import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

/**
 * Hook to fetch the current authenticated user
 * Queries GET /api/user and caches the result
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user");
      return response as unknown as User;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry on 401/403
  });
}
