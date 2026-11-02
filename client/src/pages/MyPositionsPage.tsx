import { IconAlertCircle, IconLock, IconMoodEmpty, IconPlus, IconUsers } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PositionMeta } from "@/components/PositionMeta";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { MyPosition } from "@/lib/types";

export function MyPositionsPage() {
  const { data, error, isPending } = useQuery({
    queryKey: ["myPositions"],
    queryFn: ({ signal }) => api<MyPosition[]>("/me/positions", { signal }),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-primary">Mis posiciones</h1>
        <Button asChild variant="accent"><Link to="/company/positions/new"><IconPlus className="size-4" aria-hidden />Nueva posición</Link></Button>
      </div>
      {isPending ? (
        <p role="status">Cargando tus posiciones…</p>
      ) : error ? (
        <p role="alert" className="inline-flex items-center gap-2 text-destructive"><IconAlertCircle className="size-5" aria-hidden />{error.message}</p>
      ) : data.length === 0 ? (
        <p className="inline-flex items-center gap-2 text-muted-foreground"><IconMoodEmpty className="size-5" aria-hidden />Aún no has publicado posiciones.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {data.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <Link to={`/positions/${p.id}`} className="min-w-0 space-y-1 hover:underline">
                <span className="flex items-center gap-2 font-medium">
                  {p.title}
                  {p.status === "CLOSED" && (
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"><IconLock className="size-3" aria-hidden />Cerrada</span>
                  )}
                </span>
                <PositionMeta p={p} />
              </Link>
              <Button asChild variant="outline" size="sm">
                <Link to={`/company/positions/${p.id}/applicants`}>
                  <IconUsers className="size-4" aria-hidden />
                  {p._count.applications} {p._count.applications === 1 ? "aplicante" : "aplicantes"}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
