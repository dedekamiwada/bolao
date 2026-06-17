"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { X, Loader2, Lock, RefreshCw, ArrowUp, ArrowDown } from "lucide-react"

interface PredictionEntry {
  participant_id: string
  name: string
  home_score: number
  away_score: number
  overall_points: number
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

// Total geral do participante + ganho neste jogo:
// +5 verde escuro (placar exato) · +4 verde claro (resultado + saldo)
// +3 amarelo (resultado certo) · +0 vermelho (errou)
function PointsBadge({ entry, provisional }: { entry: PredictionEntry; provisional: boolean }) {
  const pts = entry.total_points
  if (pts === null) return <span className="text-xs text-muted-foreground w-16 text-right shrink-0">—</span>

  const isExact = (entry.points_exact_score ?? 0) > 0
  const isResult = (entry.points_result ?? 0) > 0
  const hasGoalDiff = (entry.points_goal_diff ?? 0) > 0

  let bg = ""
  if (pts === 0) {
    bg = "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
  } else if (isExact) {
    bg = "bg-green-600 text-white dark:bg-green-700"
  } else if (isResult && hasGoalDiff) {
    bg = "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
  } else if (isResult) {
    bg = "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-500"
  } else {
    bg = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
  }

  // Provisório: total geral ainda não inclui este jogo → soma para mostrar onde ficaria
  const overall = provisional ? entry.overall_points + pts : entry.overall_points

  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <span className="text-xs text-muted-foreground tabular-nums">{overall} pts</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bg}`}>
        +{pts}{isExact ? " ★" : ""}
      </span>
    </span>
  )
}

export function MatchPredictionsModal({ match, isLocked, isFinished, onClose }: Props) {
  const [entries, setEntries] = useState<PredictionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [provisional, setProvisional] = useState(false)
  const [liveScore, setLiveScore] = useState<{ home: number; away: number } | null>(null)
  const [sortBy, setSortBy] = useState<"match" | "overall">("match")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/matches/${match.id}/predictions`)
      if (!res.ok) return
      const data = await res.json()
      setEntries(data.predictions ?? [])
      setProvisional(data.provisional ?? false)
      // Placar mais fresco que o da prop (atualizado pelo sync durante o jogo)
      if (data.match?.home_score != null) {
        setLiveScore({ home: data.match.home_score, away: data.match.away_score })
      }
    } finally {
      setLoading(false)
    }
  }, [match.id])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const matchFinished = isFinished || match.status === "FINISHED"
  const showPredictions = isLocked || matchFinished
  const showPoints = matchFinished || provisional
  const displayScore = liveScore ?? { home: match.home_score, away: match.away_score }

  // Ordenação: pontos deste jogo (API já manda assim) ou ranking geral do bolão.
  // No geral, o provisório soma o ganho do jogo ao vivo (mesmo valor exibido).
  const liveBonus = provisional && !matchFinished
  const sortedEntries = sortBy === "match"
    ? entries
    : [...entries].sort((a, b) => {
        const totalA = a.overall_points + (liveBonus ? a.total_points ?? 0 : 0)
        const totalB = b.overall_points + (liveBonus ? b.total_points ?? 0 : 0)
        return totalB - totalA || (b.total_points ?? 0) - (a.total_points ?? 0) || a.name.localeCompare(b.name)
      })

  // Mudança de posição no ranking geral causada por este jogo
  // Rank antes: overall sem este jogo; Rank depois: overall com este jogo
  const rankChanges = useMemo(() => {
    const withPoints = entries.filter(e => e.total_points !== null)
    if (withPoints.length === 0) return new Map<string, number>()

    const overallAfter = (e: PredictionEntry) =>
      liveBonus ? e.overall_points + (e.total_points ?? 0) : e.overall_points
    const overallBefore = (e: PredictionEntry) =>
      liveBonus ? e.overall_points : e.overall_points - (e.total_points ?? 0)

    const sorted = (fn: (e: PredictionEntry) => number) =>
      [...withPoints].sort((a, b) => fn(b) - fn(a))

    const afterRanks = sorted(overallAfter)
    const beforeRanks = sorted(overallBefore)

    const beforeMap = new Map(beforeRanks.map((e, i) => [e.participant_id, i + 1]))
    return new Map(afterRanks.map((e, i) => [e.participant_id, (beforeMap.get(e.participant_id) ?? i + 1) - (i + 1)]))
  }, [entries, liveBonus])

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
                <span>Resultado: <strong className="text-foreground">{displayScore.home} × {displayScore.away}</strong></span>
              ) : match.status === "LIVE" ? (
                <span className="text-red-500 font-semibold">● AO VIVO {displayScore.home ?? "–"}×{displayScore.away ?? "–"}</span>
              ) : (
                <span>{new Date(match.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 -mt-1 -mr-1">
            {match.status === "LIVE" && (
              <button onClick={load} disabled={loading} title="Atualizar placar e pontos" className="text-muted-foreground hover:text-foreground p-1 rounded">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner de pontuação provisória (jogo ao vivo) */}
        {provisional && !matchFinished && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 px-4 py-2 shrink-0">
            <span className="text-xs text-blue-700 dark:text-blue-400">
              ⏱️ Pontuação <strong>provisória</strong> com o placar atual — só vale ao final do jogo.
            </span>
          </div>
        )}

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
              {/* Ordenação — só faz sentido quando há pontos para comparar */}
              {showPoints && (
                <div className="flex gap-1.5 mb-3">
                  <button
                    onClick={() => setSortBy("match")}
                    className={`flex-1 py-1 px-2 rounded-md text-xs font-medium border transition-colors ${
                      sortBy === "match" ? "bg-green-700 text-white border-green-700" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Pontos do jogo
                  </button>
                  <button
                    onClick={() => setSortBy("overall")}
                    className={`flex-1 py-1 px-2 rounded-md text-xs font-medium border transition-colors ${
                      sortBy === "overall" ? "bg-green-700 text-white border-green-700" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Ranking geral
                  </button>
                </div>
              )}

              {/* Legend — jogo finalizado ou pontuação provisória ao vivo */}
              {showPoints && (
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b">
                  <span className="text-[10px] bg-green-600 text-white dark:bg-green-700 px-2 py-0.5 rounded-full font-medium">+5 ★ Placar exato</span>
                  <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">+4 Resultado + saldo</span>
                  <span className="text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-500 px-2 py-0.5 rounded-full font-medium">+3 Resultado certo</span>
                  <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">+0 Errou</span>
                </div>
              )}

              {/* Ranking list */}
              <div className="space-y-1.5 relative">
                {sortedEntries.map((e, idx) => (
                  <div
                    key={e.participant_id}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg bg-muted/30"
                  >
                    {/* Position */}
                    <span className="w-6 text-center text-sm font-bold shrink-0 text-muted-foreground">
                      {showPoints && e.total_points !== null
                        ? idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : <span className="text-xs">{idx + 1}</span>
                        : <span className="text-xs">{idx + 1}</span>}
                    </span>

                    {/* Name — sempre visível */}
                    <span className="flex-1 text-sm font-medium truncate">{e.name}</span>

                    {/* Seta de variação no ranking geral */}
                    {showPoints && (() => {
                      const change = rankChanges.get(e.participant_id) ?? 0
                      if (change === 0) return <span className="w-8 shrink-0" />
                      return (
                        <span className={`flex items-center text-xs font-semibold shrink-0 w-8 ${change > 0 ? "text-green-600" : "text-red-500"}`}>
                          {change > 0
                            ? <><ArrowUp className="w-3 h-3" />{change}</>
                            : <><ArrowDown className="w-3 h-3" />{Math.abs(change)}</>}
                        </span>
                      )
                    })()}

                    {/* Prediction — borrada antes de fechar */}
                    <span className={`font-mono text-sm font-bold shrink-0 transition-all ${!showPredictions ? "blur-sm select-none pointer-events-none" : ""}`}>
                      {e.home_score} × {e.away_score}
                    </span>

                    {/* Points badge */}
                    {showPoints
                      ? <PointsBadge entry={e} provisional={provisional && !matchFinished} />
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
