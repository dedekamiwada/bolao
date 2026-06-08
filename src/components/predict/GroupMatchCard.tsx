"use client"

import { useState, useEffect, useRef } from "react"
import { TeamFlag } from "@/components/shared/TeamFlag"
import { CountdownTimer } from "@/components/shared/CountdownTimer"
import { MatchStatusBadge } from "@/components/shared/MatchStatusBadge"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils"

interface Team {
  id: number
  fifa_code: string
  name: string
  flag_url: string | null
}

interface GroupMatchCardProps {
  matchId: number
  homeTeam: Team | null
  awayTeam: Team | null
  scheduledAt: string
  status: string
  officialHomeScore: number | null
  officialAwayScore: number | null
  predictedHomeScore: number | undefined
  predictedAwayScore: number | undefined
  isLocked: boolean
  onChange: (matchId: number, home: number, away: number) => void
}

export function GroupMatchCard({
  matchId,
  homeTeam,
  awayTeam,
  scheduledAt,
  status,
  officialHomeScore,
  officialAwayScore,
  predictedHomeScore,
  predictedAwayScore,
  isLocked,
  onChange,
}: GroupMatchCardProps) {
  const [home, setHome] = useState(predictedHomeScore?.toString() ?? "")
  const [away, setAway] = useState(predictedAwayScore?.toString() ?? "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setHome(predictedHomeScore?.toString() ?? "")
    setAway(predictedAwayScore?.toString() ?? "")
  }, [predictedHomeScore, predictedAwayScore])

  function handleChange(side: "home" | "away", value: string) {
    const sanitized = value.replace(/[^0-9]/g, "").slice(0, 2)
    if (side === "home") setHome(sanitized)
    else setAway(sanitized)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const h = parseInt(side === "home" ? sanitized : home)
      const a = parseInt(side === "away" ? sanitized : away)
      if (!isNaN(h) && !isNaN(a)) onChange(matchId, h, a)
    }, 500)
  }

  const locked = isLocked || status === "LIVE" || status === "FINISHED"
  const isFinished = status === "FINISHED"

  return (
    <div className={cn(
      "rounded-lg border bg-card p-3 transition-all",
      locked && "opacity-75",
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{formatDate(scheduledAt)}</span>
        <div className="flex items-center gap-2">
          {!locked && <CountdownTimer targetDate={scheduledAt} />}
          <MatchStatusBadge status={status} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Home team */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <TeamFlag flagUrl={homeTeam?.flag_url} name={homeTeam?.name ?? "?"} size="sm" />
          <span className="text-sm font-medium truncate">{homeTeam?.fifa_code ?? "?"}</span>
        </div>

        {/* Score inputs */}
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            min={0}
            max={99}
            inputMode="numeric"
            pattern="[0-9]*"
            value={home}
            onChange={(e) => handleChange("home", e.target.value)}
            disabled={locked}
            className={cn(
              "w-10 h-10 text-center text-lg font-bold rounded-md border focus:outline-none focus:ring-2 focus:ring-primary bg-background",
              locked && "cursor-not-allowed bg-muted",
              isFinished && "text-muted-foreground"
            )}
            placeholder="–"
          />
          <span className="text-muted-foreground font-medium text-sm">×</span>
          <input
            type="number"
            min={0}
            max={99}
            inputMode="numeric"
            pattern="[0-9]*"
            value={away}
            onChange={(e) => handleChange("away", e.target.value)}
            disabled={locked}
            className={cn(
              "w-10 h-10 text-center text-lg font-bold rounded-md border focus:outline-none focus:ring-2 focus:ring-primary bg-background",
              locked && "cursor-not-allowed bg-muted",
              isFinished && "text-muted-foreground"
            )}
            placeholder="–"
          />
        </div>

        {/* Away team */}
        <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
          <span className="text-sm font-medium truncate text-right">{awayTeam?.fifa_code ?? "?"}</span>
          <TeamFlag flagUrl={awayTeam?.flag_url} name={awayTeam?.name ?? "?"} size="sm" />
        </div>
      </div>

      {/* Official result */}
      {isFinished && officialHomeScore !== null && officialAwayScore !== null && (
        <div className="mt-2 text-center text-xs text-muted-foreground">
          Resultado oficial: {officialHomeScore} × {officialAwayScore}
        </div>
      )}
    </div>
  )
}
