import { IconAlertCircle, IconArrowLeft, IconMail, IconMoodEmpty } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import type { Applicant, Position } from "@/lib/types";

export function ApplicantsPage() {
  const { id } = useParams();
  const position = useQuery({ queryKey: ["position", id], queryFn: () => api<Position>(`/positions/${id}`), retry: false });
  const { data, error, isPending } = useQuery({
    queryKey: ["applicants", id],
    queryFn: () => api<Applicant[]>(`/positions/${id}/applications`),
    retry: false,
  });

  return (
    <div className="space-y-4">
      <Link to={`/positions/${id}`} className="inline-flex items-center gap-1 text-sm underline">
        <IconArrowLeft className="size-4" aria-hidden />Volver a la posición
      </Link>
      <h1 className="text-2xl font-bold">Aplicantes{position.data && `: ${position.data.title}`}</h1>
      {isPending ? (
        <p role="status">Cargando aplicantes…</p>
      ) : error ? (
        <p role="alert" className="inline-flex items-center gap-2 text-destructive">
          <IconAlertCircle className="size-5" aria-hidden />{error.message}
        </p>
      ) : data.length === 0 ? (
        <p className="inline-flex items-center gap-2 text-muted-foreground">
          <IconMoodEmpty className="size-5" aria-hidden />Aún no hay aplicantes.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {data.map((a) => (
            <li key={a.id} className="space-y-1 px-4 py-3">
              <p className="font-medium">{a.candidate.name}</p>
              <a href={`mailto:${a.candidate.email}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground underline">
                <IconMail className="size-4" aria-hidden />{a.candidate.email}
              </a>
              {a.message && <p className="whitespace-pre-line text-sm">{a.message}</p>}
              <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("es")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
