"use client"

import { useEffect, useState, useCallback } from "react"
import { X, Loader2, Lock } from "lucide-react"

interface PredictionEntry {
  participant_id: string
  name: string
  home_score: number
  away_score: number
  total_points: number | null
  points_exact_score: number | null
  points_result: number | null
  points_goal_diff: number | null
}

interface Team {
  id: number
  fifa_code: string
  name: string
}

interface MatchInfo {
  id: number
  status: string
  home_score: number | null
  away_score: number | null
  home_team: Team | null
  away_team: Team | null
  scheduled_at: string
}

interface Props {
  match: MatchInfo
  isLocked: boolean          // round betting closed?
  isFinished: boolean
  onClose: () => void
}

// Color + label based on point breakdown
function PointsBadge({ entry }: { entry: PredictionEntry }) {
  const pts = entry.total_points
  if (pts === null) return <span className="text-xs text-muted-foreground w-16 text-right shrink-0">—</span>

  const isExact = (entry.points_exact_score ?? 0) > 0
  const isResult = (entry.points_result ?? 0) > 0
  const hasGoalDiff = (entry.points_goal_diff ?? 0) > 0

  let bg = ""
  let label = `+${pts}`

  if (pts === 0) {
    bg = "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
    label = "0 pts"
  } else if (isExact) {
    bg = "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
    label = `${pts} pts ★`
  } else if (isResult && hasGoalDiff) {
    bg = "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400"
    label = `${pts} pts`
  } else if (isResult) {
    bg = "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
    label = `${pts} pts`
  } else {
    bg = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
    label = `${pts} pts`
  }

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${bg}`}>
      {label}
    </span>
  )
}

export function MatchPredictionsModal({ match, isLocked, isFinished, onClose }: Props) {
  const [entries, setEntries] = useState<PredictionEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/matches/${match.id}/predictions`)
      const data = await res.json()
      setEntries(data.predictions ?? [])
    } finally {
      setLoading(false)
    }
  }, [match.id])

  useEffect(() => { load() }, [load])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const matchFinished = isFinished || match.status === "FINISHED"
  const showPredictions = isLocked || matchFinished

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-background rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b shrink-0">
          <div>
            <div className="font-bold text-base leading-tight">
              {match.home_team?.name ?? "?"} <span className="text-muted-foreground font-normal">×</span> {match.away_team?.name ?? "?"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              {matchFinished ? (
                <span>Resultado: <strong className="text-foreground">{match.home_score} × {match.away_score}</strong></span>
              ) : match.status === "LIVE" ? (
                <span className="text-red-500 font-semibold">● AO VIVO {match.home_score}×{match.away_score}</span>
              ) : (
                <span>{new Date(match.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 -mt-1 -mr-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner antes do fechamento */}
        {!showPredictions && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 shrink-0">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs text-amber-700 dark:text-amber-400">
              Palpites revelados após o fechamento da rodada
            </span>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Nenhum palpite registrado para esta partida.
            </p>
          ) : (
            <>
              {/* Legend — só após jogo finalizado */}
              {matchFinished && (
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b">
                  <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">★ Placar exato</span>
                  <span className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 px-2 py-0.5 rounded-full font-medium">Resultado + saldo</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">Resultado certo</span>
                  <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">Errou</span>
                </div>
              )}

              {/* Ranking list */}
              <div className="space-y-1.5 relative">
                {entries.map((e, idx) => (
                  <div
                    key={e.participant_id}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/30"
                  >
                    {/* Position */}
                    <span className="w-6 text-center text-sm font-bold shrink-0 text-muted-foreground">
                      {matchFinished && e.total_points !== null
                        ? idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : <span className="text-xs">{idx + 1}</span>
                        : <span className="text-xs">{idx + 1}</span>}
                    </span>

                    {/* Name — sempre visível */}
                    <span className="flex-1 text-sm font-medium truncate">{e.name}</span>

                    {/* Prediction — borrada antes de fechar */}
                    <span className={`font-mono text-sm font-bold shrink-0 transition-all ${!showPredictions ? "blur-sm select-none pointer-events-none" : ""}`}>
                      {e.home_score} × {e.away_score}
                    </span>

                    {/* Points badge */}
                    {matchFinished
                      ? <PointsBadge entry={e} />
                      : <span className="text-xs text-muted-foreground w-16 text-right shrink-0">—</span>}
                  </div>
                ))}

                {/* Overlay com cadeado sobre a lista quando ainda aberta */}
                {!showPredictions && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/60 backdrop-blur-[2px]">
                    <Lock className="w-8 h-8 text-muted-foreground/60" />
                    <p className="text-xs text-muted-foreground font-medium text-center px-4">
                      Palpites revelados após fechar a rodada
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
