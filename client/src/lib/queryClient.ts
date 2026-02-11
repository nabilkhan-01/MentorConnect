import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper to throw detailed errors
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// ✅ FIXED: apiRequest now handles FormData correctly
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const readOnlyRaw = String((import.meta as any).env?.VITE_READ_ONLY_MODE ?? "1").toLowerCase();
  const isReadOnlyMode = !["0", "false", "off", "no"].includes(readOnlyRaw);

  const upperMethod = method.toUpperCase();
  const isWrite = !(upperMethod === "GET" || upperMethod === "HEAD" || upperMethod === "OPTIONS");
  const isAuthWrite = url === "/api/login" || url === "/api/logout";

  if (isReadOnlyMode && isWrite && !isAuthWrite) {
    throw new Error("403: Read-only mode");
  }

  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;

  const res = await fetch(url, {
    method,
    headers: !isFormData && data ? { "Content-Type": "application/json" } : {},
    body: data
      ? isFormData
        ? (data as FormData)
        : JSON.stringify(data)
      : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Custom query function with 401 handling
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Query client config
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
