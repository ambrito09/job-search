import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { modes, positionCreateSchema, type PositionCreateInput } from "@app/shared";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { modeLabels, type Position } from "@/lib/types";

export function NewPositionPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<PositionCreateInput>({
    resolver: zodResolver(positionCreateSchema),
    defaultValues: { mode: "REMOTE" },
  });
  const create = useMutation({
    mutationFn: (v: PositionCreateInput) => api<Position>("/positions", { method: "POST", json: v }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["positions"] });
      qc.invalidateQueries({ queryKey: ["myPositions"] });
      navigate(`/company/positions/${p.id}/applicants`);
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => create.mutate(v))} noValidate className="mx-auto max-w-xl space-y-4">
      <h1 className="text-3xl font-bold text-primary">Nueva posición</h1>
      <FormField label="Título" error={errors.title?.message} {...register("title")} />
      <FormField label="Descripción" multiline error={errors.description?.message} {...register("description")} />
      <FormField label="Ubicación" error={errors.location?.message} {...register("location")} />
      <FormField label="Modalidad" error={errors.mode?.message} {...register("mode")}>
        {modes.map((m) => <option key={m} value={m}>{modeLabels[m]}</option>)}
      </FormField>
      {create.error && <p role="alert" className="text-sm text-destructive">{create.error.message}</p>}
      <Button type="submit" disabled={create.isPending}><IconPlus className="size-4" aria-hidden />Publicar posición</Button>
    </form>
  );
}
