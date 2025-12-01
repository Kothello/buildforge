import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        return res.json();
      },
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

type UnknownObject = Record<string, unknown>;

export async function apiRequest(
  url: string,
  options?: RequestInit & { body?: UnknownObject }
) {
  const { body, ...opts } = options || {};
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...opts.headers,
    },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status >= 500) {
      throw new Error(`${res.status}: ${res.statusText}`);
    }

    throw new Error(`${res.status}: ${await res.text()}`);
  }

  return res.json();
}
