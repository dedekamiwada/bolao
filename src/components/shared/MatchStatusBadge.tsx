import { Badge } from "@/components/ui/badge"
import type { MatchStatus } from "@/types/domain"

const STATUS_CONFIG: Record<MatchStatus, { label: string; variant: "live" | "success" | "secondary" | "warning" }> = {
  LIVE:      { label: "AO VIVO", variant: "live" },
  FINISHED:  { label: "Encerrado", variant: "success" },
  SCHEDULED: { label: "Agendado", variant: "secondary" },
  POSTPONED: { label: "Adiado", variant: "warning" },
}

export function MatchStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as MatchStatus] ?? STATUS_CONFIG.SCHEDULED
  return <Badge variant={config.variant}>{config.label}</Badge>
}
