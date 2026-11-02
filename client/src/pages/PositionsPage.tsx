import { useQuery } from "@tanstack/react-query";
import { IconAlertCircle, IconChevronLeft, IconChevronRight, IconFilter, IconMoodEmpty, IconRefresh } from "@tabler/icons-react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { modes } from "@app/shared";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { PositionRow } from "@/components/PositionRow";
import { modeLabels, type PositionPage } from "@/lib/types";

// Todo el estado de la lista (q, location, mode, limit, offset) vive en la URL: copiarla reproduce la vista.
export function PositionsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.toString();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["positions", search],
    queryFn: () => api<PositionPage>(`/positions?${search}`),
    retry: false,
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = new URLSearchParams();
    for (const [k, v] of new FormData(e.currentTarget)) if (typeof v === "string" && v.trim()) next.set(k, v.trim());
    if (params.get("limit")) next.set("limit", params.get("limit")!);
    setParams(next);
  };
  const goTo = (offset: number) => {
    const next = new URLSearchParams(params);
    offset > 0 ? next.set("offset", String(offset)) : next.delete("offset");
    setParams(next);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Posiciones abiertas</h1>
      {/* key: al cambiar la URL (atrás/adelante) el formulario se rehace con sus valores */}
      <form key={search} onSubmit={onSubmit} role="search" className="grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <FormField label="Buscar" name="q" defaultValue={params.get("q") ?? ""} placeholder="Título o descripción" />
        <FormField label="Ubicación" name="location" defaultValue={params.get("location") ?? ""} />
        <FormField label="Modalidad" name="mode" defaultValue={params.get("mode") ?? ""}>
          <option value="">Todas</option>
          {modes.map((m) => <option key={m} value={m}>{modeLabels[m]}</option>)}
        </FormField>
        <Button type="submit"><IconFilter className="size-4" aria-hidden />Filtrar</Button>
      </form>

      {isPending ? (
        <p role="status">Cargando posiciones…</p>
      ) : error ? (
        <div role="alert" className="space-y-2">
          <p className="inline-flex items-center gap-2 text-destructive"><IconAlertCircle className="size-5" aria-hidden />{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}><IconRefresh className="size-4" aria-hidden />Reintentar</Button>
        </div>
      ) : data.items.length === 0 ? (
        <p className="inline-flex items-center gap-2 text-muted-foreground"><IconMoodEmpty className="size-5" aria-hidden />No hay posiciones que coincidan con los filtros.</p>
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {data.items.map((p) => (
              <li key={p.id}><PositionRow p={p} list={`/positions${search && `?${search}`}`} /></li>
            ))}
          </ul>
          <nav aria-label="Paginación" className="flex items-center gap-3">
            <Button variant="outline" size="sm" disabled={data.offset === 0} onClick={() => goTo(Math.max(0, data.offset - data.limit))}>
              <IconChevronLeft className="size-4" aria-hidden />Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {data.offset + 1}–{data.offset + data.items.length} de {data.total}
            </span>
            <Button variant="outline" size="sm" disabled={data.offset + data.items.length >= data.total} onClick={() => goTo(data.offset + data.limit)}>
              Siguiente<IconChevronRight className="size-4" aria-hidden />
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
