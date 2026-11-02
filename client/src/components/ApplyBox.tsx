import { zodResolver } from "@hookform/resolvers/zod";
import { IconCheck, IconLogin, IconSend } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "react-router-dom";
import { applySchema, type ApplyInput } from "@app/shared";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useMe } from "@/lib/session";
import type { MyApplication, Position } from "@/lib/types";

// Bloque "Aplicar" del detalle: visitante → login, candidato → formulario (o aviso si ya aplicó), empresa → nada.
export function ApplyBox({ position }: { position: Position }) {
  const { data: me } = useMe();
  const location = useLocation();
  const qc = useQueryClient();
  const isCandidate = me?.role === "CANDIDATE";
  const mine = useQuery({
    queryKey: ["myApplications"],
    queryFn: ({ signal }) => api<MyApplication[]>("/me/applications", { signal }),
    enabled: isCandidate,
  });
  const { register, handleSubmit, formState: { errors } } = useForm<ApplyInput>({ resolver: zodResolver(applySchema) });
  const apply = useMutation({
    mutationFn: (v: ApplyInput) =>
      api(`/positions/${position.id}/applications`, { method: "POST", json: { message: v.message || undefined } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myApplications"] }),
  });

  if (position.status === "CLOSED" || me?.role === "COMPANY") return null;
  if (!me) {
    return (
      <Button asChild variant="accent">
        <Link to="/login" state={{ from: location.pathname }}><IconLogin className="size-4" aria-hidden />Inicia sesión para aplicar</Link>
      </Button>
    );
  }
  if (apply.isSuccess || mine.data?.some((a) => a.positionId === position.id)) {
    return (
      <p role="status" className="inline-flex items-center gap-2 rounded bg-muted px-3 py-2 text-sm font-medium">
        <IconCheck className="size-4" aria-hidden />Ya aplicaste a esta posición
      </p>
    );
  }
  return (
    <form onSubmit={handleSubmit((v) => apply.mutate(v))} noValidate className="max-w-xl space-y-3">
      <FormField label="Mensaje (opcional)" multiline error={errors.message?.message} {...register("message")} />
      {apply.error && <p role="alert" className="text-sm text-destructive">{apply.error.message}</p>}
      <Button type="submit" variant="accent" disabled={apply.isPending}><IconSend className="size-4" aria-hidden />Aplicar</Button>
    </form>
  );
}
