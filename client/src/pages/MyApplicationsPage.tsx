import { IconAlertCircle, IconLock, IconMoodEmpty } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PositionMeta } from "@/components/PositionMeta";
import { api } from "@/lib/api";
import type { MyApplication } from "@/lib/types";

export function MyApplicationsPage() {
  const { data, error, isPending } = useQuery({
    queryKey: ["myApplications"],
    queryFn: ({ signal }) => api<MyApplication[]>("/me/applications", { signal }),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Mis aplicaciones</h1>
      {isPending ? (
        <p role="status">Cargando tus aplicaciones…</p>
      ) : error ? (
        <p role="alert" className="inline-flex items-center gap-2 text-destructive"><IconAlertCircle className="size-5" aria-hidden />{error.message}</p>
      ) : data.length === 0 ? (
        <p className="inline-flex items-center gap-2 text-muted-foreground">
          <IconMoodEmpty className="size-5" aria-hidden />Aún no has aplicado a ninguna posición. <Link to="/positions" className="underline">Explora las abiertas</Link>
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {data.map((a) => (
            <li key={a.id} className="space-y-1 px-4 py-3">
              <Link to={`/positions/${a.position.id}`} className="flex items-center gap-2 font-medium hover:underline">
                {a.position.title}
                {a.position.status === "CLOSED" && (
                  <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-normal"><IconLock className="size-3" aria-hidden />Cerrada</span>
                )}
              </Link>
              <PositionMeta p={a.position} withCompany />
              {a.message && <p className="whitespace-pre-line text-sm">{a.message}</p>}
              <p className="text-xs text-muted-foreground">Aplicaste el {new Date(a.createdAt).toLocaleDateString("es")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
