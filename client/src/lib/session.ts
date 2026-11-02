import { useQuery, type QueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";

export type User = { id: number; email: string; role: "COMPANY" | "CANDIDATE"; name: string };

// /me define el estado de sesión: 401 significa "sin sesión" (null), no un error.
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: ({ signal }) =>
      api<User>("/me", { signal }).catch((e) => {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }),
    retry: false,
    staleTime: Infinity,
  });
}

// Al iniciar o cerrar sesión se descarta lo cacheado salvo la propia sesión: así no se muestran datos de la cuenta anterior.
export function resetSession(qc: QueryClient, user: User | null) {
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
  qc.setQueryData(["me"], user);
}
