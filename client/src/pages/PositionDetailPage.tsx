import { useQuery } from "@tanstack/react-query";
import { IconAlertCircle, IconArrowLeft, IconLock } from "@tabler/icons-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PositionMeta } from "@/components/PositionMeta";
import type { Position } from "@/lib/types";

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
      <Link to={list} className="inline-flex items-center gap-1 text-sm underline"><IconArrowLeft className="size-4" aria-hidden />Volver a las posiciones</Link>
      {isPending ? (
        <p role="status">Cargando…</p>
      ) : error ? (
        <p role="alert" className="inline-flex items-center gap-2 text-destructive"><IconAlertCircle className="size-5" aria-hidden />{error.message}</p>
      ) : (
        <article className="space-y-3">
          <h1 className="text-2xl font-bold">{p.title}</h1>
          <PositionMeta p={p} />
          {p.status === "CLOSED" && <p className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm font-medium"><IconLock className="size-4" aria-hidden />Posición cerrada</p>}
          <p className="whitespace-pre-line">{p.description}</p>
        </article>
      )}
    </div>
  );
}
