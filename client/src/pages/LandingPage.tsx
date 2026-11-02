import { IconBuilding, IconClock, IconSearch, IconUsers } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Compass } from "@/components/Compass";
import { PositionRow } from "@/components/PositionRow";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { PositionPage } from "@/lib/types";

// Contenido estático de la empresa ficticia; las cifras son de ejemplo.
const stats = [
  { icon: IconBuilding, value: "120+", label: "empresas aliadas" },
  { icon: IconUsers, value: "3.500", label: "candidatos activos" },
  { icon: IconClock, value: "48 h", label: "tiempo medio de respuesta" },
];

export function LandingPage() {
  const navigate = useNavigate();
  const recent = useQuery({ queryKey: ["positions", "recent"], queryFn: () => api<PositionPage>("/positions?limit=4"), retry: false });
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    navigate(q ? `/positions?${new URLSearchParams({ q })}` : "/positions");
  };

  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 pb-24 pt-14 md:grid-cols-[1.25fr_1fr] md:pb-28 md:pt-20">
          <div className="space-y-5">
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] sm:text-6xl">Encuentra tu rumbo profesional</h1>
            <p className="max-w-md text-lg text-primary-soft/85">
              Brújula reúne las posiciones abiertas de empresas que buscan talento. Filtra por lo que te importa y aplica en un par de clics.
            </p>
          </div>
          <Compass className="mx-auto w-full max-w-[17rem] text-primary-soft md:max-w-xs" />
        </div>
      </section>

      {/* El buscador cabalga sobre el borde de la cabecera */}
      <div className="mx-auto -mt-9 max-w-5xl px-4">
        <form onSubmit={onSubmit} role="search" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4 shadow-lg shadow-ink/10 sm:flex-nowrap">
          <div className="min-w-0 flex-1 space-y-1">
            <label htmlFor="landing-q" className="text-sm font-semibold">Buscar posiciones</label>
            <input
              id="landing-q" name="q" placeholder="Ej. React, diseño, datos…"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button type="submit" variant="accent" className="h-11 px-6 text-base"><IconSearch className="size-5" aria-hidden />Buscar</Button>
        </form>
      </div>

      <div className="mx-auto max-w-5xl space-y-16 px-4 py-16">
        {recent.data && recent.data.items.length > 0 && (
          <section aria-labelledby="recent-title" className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="recent-title" className="text-2xl font-bold text-primary">Posiciones recientes</h2>
              <Link to="/positions" className="text-sm font-semibold text-primary underline underline-offset-4">Ver todas</Link>
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {recent.data.items.map((p) => (
                <li key={p.id}><PositionRow p={p} list="/" /></li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Brújula en cifras">
          <dl className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-4 bg-surface p-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[#8a5200]">
                  <s.icon className="size-6" aria-hidden />
                </span>
                <div className="flex flex-col">
                  <dd className="order-1 font-display text-3xl font-bold text-primary">{s.value}</dd>
                  <dt className="order-2 text-sm text-muted-foreground">{s.label}</dt>
                </div>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-primary px-8 py-8 text-primary-foreground">
          <div className="max-w-md space-y-1">
            <h2 className="text-2xl font-bold">¿Tu empresa está contratando?</h2>
            <p className="text-primary-soft/85">Publica una posición en minutos y revisa quién aplica desde un solo lugar.</p>
          </div>
          <Button asChild variant="accent" className="h-11 px-6 text-base"><Link to="/register">Crear cuenta de empresa</Link></Button>
        </section>
      </div>
    </>
  );
}
