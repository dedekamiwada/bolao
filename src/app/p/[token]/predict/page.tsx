"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { GroupMatchCard } from "@/components/predict/GroupMatchCard"
import { SimulatedStandings } from "@/components/predict/SimulatedStandings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Loader2, Calendar, LayoutGrid, Lock, Clock, List } from "lucide-react"
import Link from "next/link"
import { GROUP_LETTERS } from "@/types/domain"
import { getGroupRound } from "@/lib/group-rounds"

interface Team {
  id: number
  fifa_code: string
  name: string
  flag_url: string | null
}

interface Match {
  id: number
  match_number: number
  group_letter: string
  home_team_id: number
  away_team_id: number
  scheduled_at: string
  status: string
  home_score: number | null
  away_score: number | null
  home_team: Team | null
  away_team: Team | null
}

interface Prediction {
  match_id: number
  home_score: number
  away_score: number
  is_locked: boolean
}

/** Info computed globally (same for every match in the same round number) */
interface RoundInfo {
  roundNumber: 1 | 2 | 3
  roundFirstMatchAt: string   // earliest scheduled_at in this global round → determines lock time
  prevRoundLastMatchAt: string | null // latest scheduled_at in the previous global round → determines when this round opens
}

type ViewMode = "group" | "round" | "date"

const CUTOFF_MINUTES = 15

// ─── Pure helpers (no React) ─────────────────────────────────────────────────

function roundLockTime(roundFirstMatchAt: string): number {
  return new Date(roundFirstMatchAt).getTime() - CUTOFF_MINUTES * 60 * 1000
}

function isRoundLocked(roundFirstMatchAt: string, now: number): boolean {
  return now >= roundLockTime(roundFirstMatchAt)
}

function isRoundNotYetOpen(prevRoundLastMatchAt: string | null, now: number): boolean {
  return prevRoundLastMatchAt !== null && now < new Date(prevRoundLastMatchAt).getTime()
}

function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const d = Math.floor(totalSeconds / 86400)
  const h = Math.floor((totalSeconds % 86400) / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatMatchTime(scheduledAt: string): string {
  return new Date(scheduledAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  })
}

function formatMatchDate(scheduledAt: string): string {
  return new Date(scheduledAt).toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo",
  })
}

// ─── Small display component for round status badge ─────────────────────────

