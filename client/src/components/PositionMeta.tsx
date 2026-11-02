import { IconArrowsExchange, IconBuilding, IconHome, IconMapPin } from "@tabler/icons-react";
import type { Mode } from "@app/shared";
import { cn } from "@/lib/utils";
import { modeLabels, type PositionSummary } from "@/lib/types";

const modeStyles = {
  REMOTE: { icon: IconHome, chip: "bg-teal-soft text-teal" },
  HYBRID: { icon: IconArrowsExchange, chip: "bg-accent-soft text-[#8a5200]" },
  ONSITE: { icon: IconBuilding, chip: "bg-primary-soft text-primary" },
} satisfies Record<Mode, { icon: unknown; chip: string }>;

// Ubicación y modalidad (chip de color) con iconos decorativos; el texto ya lo dice todo.
export function PositionMeta({ p, withCompany = false }: { p: PositionSummary; withCompany?: boolean }) {
  const { icon: ModeIcon, chip } = modeStyles[p.mode];
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
      {withCompany && <span className="font-medium text-foreground">{p.company.name}</span>}
      <span className="inline-flex items-center gap-1"><IconMapPin className="size-4" aria-hidden />{p.location}</span>
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", chip)}>
        <ModeIcon className="size-3.5" aria-hidden />{modeLabels[p.mode]}
      </span>
    </span>
  );
}
