import { cn } from "@/lib/utils";

const tones = [
  "bg-primary text-primary-foreground",
  "bg-accent text-accent-foreground",
  "bg-teal text-white",
  "bg-ink text-primary-soft",
];

// Iniciales de la empresa sobre un color estable (el mismo id da siempre el mismo color).
export function Monogram({ name, id, className }: { name: string; id: number; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl font-display text-base font-bold", tones[id % tones.length], className)}
    >
      {initials}
    </span>
  );
}
