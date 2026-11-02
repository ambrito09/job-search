import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive";

// Etiqueta + control (input o select) + mensaje de error asociado para lectores de pantalla.
export function FormField({
  label, error, children, multiline, ...props
}: { label: string; error?: string; children?: ReactNode; multiline?: boolean } & ComponentProps<"input">) {
  const id = useId();
  const common = { id, "aria-invalid": !!error, "aria-describedby": error ? `${id}-error` : undefined };
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      {multiline ? (
        <textarea {...common} rows={6} className={cn(control, "h-auto py-2")} {...(props as ComponentProps<"textarea">)} />
      ) : children ? (
        <select {...common} className={control} {...(props as ComponentProps<"select">)}>{children}</select>
      ) : (
        <input {...common} {...props} className={cn(control, props.className)} />
      )}
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
