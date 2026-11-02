import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconBriefcase, IconCompass, IconFileText, IconLayoutList, IconLogin, IconLogout, IconPlus, IconUserPlus } from "@tabler/icons-react";
import { Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { resetSession, useMe } from "@/lib/session";

const navLink = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-primary-soft hover:text-primary";

export function Layout() {
  const { data: user, isPending } = useMe();
  const qc = useQueryClient();
  const { pathname } = useLocation();
  const home = pathname === "/"; // la landing ocupa todo el ancho; el resto va en columna centrada
  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => resetSession(qc, null),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
        <nav aria-label="Principal" className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-4 py-2.5">
          <Link to="/" className="mr-auto inline-flex items-center gap-2 font-display text-xl font-bold text-primary">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-accent">
              <IconCompass className="size-5" aria-hidden />
            </span>
            Brújula
          </Link>
          <Link to="/positions" className={navLink}><IconBriefcase className="size-4" aria-hidden />Posiciones</Link>
          {isPending ? null : user ? (
            <>
              {user.role === "COMPANY" ? (
                <>
                  <Link to="/company/positions" className={navLink}><IconLayoutList className="size-4" aria-hidden />Mis posiciones</Link>
                  <Link to="/company/positions/new" className={navLink}><IconPlus className="size-4" aria-hidden />Nueva posición</Link>
                </>
              ) : (
                <Link to="/me/applications" className={navLink}><IconFileText className="size-4" aria-hidden />Mis aplicaciones</Link>
              )}
              <span className="ml-2 px-2 text-sm font-semibold text-primary">{user.name}</span>
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
      <main className={home ? "flex-1" : "mx-auto w-full max-w-5xl flex-1 px-4 py-10"}>
        {/* key: al cambiar de ruta se limpia un posible error de carga del trozo anterior */}
        <ChunkErrorBoundary key={pathname}>
          <Suspense fallback={<p role="status">Cargando…</p>}>
            <Outlet />
          </Suspense>
        </ChunkErrorBoundary>
      </main>
      <footer className="bg-ink text-primary-soft">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-6 text-sm">
          <IconCompass className="size-5 text-accent" aria-hidden />
          <span className="font-display font-semibold">Brújula</span>
          <span className="text-primary-soft/70">Bolsa de empleo de portafolio: las empresas publican y los candidatos aplican.</span>
          {/* Atribución exigida por la licencia gratuita de Icons8 para el favicon */}
          <a href="https://icons8.com/icon/compass" target="_blank" rel="noopener noreferrer" className="ml-auto text-primary-soft/70 underline underline-offset-4 hover:text-white">
            Icono por Icons8
          </a>
        </div>
      </footer>
    </div>
  );
}
