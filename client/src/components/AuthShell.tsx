import type { ReactNode } from "react";
import { Compass } from "@/components/Compass";

// Marco de login y registro: panel de marca a la izquierda (solo desde tablet) y el formulario a la derecha.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-3xl overflow-hidden rounded-2xl border border-border shadow-lg shadow-ink/10 md:grid-cols-[1fr_1.15fr]">
      <aside className="hidden flex-col justify-between gap-8 bg-ink p-8 text-white md:flex">
        <Compass className="w-36 text-primary-soft" />
        <p className="font-display text-2xl font-bold leading-snug">Tu próximo rumbo empieza aquí.</p>
      </aside>
      <div className="bg-surface p-6 sm:p-8">{children}</div>
    </div>
  );
}
