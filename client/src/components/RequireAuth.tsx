import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMe, type User } from "@/lib/session";

// Sin sesión redirige a /login (recordando a dónde ir); con otro rol muestra 403.
export function RequireAuth({ role, children }: { role?: User["role"]; children: ReactNode }) {
  const { data: user, isPending } = useMe();
  const location = useLocation();
  if (isPending) return <p>Cargando…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <p role="alert">403 · No tienes permiso para ver esta página</p>;
  return <>{children}</>;
}
