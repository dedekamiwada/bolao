"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Loader2, Info } from "lucide-react"
import Link from "next/link"
import { STAGE_LABELS } from "@/types/domain"

interface Team {
  id: number
  fifa_code: string
  name: string
  flag_url: string | null
}

interface KnockoutMatch {
  id: number
  stage: string
  match_number: number
  scheduled_at: string
  status: string
  home_team_id: number | null
  away_team_id: number | null
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  home_team: Team | null
  away_team: Team | null
}

interface KnockoutPrediction {
  match_id: number
  home_team_id: number | null
  away_team_id: number | null
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  is_locked: boolean
}

interface ClassifiedTeam {
  group_letter: string
  position: number
  team_id: number
  teams: Team | null
}

const STAGE_ORDER = ["R32", "R16", "QF", "SF", "3RD", "FINAL"]

export default function KnockoutPredictPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [matches, setMatches] = useState<KnockoutMatch[]>([])
  const [predictions, setPredictions] = useState<Map<number, KnockoutPrediction>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [classifications, setClassifications] = useState<ClassifiedTeam[]>([])

  useEffect(() => {
    fetch(`/api/p/${token}/knockout`)
      .then(r => r.json())
      .then(({ matches: m, predictions: p, classifications: c }) => {
        setMatches(m ?? [])
        setClassifications(c ?? [])
        const predMap = new Map<number, KnockoutPrediction>()
        ;(p ?? []).forEach((pred: KnockoutPrediction) => predMap.set(pred.match_id, pred))
        setPredictions(predMap)
      })
      .finally(() => setLoading(false))
  }, [token])

  function handleScoreChange(matchId: number, side: "home" | "away", value: string) {
    const num = parseInt(value.replace(/\D/g, ""))
    if (isNaN(num) && value !== "") return
    setPredictions(prev => {
      const next = new Map(prev)
      const existing = next.get(matchId) ?? { match_id: matchId, home_team_id: null, away_team_id: null, home_score: null, away_score: null, winner_team_id: null, is_locked: false }
      const updated = { ...existing, [side === "home" ? "home_score" : "away_score"]: value === "" ? null : num }
      // Auto-set winner based on score
      if (updated.home_score !== null && updated.away_score !== null) {
        if (updated.home_score > updated.away_score) updated.winner_team_id = updated.home_team_id
        else if (updated.away_score > updated.home_score) updated.winner_team_id = updated.away_team_id
        else updated.winner_team_id = null // draw → needs manual selection
      }
      next.set(matchId, updated)
      return next
    })
  }

  function handleWinnerSelect(matchId: number, winnerId: number) {
    setPredictions(prev => {
      const next = new Map(prev)
      const existing = next.get(matchId) ?? { match_id: matchId, home_team_id: null, away_team_id: null, home_score: null, away_score: null, winner_team_id: null, is_locked: false }
      next.set(matchId, { ...existing, winner_team_id: winnerId })
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg("")
    const body = [...predictions.entries()]
      .filter(([, p]) => !p.is_locked && p.winner_team_id !== null)
      .map(([matchId, p]) => ({
        matchId,
        homeTeamId: p.home_team_id,
        awayTeamId: p.away_team_id,
        homeScore: p.home_score ?? 0,
        awayScore: p.away_score ?? 0,
        winnerId: p.winner_team_id,
      }))

    const res = await fetch(`/api/p/${token}/knockout`, {
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
      setSaveMsg("Erro ao salvar.")
    }
  }

  const stagesPresent = STAGE_ORDER.filter(s => matches.some(m => m.stage === s))

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (matches.length === 0) return (
    <main className="min-h-screen bg-background">
      <div className="bg-green-900 text-white px-4 py-4 flex items-center gap-3">
        <Link href={`/p/${token}`}><ArrowLeft className="w-5 h-5 text-green-300" /></Link>
        <h1 className="font-bold">Mata-Mata</h1>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-semibold text-lg mb-2">Fase de Grupos em andamento</h2>
        <p className="text-muted-foreground text-sm">Os palpites do mata-mata abrem após o encerramento da fase de grupos.</p>
        <Button asChild className="mt-6" variant="outline">
          <Link href={`/p/${token}/predict`}>Palpitar na Fase de Grupos</Link>
        </Button>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="bg-green-900 text-white px-4 py-4 flex items-center gap-3">
        <Link href={`/p/${token}`}><ArrowLeft className="w-5 h-5 text-green-300" /></Link>
        <div>
          <h1 className="font-bold">Mata-Mata</h1>
          <p className="text-green-300 text-xs">
            {classifications.length > 0 ? "Baseado nos seus palpites da fase de grupos" : "Times definidos pelo chaveamento oficial"}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 py-4 space-y-6">
        {stagesPresent.map(stage => {
          const stageMatches = matches.filter(m => m.stage === stage)
          return (
            <div key={stage}>
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3 px-1">
                {STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? stage}
              </h2>
              <div className="space-y-2">
                {stageMatches.map(match => {
                  const pred = predictions.get(match.id)
                  const isLocked = pred?.is_locked || match.status === "LIVE" || match.status === "FINISHED"
                  const homeTeam = match.home_team
                  const awayTeam = match.away_team
                  const isDraw = pred?.home_score !== null && pred?.away_score !== null && pred?.home_score === pred?.away_score

                  return (
                    <Card key={match.id} className={isLocked ? "opacity-70" : ""}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          {/* Home team */}
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate leading-tight">{homeTeam?.fifa_code ?? "?"}</div>
                              {homeTeam?.name && <div className="text-[10px] text-muted-foreground truncate leading-tight">{homeTeam.name}</div>}
                            </div>
                          </div>
                          {/* Scores */}
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number" min={0} max={99} inputMode="numeric"
                              value={pred?.home_score ?? ""}
                              onChange={e => handleScoreChange(match.id, "home", e.target.value)}
                              disabled={isLocked || !homeTeam}
                              placeholder="–"
                              className="w-10 h-10 text-center text-lg font-bold rounded-md border focus:outline-none focus:ring-2 focus:ring-primary bg-background disabled:bg-muted disabled:cursor-not-allowed"
                            />
                            <span className="text-muted-foreground text-sm font-medium">×</span>
                            <input
                              type="number" min={0} max={99} inputMode="numeric"
                              value={pred?.away_score ?? ""}
                              onChange={e => handleScoreChange(match.id, "away", e.target.value)}
                              disabled={isLocked || !awayTeam}
                              placeholder="–"
                              className="w-10 h-10 text-center text-lg font-bold rounded-md border focus:outline-none focus:ring-2 focus:ring-primary bg-background disabled:bg-muted disabled:cursor-not-allowed"
                            />
                          </div>
                          {/* Away team */}
                          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                            <div className="min-w-0 text-right">
                              <div className="text-sm font-bold truncate leading-tight">{awayTeam?.fifa_code ?? "?"}</div>
                              {awayTeam?.name && <div className="text-[10px] text-muted-foreground truncate leading-tight">{awayTeam.name}</div>}
                            </div>
                          </div>
                        </div>

                        {/* Vencedor em caso de empate */}
                        {isDraw && !isLocked && homeTeam && awayTeam && (
                          <div className="mt-2 pt-2 border-t">
                            <p className="text-xs text-muted-foreground mb-1.5">Empate no tempo normal — quem avança?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleWinnerSelect(match.id, homeTeam.id)}
                                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium border transition-colors ${pred?.winner_team_id === homeTeam.id ? "bg-green-600 text-white border-green-600" : "hover:bg-muted"}`}>
                                {homeTeam.fifa_code}
                              </button>
                              <button
                                onClick={() => handleWinnerSelect(match.id, awayTeam.id)}
                                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium border transition-colors ${pred?.winner_team_id === awayTeam.id ? "bg-green-600 text-white border-green-600" : "hover:bg-muted"}`}>
                                {awayTeam.fifa_code}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Resultado oficial */}
                        {match.status === "FINISHED" && match.home_score !== null && (
                          <div className="mt-1 text-center text-xs text-muted-foreground">
                            Resultado: {match.home_score} × {match.away_score}
                          </div>
                        )}
                        {isLocked && <Badge variant="secondary" className="mt-1 text-xs">Palpites encerrados</Badge>}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
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
