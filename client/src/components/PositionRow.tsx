import { Link } from "react-router-dom";
import { Monogram } from "@/components/Monogram";
import { PositionMeta } from "@/components/PositionMeta";
import type { Position } from "@/lib/types";

// Fila de posición: monograma de la empresa, título y datos. `list` es la URL a la que "Volver" regresa desde el detalle.
export function PositionRow({ p, list }: { p: Position; list: string }) {
  return (
    <Link
      to={`/positions/${p.id}`}
      state={{ list }}
      className="group flex items-center gap-4 border-l-4 border-transparent bg-surface px-4 py-4 transition-colors hover:border-accent hover:bg-primary-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <Monogram name={p.company.name} id={p.company.id} />
      <span className="min-w-0 flex-1 space-y-1">
        <span className="block font-display text-lg font-semibold leading-snug text-primary">{p.title}</span>
        <PositionMeta p={p} withCompany />
      </span>
    </Link>
  );
}
