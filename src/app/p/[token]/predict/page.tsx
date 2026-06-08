"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { GroupMatchCard } from "@/components/predict/GroupMatchCard"
import { SimulatedStandings } from "@/components/predict/SimulatedStandings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Loader2, Calendar, LayoutGrid } from "lucide-react"
import Link from "next/link"
import { GROUP_LETTERS } from "@/types/domain"
import { formatDate } from "@/lib/utils"

interface Team {
  id: number
  fifa_code: string
  name: string
  flag_url: string | null
}

interface Match {
  id: number
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

type ViewMode = "group" | "date"

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
  const [viewMode, setViewMode] = useState<ViewMode>("group")

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

  async function handleSave() {
    setSaving(true)
    setSaveMsg("")
    const body = [...predictions.entries()]
      .filter(([id]) => !lockedMatches.has(id))
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

  const groupsWithMatches = GROUP_LETTERS.filter(g =>
    matches.some(m => m.group_letter === g)
  )

  // Group matches by date (DD/MM)
  const matchesByDate = useMemo(() => {
    const sorted = [...matches].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )
    const byDate = new Map<string, Match[]>()
    for (const m of sorted) {
      const dateKey = new Date(m.scheduled_at).toLocaleDateString("pt-BR", {
        weekday: "short", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo"
      })
      if (!byDate.has(dateKey)) byDate.set(dateKey, [])
      byDate.get(dateKey)!.push(m)
    }
    return byDate
  }, [matches])

  const pendingCount = matches.filter(m =>
    !lockedMatches.has(m.id) && m.status === "SCHEDULED" && !predictions.has(m.id)
  ).length

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
        {/* Toggle view */}
        <div className="flex items-center gap-1 bg-green-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode("group")}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${viewMode === "group" ? "bg-white text-green-900 font-semibold" : "text-green-300 hover:text-white"}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Grupo
          </button>
          <button
            onClick={() => setViewMode("date")}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${viewMode === "date" ? "bg-white text-green-900 font-semibold" : "text-green-300 hover:text-white"}`}
          >
            <Calendar className="w-3.5 h-3.5" /> Data
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 py-4">

        {/* ── VISÃO POR GRUPO ── */}
        {viewMode === "group" && (
          <Tabs value={activeGroup} onValueChange={setActiveGroup}>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-muted p-1">
              {groupsWithMatches.map(g => {
                const groupPreds = matches
                  .filter(m => m.group_letter === g)
                  .filter(m => predictions.has(m.id)).length
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
                    <div className="space-y-2">
                      {groupMatches.map(m => (
                        <GroupMatchCard
                          key={m.id}
                          matchId={m.id}
                          homeTeam={m.home_team}
                          awayTeam={m.away_team}
                          scheduledAt={m.scheduled_at}
                          status={m.status}
                          officialHomeScore={m.home_score}
                          officialAwayScore={m.away_score}
                          predictedHomeScore={predictions.get(m.id)?.home}
                          predictedAwayScore={predictions.get(m.id)?.away}
                          isLocked={lockedMatches.has(m.id)}
                          onChange={handleChange}
                        />
                      ))}
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
          <div className="space-y-6">
            {[...matchesByDate.entries()].map(([dateKey, dayMatches]) => {
              const hasPending = dayMatches.some(m =>
                !lockedMatches.has(m.id) && m.status === "SCHEDULED" && !predictions.has(m.id)
              )
              return (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <h3 className="text-sm font-semibold capitalize">{dateKey}</h3>
                    {hasPending && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        palpites pendentes
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {dayMatches.map(m => (
                      <div key={m.id}>
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(m.scheduled_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo"
                            })}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs font-medium text-green-700">Grupo {m.group_letter}</span>
                        </div>
                        <GroupMatchCard
                          matchId={m.id}
                          homeTeam={m.home_team}
                          awayTeam={m.away_team}
                          scheduledAt={m.scheduled_at}
                          status={m.status}
                          officialHomeScore={m.home_score}
                          officialAwayScore={m.away_score}
                          predictedHomeScore={predictions.get(m.id)?.home}
                          predictedAwayScore={predictions.get(m.id)?.away}
                          isLocked={lockedMatches.has(m.id)}
                          onChange={handleChange}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
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
