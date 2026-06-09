"use client"

import { useState, useEffect, useRef } from "react"
import { TeamFlag } from "@/components/shared/TeamFlag"
import { MatchStatusBadge } from "@/components/shared/MatchStatusBadge"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils"
import { Clock, Lock, Users } from "lucide-react"

const CUTOFF_MINUTES = 15

// Locks 15 min before the first match of the round (not this specific match)
function useTimeLock(roundFirstMatchAt: string) {
  const cutoff = new Date(roundFirstMatchAt).getTime() - CUTOFF_MINUTES * 60 * 1000
  const [locked, setLocked] = useState(Date.now() >= cutoff)

  useEffect(() => {
    if (locked) return
    const remaining = cutoff - Date.now()
    if (remaining <= 0) { setLocked(true); return }

    if (remaining < 5 * 60 * 1000) {
      const interval = setInterval(() => {
        if (Date.now() >= cutoff) { setLocked(true); clearInterval(interval) }
      }, 1000)
      return () => clearInterval(interval)
    } else {
      const timeout = setTimeout(() => setLocked(true), remaining)
      return () => clearTimeout(timeout)
    }
  }, [cutoff, locked])

  return locked
}

// Becomes false (open) once the previous round's last match has kicked off
function useNotYetOpen(prevRoundLastMatchAt: string | null): boolean {
  const openTime = prevRoundLastMatchAt ? new Date(prevRoundLastMatchAt).getTime() : 0
  const alreadyOpen = !prevRoundLastMatchAt || Date.now() >= openTime
  const [open, setOpen] = useState(alreadyOpen)

  useEffect(() => {
    if (!prevRoundLastMatchAt || open) return
    const remaining = openTime - Date.now()
    if (remaining <= 0) { setOpen(true); return }
    const timeout = setTimeout(() => setOpen(true), remaining)
    return () => clearTimeout(timeout)
  }, [openTime, open, prevRoundLastMatchAt])

  return !open
}

function Countdown({ roundFirstMatchAt }: { roundFirstMatchAt: string }) {
  const cutoff = new Date(roundFirstMatchAt).getTime() - CUTOFF_MINUTES * 60 * 1000
  const [remaining, setRemaining] = useState(cutoff - Date.now())

  useEffect(() => {
    if (remaining <= 0) return
    const interval = setInterval(() => {
      const diff = cutoff - Date.now()
      setRemaining(diff)
      if (diff <= 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [cutoff])

  if (remaining <= 0) return null

  const totalSeconds = Math.floor(remaining / 1000)
  const d = Math.floor(totalSeconds / 86400)
  const h = Math.floor((totalSeconds % 86400) / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const isUrgent = remaining < 30 * 60 * 1000

  const label = d > 0
    ? `Fecha em ${d}d ${h}h`
    : h > 0
    ? `Fecha em ${h}h ${m.toString().padStart(2, "0")}m`
    : m > 0
    ? `Fecha em ${m}m ${s.toString().padStart(2, "0")}s`
    : `Fecha em ${s}s`

  return (
    <span className={cn(
      "text-xs font-mono tabular-nums",
      isUrgent ? "text-orange-500 font-semibold" : "text-muted-foreground"
    )}>
      {label}
    </span>
  )
}

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
  roundFirstMatchAt: string
  prevRoundLastMatchAt: string | null
  roundNumber: 1 | 2 | 3
  status: string
  officialHomeScore: number | null
  officialAwayScore: number | null
  predictedHomeScore: number | undefined
  predictedAwayScore: number | undefined
  isLocked: boolean
  onChange: (matchId: number, home: number, away: number) => void
  onViewPredictions: () => void
}

export function GroupMatchCard({
  matchId,
  homeTeam,
  awayTeam,
  scheduledAt,
  roundFirstMatchAt,
  prevRoundLastMatchAt,
  roundNumber,
  status,
  officialHomeScore,
  officialAwayScore,
  predictedHomeScore,
  predictedAwayScore,
  isLocked: isLockedByDb,
  onChange,
  onViewPredictions,
}: GroupMatchCardProps) {
  const [home, setHome] = useState(predictedHomeScore?.toString() ?? "")
  const [away, setAway] = useState(predictedAwayScore?.toString() ?? "")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTimeLocked = useTimeLock(roundFirstMatchAt)
  const isNotYetOpen = useNotYetOpen(prevRoundLastMatchAt)

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

  const isFinished = status === "FINISHED"
  const isLive = status === "LIVE"
  const locked = isLockedByDb || isTimeLocked || isLive || isFinished

  return (
    <div className={cn(
      "rounded-lg border bg-card p-3 transition-all",
      (locked || isNotYetOpen) && "opacity-80",
      isLive && "border-red-300 bg-red-50/50 dark:bg-red-950/10"
    )}>
      {/* Header: data + countdown/status */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{formatDate(scheduledAt)}</span>
        <div className="flex items-center gap-2">
          {isNotYetOpen && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" /> Aguarda Rodada {roundNumber - 1}
            </span>
          )}
          {!isNotYetOpen && locked && !isFinished && !isLive && (
            <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
              <Lock className="w-3 h-3" /> Encerrado
            </span>
          )}
          {!isNotYetOpen && !locked && <Countdown roundFirstMatchAt={roundFirstMatchAt} />}
          <MatchStatusBadge status={status} />
        </div>
      </div>

      {/* Teams + score inputs */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <TeamFlag flagUrl={homeTeam?.flag_url} name={homeTeam?.name ?? "?"} size="sm" />
          <div className="min-w-0">
            <div className="text-sm font-bold truncate leading-tight">{homeTeam?.fifa_code ?? "?"}</div>
            {homeTeam?.name && <div className="text-[10px] text-muted-foreground truncate leading-tight">{homeTeam.name}</div>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            min={0}
            max={99}
            inputMode="numeric"
            pattern="[0-9]*"
            value={home}
            onChange={(e) => handleChange("home", e.target.value)}
            disabled={locked || isNotYetOpen}
            className={cn(
              "w-10 h-10 text-center text-lg font-bold rounded-md border focus:outline-none focus:ring-2 focus:ring-primary bg-background",
              (locked || isNotYetOpen) && "cursor-not-allowed bg-muted text-muted-foreground"
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
            disabled={locked || isNotYetOpen}
            className={cn(
              "w-10 h-10 text-center text-lg font-bold rounded-md border focus:outline-none focus:ring-2 focus:ring-primary bg-background",
              (locked || isNotYetOpen) && "cursor-not-allowed bg-muted text-muted-foreground"
            )}
            placeholder="–"
          />
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
          <div className="min-w-0 text-right">
            <div className="text-sm font-bold truncate leading-tight">{awayTeam?.fifa_code ?? "?"}</div>
            {awayTeam?.name && <div className="text-[10px] text-muted-foreground truncate leading-tight">{awayTeam.name}</div>}
          </div>
          <TeamFlag flagUrl={awayTeam?.flag_url} name={awayTeam?.name ?? "?"} size="sm" />
        </div>
      </div>

      {/* Resultado oficial */}
      {isFinished && officialHomeScore !== null && officialAwayScore !== null && (
        <div className="mt-2 text-center text-xs text-muted-foreground">
          Resultado oficial: <strong>{officialHomeScore} × {officialAwayScore}</strong>
        </div>
      )}

      {/* Botão ver palpites — sempre visível */}
      <div className="mt-2 border-t pt-2">
        <button
          onClick={onViewPredictions}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5"
        >
          <Users className="w-3 h-3" />
          {locked ? "Ver palpites de todos" : "Ver palpites (fecham antes do jogo)"}
        </button>
      </div>
    </div>
  )
}
