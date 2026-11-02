import { IconArrowsExchange, IconBuilding, IconBuildingSkyscraper, IconHome, IconMapPin } from "@tabler/icons-react";
import type { Mode } from "@app/shared";
import { modeLabels, type Position } from "@/lib/types";

const modeIcons = { REMOTE: IconHome, HYBRID: IconArrowsExchange, ONSITE: IconBuilding } satisfies Record<Mode, unknown>;

// Empresa · ubicación · modalidad, con iconos decorativos (el texto ya lo dice todo).
export function PositionMeta({ p }: { p: Position }) {
  const ModeIcon = modeIcons[p.mode];
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1"><IconBuildingSkyscraper className="size-4" aria-hidden />{p.company.name}</span>
      <span className="inline-flex items-center gap-1"><IconMapPin className="size-4" aria-hidden />{p.location}</span>
      <span className="inline-flex items-center gap-1"><ModeIcon className="size-4" aria-hidden />{modeLabels[p.mode]}</span>
    </span>
  );
}