function RoundStatusBadge({
  roundNumber, roundFirstMatchAt, prevRoundLastMatchAt, now,
}: {
  roundNumber: 1 | 2 | 3
  roundFirstMatchAt: string
  prevRoundLastMatchAt: string | null
  now: number
}) {
  const locked = isRoundLocked(roundFirstMatchAt, now)
  const notYetOpen = isRoundNotYetOpen(prevRoundLastMatchAt, now)

  if (locked) {
    return (
      <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
        <Lock className="w-3 h-3" /> Encerrada
      </span>
    )
  }
  if (notYetOpen) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" /> Aguardando Rodada {roundNumber - 1} terminar
      </span>
    )
  }
  const remaining = Math.max(0, roundLockTime(roundFirstMatchAt) - now)
  return (
    <span className="text-xs text-green-600 font-medium">
      Aberta · fecha em {formatRemainingTime(remaining)}
    </span>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PredictPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Map<number, { home: number; away: number }>>(new Map())
  const [lockedMatches, setLockedMatches] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [activeGroup, setActiveGroup] = useState("A")
  const [viewMode, setViewMode] = useState<ViewMode>("round")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "done">("upcoming")
  const [now, setNow] = useState(Date.now())

  // Tick every 10 s to keep round status fresh
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetch(`/api/p/${token}/predictions`)
      .then(r => r.json())
      .then(({ matches: m, predictions: p }) => {
        setMatches(m ?? [])
        const predMap = new Map<number, { home: number; away: number }>()
        const locked = new Set<number>()
        ;(p ?? []).forEach((pred: Prediction) => {
          predMap.set(pred.match_id, { home: pred.home_score, away: pred.away_score })
          if (pred.is_locked) locked.add(pred.match_id)
        })
        setPredictions(predMap)
        setLockedMatches(locked)
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleChange = useCallback((matchId: number, home: number, away: number) => {
    setPredictions(prev => new Map(prev).set(matchId, { home, away }))
  }, [])

  // ─── Global round boundaries (computed once from ALL matches) ──────────────
  const globalRoundBoundaries = useMemo(() => {
    const result = new Map<1 | 2 | 3, { firstMatchAt: string; lastMatchAt: string }>()
    for (const round of [1, 2, 3] as const) {
      const rm = matches.filter(m => getGroupRound(m.match_number) === round)
      if (rm.length === 0) continue
      const firstMatchAt = rm.reduce(
        (min, m) => new Date(m.scheduled_at) < new Date(min) ? m.scheduled_at : min,
        rm[0].scheduled_at
      )
      const lastMatchAt = rm.reduce(
        (max, m) => new Date(m.scheduled_at) > new Date(max) ? m.scheduled_at : max,
        rm[0].scheduled_at
      )
      result.set(round, { firstMatchAt, lastMatchAt })
    }
    return result
  }, [matches])

  // Per-match round info (pointing to the global boundaries)
  const matchRoundInfo = useMemo(() => {
    const info = new Map<number, RoundInfo>()
    for (const match of matches) {
      const round = getGroupRound(match.match_number)
      const boundary = globalRoundBoundaries.get(round)
      if (!boundary) continue
      const prevBoundary = round > 1 ? globalRoundBoundaries.get((round - 1) as 1 | 2 | 3) : undefined
      info.set(match.id, {
        roundNumber: round,
        roundFirstMatchAt: boundary.firstMatchAt,
        prevRoundLastMatchAt: prevBoundary?.lastMatchAt ?? null,
      })
    }
    return info
  }, [matches, globalRoundBoundaries])

  // ─── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    setSaveMsg("")
    const body = [...predictions.entries()]
      .filter(([id]) => {
        if (lockedMatches.has(id)) return false
        const info = matchRoundInfo.get(id)
        if (!info) return false
        if (isRoundLocked(info.roundFirstMatchAt, Date.now())) return false
        if (isRoundNotYetOpen(info.prevRoundLastMatchAt, Date.now())) return false
        return true
      })
      .map(([matchId, { home, away }]) => ({ matchId, homeScore: home, awayScore: away }))

    const res = await fetch(`/api/p/${token}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictions: body }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setSaveMsg(`✓ ${data.saved} palpites salvos!`)
      setTimeout(() => router.push(`/p/${token}`), 1500)
    } else {
      setSaveMsg("Erro ao salvar. Tente novamente.")
    }
  }

  const groupsWithMatches = GROUP_LETTERS.filter(g => matches.some(m => m.group_letter === g))

  // Swipe between groups
  const touchStartX = useRef<number | null>(null)
  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(deltaX) < 50) return
    const idx = groupsWithMatches.indexOf(activeGroup as typeof GROUP_LETTERS[number])
    if (deltaX < 0 && idx < groupsWithMatches.length - 1) setActiveGroup(groupsWithMatches[idx + 1])
    else if (deltaX > 0 && idx > 0) setActiveGroup(groupsWithMatches[idx - 1])
  }

  // Group matches by date (for date view)
  const matchesByDate = useMemo(() => {
    const sorted = [...matches].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )
    const byDate = new Map<string, Match[]>()
    for (const m of sorted) {
      const key = formatMatchDate(m.scheduled_at)
      if (!byDate.has(key)) byDate.set(key, [])
      byDate.get(key)!.push(m)
    }
    return byDate
  }, [matches])

  // Group matches by round+date (for round view)
  const matchesByRoundAndDate = useMemo(() => {
    const result = new Map<1 | 2 | 3, Map<string, Match[]>>()
    for (const round of [1, 2, 3] as const) {
      const rm = matches
        .filter(m => getGroupRound(m.match_number) === round)
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      const byDate = new Map<string, Match[]>()
      for (const m of rm) {
        const key = formatMatchDate(m.scheduled_at)
        if (!byDate.has(key)) byDate.set(key, [])
        byDate.get(key)!.push(m)
      }
      result.set(round, byDate)
    }
    return result
  }, [matches])

  // Pending count — only open-round matches
  const pendingCount = matches.filter(m => {
    if (predictions.has(m.id) || m.status !== "SCHEDULED") return false
    const info = matchRoundInfo.get(m.id)
    if (!info) return false
    return !isRoundLocked(info.roundFirstMatchAt, now) && !isRoundNotYetOpen(info.prevRoundLastMatchAt, now)
  }).length

  // Helper to render a GroupMatchCard given a match
  function renderCard(m: Match) {
    const info = matchRoundInfo.get(m.id)
    if (!info) return null
    return (
      <GroupMatchCard
        key={m.id}
        matchId={m.id}
        homeTeam={m.home_team}
        awayTeam={m.away_team}
        scheduledAt={m.scheduled_at}
        roundFirstMatchAt={info.roundFirstMatchAt}
        prevRoundLastMatchAt={info.prevRoundLastMatchAt}
        roundNumber={info.roundNumber}
        status={m.status}
        officialHomeScore={m.home_score}
        officialAwayScore={m.away_score}
        predictedHomeScore={predictions.get(m.id)?.home}
        predictedAwayScore={predictions.get(m.id)?.away}
        isLocked={lockedMatches.has(m.id)}
        onChange={handleChange}
      />
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <main className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-green-900 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/p/${token}`}>
            <ArrowLeft className="w-5 h-5 text-green-300" />
          </Link>
          <div>
            <h1 className="font-bold">Fase de Grupos</h1>
            <p className="text-green-300 text-xs">
              {predictions.size}/72 preenchidos
              {pendingCount > 0 && ` · ${pendingCount} sem palpite`}
            </p>
          </div>
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-green-800 rounded-lg p-1">
          {(["group", "round", "date"] as const).map(mode => {
            const icon = mode === "group" ? <LayoutGrid className="w-3.5 h-3.5" />
              : mode === "round" ? <List className="w-3.5 h-3.5" />
              : <Calendar className="w-3.5 h-3.5" />
            const label = mode === "group" ? "Grupo" : mode === "round" ? "Rodada" : "Data"
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                  viewMode === mode ? "bg-white text-green-900 font-semibold" : "text-green-300 hover:text-white"
                }`}
              >
                {icon} {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 py-4">

        {/* ── VISÃO POR RODADA ── */}
        {viewMode === "round" && (
          <div className="space-y-6">
            {([1, 2, 3] as const).map(roundNum => {
              const boundary = globalRoundBoundaries.get(roundNum)
              if (!boundary) return null
              const prevBoundary = roundNum > 1 ? globalRoundBoundaries.get((roundNum - 1) as 1 | 2 | 3) : undefined
              const prevLastMatchAt = prevBoundary?.lastMatchAt ?? null
              const locked = isRoundLocked(boundary.firstMatchAt, now)
              const notYetOpen = isRoundNotYetOpen(prevLastMatchAt, now)
              const byDate = matchesByRoundAndDate.get(roundNum)!
              const roundPredCount = [...byDate.values()].flat().filter(m => predictions.has(m.id)).length
              const roundTotalCount = [...byDate.values()].flat().length

              return (
                <div key={roundNum}>
                  {/* Round section header */}
                  <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-b ${
                    locked ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200"
                    : notYetOpen ? "bg-muted border-border"
                    : "bg-green-50 dark:bg-green-950/20 border-green-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        locked ? "text-orange-700 dark:text-orange-400"
                        : notYetOpen ? "text-muted-foreground"
                        : "text-green-700 dark:text-green-400"
                      }`}>
                        Rodada {roundNum}
                      </span>
                      <RoundStatusBadge
                        roundNumber={roundNum}
                        roundFirstMatchAt={boundary.firstMatchAt}
                        prevRoundLastMatchAt={prevLastMatchAt}
                        now={now}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {roundPredCount}/{roundTotalCount} ✓
                    </span>
                  </div>

                  {/* Round matches grouped by date */}
                  <div className="border border-t-0 rounded-b-lg divide-y overflow-hidden">
                    {[...byDate.entries()].map(([dateKey, dayMatches]) => (
                      <div key={dateKey} className="bg-card">
                        <div className="px-3 py-1.5 bg-muted/50 flex items-center gap-2">
                          <span className="text-xs font-semibold capitalize text-muted-foreground">{dateKey}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {dayMatches.filter(m => predictions.has(m.id)).length}/{dayMatches.length} ✓
                          </span>
                        </div>
                        <div className="p-2 space-y-2">
                          {dayMatches.map(m => (
                            <div key={m.id}>
                              <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="text-xs text-muted-foreground">{formatMatchTime(m.scheduled_at)}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs font-medium text-green-700">Grupo {m.group_letter}</span>
                                {predictions.has(m.id) && (
                                  <span className="text-xs text-green-600 ml-auto">✓</span>
                                )}
                              </div>
                              {renderCard(m)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── VISÃO POR GRUPO ── */}
        {viewMode === "group" && (
          <Tabs value={activeGroup} onValueChange={setActiveGroup}
            onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <p className="text-[11px] text-muted-foreground text-center mb-2 select-none">
              ← deslize para mudar de grupo →
            </p>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-muted p-1">
              {groupsWithMatches.map(g => {
                const groupPreds = matches.filter(m => m.group_letter === g && predictions.has(m.id)).length
                return (
                  <TabsTrigger key={g} value={g} className="text-xs px-2 py-1 relative">
                    {g}
                    {groupPreds === 6 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {groupsWithMatches.map(g => {
              const groupMatches = matches.filter(m => m.group_letter === g)
              return (
                <TabsContent key={g} value={g}>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="space-y-4">
                      {([1, 2, 3] as const).map(roundNum => {
                        const roundMatches = groupMatches.filter(
                          m => getGroupRound(m.match_number) === roundNum
                        )
                        if (roundMatches.length === 0) return null
                        const boundary = globalRoundBoundaries.get(roundNum)
                        if (!boundary) return null
                        const prevBoundary = roundNum > 1 ? globalRoundBoundaries.get((roundNum - 1) as 1 | 2 | 3) : undefined

                        return (
                          <div key={roundNum} className="space-y-1.5">
                            <div className="flex items-center gap-2 px-0.5">
                              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                                Rodada {roundNum}
                              </span>
                              <RoundStatusBadge
                                roundNumber={roundNum}
                                roundFirstMatchAt={boundary.firstMatchAt}
                                prevRoundLastMatchAt={prevBoundary?.lastMatchAt ?? null}
                                now={now}
                              />
                            </div>
                            <div className="space-y-2">
                              {roundMatches.map(m => renderCard(m))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <Card className="h-fit sticky top-4">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                          Classificação Simulada — Grupo {g}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0">
                        <SimulatedStandings
                          groupLetter={g}
                          matches={matches}
                          predictions={predictions}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              )
            })}
          </Tabs>
        )}

        {/* ── VISÃO POR DATA ── */}
        {viewMode === "date" && (
          <div className="space-y-4">
            {/* Filtro de status */}
            <div className="flex gap-2">
              {(["upcoming", "done", "all"] as const).map(f => {
                const label = f === "upcoming" ? "⏳ Próximos" : f === "done" ? "✅ Encerrados" : "📋 Todos"
                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                      statusFilter === f
                        ? "bg-green-700 text-white border-green-700"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Seletor de datas */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3">
              <button
                onClick={() => setSelectedDate(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedDate === null
                    ? "bg-green-700 text-white border-green-700"
                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                Todas
              </button>
              {[...matchesByDate.keys()].map(dateKey => {
                const dayMatches = matchesByDate.get(dateKey)!
                const hasPending = dayMatches.some(m => {
                  const info = matchRoundInfo.get(m.id)
                  return info && !isRoundLocked(info.roundFirstMatchAt, now)
                    && !isRoundNotYetOpen(info.prevRoundLastMatchAt, now)
                    && m.status === "SCHEDULED" && !predictions.has(m.id)
                })
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(selectedDate === dateKey ? null : dateKey)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors relative ${
                      selectedDate === dateKey
                        ? "bg-green-700 text-white border-green-700"
                        : "bg-background border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {dateKey}
                    {hasPending && statusFilter !== "done" && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Lista de jogos */}
            <div className="space-y-6">
              {[...matchesByDate.entries()]
                .filter(([dk]) => selectedDate === null || dk === selectedDate)
                .map(([dateKey, dayMatches]) => {
                  const filtered = dayMatches.filter(m => {
                    const isFinished = m.status === "FINISHED" || m.status === "LIVE"
                    const info = matchRoundInfo.get(m.id)
                    const roundLocked = info ? isRoundLocked(info.roundFirstMatchAt, now) : false
                    const notYetOpen = info ? isRoundNotYetOpen(info.prevRoundLastMatchAt, now) : false
                    if (statusFilter === "upcoming") return !roundLocked && !notYetOpen && !isFinished
                    if (statusFilter === "done") return isFinished || roundLocked
                    return true
                  })
                  if (filtered.length === 0) return null

                  const pendingInDay = filtered.filter(m => {
                    const info = matchRoundInfo.get(m.id)
                    return !predictions.has(m.id) && m.status === "SCHEDULED"
                      && info && !isRoundLocked(info.roundFirstMatchAt, now)
                      && !isRoundNotYetOpen(info.prevRoundLastMatchAt, now)
                  }).length

                  return (
                    <div key={dateKey}>
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <h3 className="text-sm font-semibold capitalize">{dateKey}</h3>
                        {pendingInDay > 0 && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {pendingInDay} sem palpite
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {filtered.filter(m => predictions.has(m.id)).length}/{filtered.length} ✓
                        </span>
                      </div>
                      <div className="space-y-2">
                        {filtered.map(m => {
                          const info = matchRoundInfo.get(m.id)!
                          return (
                            <div key={m.id}>
                              <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="text-xs text-muted-foreground">{formatMatchTime(m.scheduled_at)}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-xs font-medium text-green-700">
                                  Grupo {m.group_letter} · Rod. {info.roundNumber}
                                </span>
                                {predictions.has(m.id) && (
                                  <span className="text-xs text-green-600 ml-auto">✓ palpitado</span>
                                )}
                              </div>
                              {renderCard(m)}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}

              {[...matchesByDate.entries()]
                .filter(([dk]) => selectedDate === null || dk === selectedDate)
                .every(([, dm]) => {
                  const filtered = dm.filter(m => {
                    const isFinished = m.status === "FINISHED" || m.status === "LIVE"
                    const info = matchRoundInfo.get(m.id)
                    const roundLocked = info ? isRoundLocked(info.roundFirstMatchAt, now) : false
                    const notYetOpen = info ? isRoundNotYetOpen(info.prevRoundLastMatchAt, now) : false
                    if (statusFilter === "upcoming") return !roundLocked && !notYetOpen && !isFinished
                    if (statusFilter === "done") return isFinished || roundLocked
                    return true
                  })
                  return filtered.length === 0
                }) && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-3xl mb-2">{statusFilter === "upcoming" ? "🎉" : "📭"}</p>
                  <p className="text-sm">
                    {statusFilter === "upcoming"
                      ? "Todos os palpites desta data já estão encerrados!"
                      : "Nenhum jogo encerrado ainda nesta data."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky save */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {saveMsg && <span className="text-sm text-green-600 flex-1">{saveMsg}</span>}
          <Button onClick={handleSave} disabled={saving} className="w-full bg-green-700 hover:bg-green-800 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Palpites
          </Button>
        </div>
      </div>
    </main>
  )
}
