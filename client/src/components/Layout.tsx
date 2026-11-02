import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useMe } from "@/lib/session";

export function Layout() {
  const { data: user, isPending } = useMe();
  const qc = useQueryClient();
  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => qc.setQueryData(["me"], null),
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <nav aria-label="Principal" className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/" className="mr-auto text-lg font-semibold">Brújula</Link>
          <Link to="/positions" className="text-sm hover:underline">Posiciones</Link>
          {isPending ? null : user ? (
            <>
              {user.role === "COMPANY" ? (
                <Link to="/company/positions/new" className="text-sm hover:underline">Nueva posición</Link>
              ) : (
                <Link to="/me/applications" className="text-sm hover:underline">Mis aplicaciones</Link>
              )}
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <Button variant="outline" size="sm" onClick={() => logout.mutate()}>Cerrar sesión</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login">Iniciar sesión</Link></Button>
              <Button variant="accent" size="sm" asChild><Link to="/register">Registrarse</Link></Button>
            </>
          )}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
