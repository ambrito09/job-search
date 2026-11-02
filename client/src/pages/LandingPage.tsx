import { IconBuilding, IconClock, IconSearch, IconUsers } from "@tabler/icons-react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";

// Contenido estático de la empresa ficticia; las cifras son de ejemplo.
const stats = [
  { icon: IconBuilding, value: "120+", label: "empresas aliadas" },
  { icon: IconUsers, value: "3.500", label: "candidatos activos" },
  { icon: IconClock, value: "48 h", label: "tiempo medio de respuesta" },
];

export function LandingPage() {
  const navigate = useNavigate();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    navigate(q ? `/positions?${new URLSearchParams({ q })}` : "/positions");
  };

  return (
    <div className="space-y-16">
      <section className="space-y-6 py-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">Encuentra tu rumbo profesional</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Brújula conecta a personas con empresas que buscan talento. Explora posiciones abiertas, filtra por lo que
          te importa y aplica en un par de clics.
        </p>
        <form onSubmit={onSubmit} role="search" className="mx-auto flex max-w-xl items-end gap-2 text-left">
          <div className="flex-1">
            <FormField label="Buscar posiciones" name="q" placeholder="Ej. React, diseño, datos…" />
          </div>
          <Button type="submit" variant="accent"><IconSearch className="size-4" aria-hidden />Buscar</Button>
        </form>
      </section>

      <section aria-label="Brújula en cifras">
        <dl className="grid gap-6 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center rounded-md border border-border p-6 text-center">
              <s.icon className="mb-2 size-6 text-accent" aria-hidden />
              <dt className="order-2 text-sm text-muted-foreground">{s.label}</dt>
              <dd className="text-3xl font-bold text-primary">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
