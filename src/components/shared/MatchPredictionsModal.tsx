"use client"

import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import { X, Trophy, Target, Loader2 } from "lucide-react"

interface MatchItem {
  id: number
  status: string
  home_score: number | null
  away_score: number | null
  scheduled_at: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  home_team: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  away_team: any
}

interface PredictionEntry {
  participant_id: string
  name: string
  home_score: number
  away_score: number
  total_points: number | null
}

interface Props {
  matches: MatchItem[]
}

export function MatchesWithPredictions({ matches }: Props) {
  const [selected, setSelected] = useState<MatchItem | null>(null)
  const [predictions, setPredictions] = useState<PredictionEntry[]>([])
  const [loading, setLoading] = useState(false)

  const openMatch = useCallback(async (match: MatchItem) => {
    setSelected(match)
    setLoading(true)
    setPredictions([])
    try {
      const res = await fetch(`/api/matches/${match.id}/predictions`)
      const data = await res.json()
      setPredictions(data.predictions ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  const close = () => setSelected(null)

  return (
    <>
      <div className="space-y-1">
        {matches.map((m) => (
          <button
            key={m.id}
            onClick={() => openMatch(m)}
            className="w-full flex items-center justify-between text-sm py-2 border-b last:border-0 hover:bg-muted/40 rounded px-1 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 flex-1">
              <span className="font-medium">{m.home_team?.fifa_code ?? "?"}</span>
              {m.status === "LIVE" ? (
                <Badge variant="live">{m.home_score ?? 0} × {m.away_score ?? 0}</Badge>
              ) : m.status === "FINISHED" ? (
                <span className="font-bold">{m.home_score} × {m.away_score}</span>
              ) : (
                <span className="text-muted-foreground">×</span>
              )}
              <span className="font-medium">{m.away_team?.fifa_code ?? "?"}</span>
            </div>
            <div className="shrink-0 flex items-center gap-1">
              {m.status === "LIVE"
                ? <Badge variant="live">AO VIVO</Badge>
                : <span className="text-xs text-muted-foreground">{formatDate(m.scheduled_at)}</span>}
              <span className="text-xs text-muted-foreground ml-1">▸</span>
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={close} />

          {/* Panel */}
          <div className="relative bg-background rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <div className="font-bold text-base">
                  {selected.home_team?.name ?? "?"} × {selected.away_team?.name ?? "?"}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {selected.status === "FINISHED" ? (
                    <span>Resultado: <strong>{selected.home_score} × {selected.away_score}</strong></span>
                  ) : selected.status === "LIVE" ? (
                    <Badge variant="live">AO VIVO {selected.home_score}×{selected.away_score}</Badge>
                  ) : (
                    <span>{formatDate(selected.scheduled_at)}</span>
                  )}
                </div>
              </div>
              <button onClick={close} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-4 py-3">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : predictions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum palpite registrado para esta partida.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-semibold">Palpites dos participantes</span>
                  </div>
                  <div className="space-y-1">
                    {predictions.map((p, idx) => (
                      <div
                        key={p.participant_id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg
                          ${idx === 0 && p.total_points !== null ? "bg-yellow-50 dark:bg-yellow-950/40" :
                            idx === 1 && p.total_points !== null ? "bg-slate-50 dark:bg-slate-900/40" :
                            idx === 2 && p.total_points !== null ? "bg-orange-50 dark:bg-orange-950/40" : "bg-muted/30"}`}
                      >
                        {/* Position or icon */}
                        <span className="w-6 text-center text-sm font-bold shrink-0">
                          {p.total_points !== null
                            ? idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1
                            : <Target className="w-3.5 h-3.5 text-muted-foreground inline" />}
                        </span>

                        {/* Name */}
                        <span className="flex-1 text-sm font-medium truncate">{p.name}</span>

                        {/* Prediction */}
                        <span className="text-sm font-mono tabular-nums shrink-0">
                          {p.home_score} × {p.away_score}
                        </span>

                        {/* Points */}
                        {p.total_points !== null ? (
                          <span className={`text-sm font-bold shrink-0 w-14 text-right ${p.total_points > 0 ? "text-green-600" : "text-muted-foreground"}`}>
                            +{p.total_points} pts
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0 w-14 text-right">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
