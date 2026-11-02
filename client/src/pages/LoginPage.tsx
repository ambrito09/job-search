import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconLogin } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { loginSchema, type LoginInput } from "@app/shared";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useMe, type User } from "@/lib/session";

export function LoginPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const login = useMutation({
    mutationFn: (v: LoginInput) => api<User>("/auth/login", { method: "POST", json: v }),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      navigate(from, { replace: true });
    },
  });

  if (me) return <Navigate to="/" replace />;
  return (
    <form onSubmit={handleSubmit((v) => login.mutate(v))} noValidate className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      <FormField label="Correo" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <FormField label="Contraseña" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
      {login.error && <p role="alert" className="text-sm text-destructive">{login.error.message}</p>}
      <Button type="submit" className="w-full" disabled={login.isPending}><IconLogin className="size-4" aria-hidden />Entrar</Button>
      <p className="text-sm text-muted-foreground">
        ¿No tienes cuenta? <Link to="/register" className="underline">Regístrate</Link>
      </p>
    </form>
  );
}
