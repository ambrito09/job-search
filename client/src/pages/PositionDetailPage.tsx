import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { modeLabels, type Position } from "@/lib/types";

export function PositionDetailPage() {
  const { id } = useParams();
  // La lista envía su URL (con filtros y página) en el estado; sin ella (enlace directo) se vuelve a la lista sin filtros.
  const list = (useLocation().state as { list?: string } | null)?.list ?? "/positions";
  const { data: p, error, isPending } = useQuery({
    queryKey: ["position", id],
    queryFn: () => api<Position>(`/positions/${id}`),
    retry: false,
  });

  return (
    <div className="space-y-4">
      <Link to={list} className="text-sm underline">← Volver a las posiciones</Link>
      {isPending ? (
        <p role="status">Cargando…</p>
      ) : error ? (
        <p role="alert" className="text-destructive">{error.message}</p>
      ) : (
        <article className="space-y-3">
          <h1 className="text-2xl font-bold">{p.title}</h1>
          <p className="text-muted-foreground">{p.company.name} · {p.location} · {modeLabels[p.mode]}</p>
          {p.status === "CLOSED" && <p className="inline-block rounded bg-muted px-2 py-1 text-sm font-medium">Posición cerrada</p>}
          <p className="whitespace-pre-line">{p.description}</p>
        </article>
      )}
    </div>
  );
}
