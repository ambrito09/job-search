import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "./api";

export type User = { id: number; email: string; role: "COMPANY" | "CANDIDATE"; name: string };

// /me define el estado de sesión: 401 significa "sin sesión" (null), no un error.
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () =>
      api<User>("/me").catch((e) => {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }),
    retry: false,
    staleTime: Infinity,
  });
}
