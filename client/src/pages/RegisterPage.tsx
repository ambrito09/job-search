import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconUserPlus } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { registerSchema, type RegisterInput } from "@app/shared";
import { AuthShell } from "@/components/AuthShell";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useMe, type User } from "@/lib/session";

export function RegisterPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "CANDIDATE" },
  });
  const signUp = useMutation({
    mutationFn: (v: RegisterInput) => api<User>("/auth/register", { method: "POST", json: v }),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      navigate("/", { replace: true });
    },
  });

  if (me) return <Navigate to="/" replace />;
  return (
    <AuthShell>
    <form onSubmit={handleSubmit((v) => signUp.mutate(v))} noValidate className="space-y-4">
      <h1 className="text-3xl font-bold text-primary">Crear cuenta</h1>
      <FormField label="Soy" error={errors.role?.message} {...register("role")}>
        <option value="CANDIDATE">Candidato/a</option>
        <option value="COMPANY">Empresa</option>
      </FormField>
      <FormField label="Nombre" autoComplete="name" error={errors.name?.message} {...register("name")} />
      <FormField label="Correo" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <FormField label="Contraseña" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
      {signUp.error && <p role="alert" className="text-sm text-destructive">{signUp.error.message}</p>}
      <Button type="submit" className="w-full" disabled={signUp.isPending}><IconUserPlus className="size-4" aria-hidden />Registrarme</Button>
      <p className="text-sm text-muted-foreground">
        ¿Ya tienes cuenta? <Link to="/login" className="underline">Inicia sesión</Link>
      </p>
    </form>
    </AuthShell>
  );
}
