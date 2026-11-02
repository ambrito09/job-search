import { IconAlertCircle, IconArrowLeft, IconCircleX, IconLock, IconLockOpen, IconUsers } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PositionMeta } from "@/components/PositionMeta";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useMe } from "@/lib/session";
import type { Position } from "@/lib/types";

export function PositionDetailPage() {
  const { id } = useParams();
  // La lista envía su URL (con filtros y página) en el estado; sin ella (enlace directo) se vuelve a la lista sin filtros.
  const list = (useLocation().state as { list?: string } | null)?.list ?? "/positions";
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: p, error, isPending } = useQuery({
    queryKey: ["position", id],
    queryFn: () => api<Position>(`/positions/${id}`),
    retry: false,
  });
  const [confirming, setConfirming] = useState(false);
  const setStatus = useMutation({
    mutationFn: (status: Position["status"]) => api<Position>(`/positions/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: (updated) => {
      setConfirming(false);
      qc.setQueryData(["position", id], updated);
      qc.invalidateQueries({ queryKey: ["positions"] });
      qc.invalidateQueries({ queryKey: ["myPositions"] });
    },
  });
  const isOwner = me?.role === "COMPANY" && me.id === p?.company.id;

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
          {isOwner && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild><Link to={`/company/positions/${p.id}/applicants`}><IconUsers className="size-4" aria-hidden />Ver aplicantes</Link></Button>
              {p.status === "CLOSED" ? (
                <Button variant="outline" onClick={() => setStatus.mutate("OPEN")} disabled={setStatus.isPending}><IconLockOpen className="size-4" aria-hidden />Reabrir posición</Button>
              ) : confirming ? (
                <div role="group" aria-label="Confirmar cierre" className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">¿Cerrar esta posición? Dejará de aparecer en la lista pública.</span>
                  <Button variant="destructive" size="sm" onClick={() => setStatus.mutate("CLOSED")} disabled={setStatus.isPending}>Sí, cerrar</Button>
                  <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>Cancelar</Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setConfirming(true)}><IconCircleX className="size-4" aria-hidden />Cerrar posición</Button>
              )}
            </div>
          )}
          {setStatus.error && <p role="alert" className="text-sm text-destructive">{setStatus.error.message}</p>}
        </article>
      )}
    </div>
  );
}
