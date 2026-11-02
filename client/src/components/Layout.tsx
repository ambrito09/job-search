import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconBriefcase, IconCompass, IconFileText, IconLayoutList, IconLogin, IconLogout, IconPlus, IconUserPlus } from "@tabler/icons-react";
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
          <Link to="/" className="mr-auto inline-flex items-center gap-2 text-lg font-semibold text-primary"><IconCompass className="size-6" aria-hidden />Brújula</Link>
          <Link to="/positions" className="inline-flex items-center gap-1 text-sm hover:underline"><IconBriefcase className="size-4" aria-hidden />Posiciones</Link>
          {isPending ? null : user ? (
            <>
              {user.role === "COMPANY" ? (
                <>
                  <Link to="/company/positions" className="inline-flex items-center gap-1 text-sm hover:underline"><IconLayoutList className="size-4" aria-hidden />Mis posiciones</Link>
                  <Link to="/company/positions/new" className="inline-flex items-center gap-1 text-sm hover:underline"><IconPlus className="size-4" aria-hidden />Nueva posición</Link>
                </>
              ) : (
                <Link to="/me/applications" className="inline-flex items-center gap-1 text-sm hover:underline"><IconFileText className="size-4" aria-hidden />Mis aplicaciones</Link>
              )}
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <Button variant="outline" size="sm" onClick={() => logout.mutate()}><IconLogout className="size-4" aria-hidden />Cerrar sesión</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login"><IconLogin className="size-4" aria-hidden />Iniciar sesión</Link></Button>
              <Button variant="accent" size="sm" asChild><Link to="/register"><IconUserPlus className="size-4" aria-hidden />Registrarse</Link></Button>
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
