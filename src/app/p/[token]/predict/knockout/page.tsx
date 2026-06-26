"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Loader2, Info, Eye, Trophy } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { STAGE_LABELS, KNOCKOUT_POINTS } from "@/types/domain"
import type { Stage } from "@/types/domain"
import { MatchPredictionsModal } from "@/components/predict/MatchPredictionsModal"

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

function TeamFlag({ team }: { team: Team | null }) {
  if (!team) return <div className="w-8 h-6 rounded-sm bg-muted shrink-0" />
  if (!team.flag_url) return (
    <div className="w-8 h-6 rounded-sm bg-muted flex items-center justify-center shrink-0">
      <span className="text-[9px] font-bold text-muted-foreground">{team.fifa_code}</span>
    </div>
  )
  return (
    <Image
      src={team.flag_url}
      alt={team.name}
      width={32}
      height={22}
      className="rounded-sm object-cover shrink-0"
      unoptimized
    />
  )
}

export default function KnockoutPredictPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [matches, setMatches] = useState<KnockoutMatch[]>([])
  const [predictions, setPredictions] = useState<Map<number, KnockoutPrediction>>(new Map())
  const [lockedMatchIds, setLockedMatchIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [classifications, setClassifications] = useState<ClassifiedTeam[]>([])
  const [modalMatch, setModalMatch] = useState<KnockoutMatch | null>(null)

  useEffect(() => {
    fetch(`/api/p/${token}/knockout`)
      .then(r => r.json())
      .then(({ matches: m, predictions: p, classifications: c, lockedMatchIds: locked }) => {
        setMatches(m ?? [])
        setClassifications(c ?? [])
        setLockedMatchIds(new Set(locked ?? []))
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
      const match = matches.find(m => m.id === matchId)
      const existing = next.get(matchId) ?? {
        match_id: matchId,
        home_team_id: match?.home_team_id ?? null,
        away_team_id: match?.away_team_id ?? null,
        home_score: null,
        away_score: null,
        winner_team_id: null,
        is_locked: false,
      }
      const updated = { ...existing, [side === "home" ? "home_score" : "away_score"]: value === "" ? null : num }
      if (updated.home_score !== null && updated.away_score !== null) {
        if (updated.home_score > updated.away_score) updated.winner_team_id = updated.home_team_id
        else if (updated.away_score > updated.home_score) updated.winner_team_id = updated.away_team_id
        else updated.winner_team_id = null // empate → seleção manual obrigatória
      }
      next.set(matchId, updated)
      return next
    })
  }

  function handleWinnerSelect(matchId: number, winnerId: number) {
    setPredictions(prev => {
      const next = new Map(prev)
      const match = matches.find(m => m.id === matchId)
      const existing = next.get(matchId) ?? {
        match_id: matchId,
        home_team_id: match?.home_team_id ?? null,
        away_team_id: match?.away_team_id ?? null,
        home_score: null,
        away_score: null,
        winner_team_id: null,
        is_locked: false,
      }
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

  const closeModal = useCallback(() => setModalMatch(null), [])
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
    <main className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-green-900 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/p/${token}`}><ArrowLeft className="w-5 h-5 text-green-300" /></Link>
          <div>
            <h1 className="font-bold">Mata-Mata</h1>
            <p className="text-green-300 text-xs">
              {classifications.length > 0 ? "Baseado nos seus palpites da fase de grupos" : "Times definidos pelo chaveamento oficial"}
            </p>
          </div>
        </div>
        <Link href={`/p/${token}`}>
          <Button size="sm" variant="ghost" className="text-green-300 hover:text-white hover:bg-white/10 gap-1.5">
            <Trophy className="w-4 h-4" />
            <span className="text-xs">Ranking</span>
          </Button>
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-3 py-4 space-y-6">

        {/* Regras de pontuação */}
        <div className="rounded-xl border bg-muted/30 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pontuação do Mata-Mata</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {(STAGE_ORDER.filter(s => s in KNOCKOUT_POINTS) as Stage[]).map(s => {
              const pts = KNOCKOUT_POINTS[s]
              return (
                <div key={s} className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{STAGE_LABELS[s]}</span>
                  <span className="font-semibold tabular-nums text-right">
                    <span className="text-green-700 dark:text-green-400">{pts.exact} ★</span>
                    <span className="text-muted-foreground"> / {pts.result}</span>
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 border-t">
            <span className="font-semibold text-green-700 dark:text-green-400">★ Placar exato</span> = pontos do placar apenas (não acumula com quem passa).{" "}
            Acertar só quem passa = pontos do resultado.
          </p>
        </div>

        {/* Jogos por fase */}
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
                  const isLocked = lockedMatchIds.has(match.id) || pred?.is_locked || match.status === "LIVE" || match.status === "FINISHED"
                  const homeTeam = match.home_team
                  const awayTeam = match.away_team
                  const teamsKnown = !!(homeTeam && awayTeam)
                  const isDraw = pred?.home_score !== null && pred?.away_score !== null && pred?.home_score === pred?.away_score

                  return (
                    <Card key={match.id} className={isLocked ? "opacity-75" : ""}>
                      <CardContent className="p-3">

                        {/* Data + botão ver palpites */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(match.scheduled_at).toLocaleString("pt-BR", {
                              day: "2-digit", month: "2-digit",
                              hour: "2-digit", minute: "2-digit",
                              timeZone: "America/Sao_Paulo",
                            })}
                          </span>
                          <div className="flex items-center gap-2">
                            {isLocked && <Badge variant="secondary" className="text-[10px]">Encerrado</Badge>}
                            {teamsKnown && (
                              <button
                                onClick={() => setModalMatch(match)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Ver palpites dos participantes"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Times e placar */}
                        <div className="flex items-center gap-2">
                          {/* Casa */}
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <TeamFlag team={homeTeam} />
                            <div className="min-w-0">
                              <div className="text-sm font-bold truncate leading-tight">{homeTeam?.fifa_code ?? "?"}</div>
                              {homeTeam?.name && <div className="text-[10px] text-muted-foreground truncate leading-tight">{homeTeam.name}</div>}
                            </div>
                          </div>

                          {/* Inputs */}
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number" min={0} max={99} inputMode="numeric"
                              value={pred?.home_score ?? ""}
                              onChange={e => handleScoreChange(match.id, "home", e.target.value)}
                              disabled={isLocked || !teamsKnown}
                              placeholder="–"
                              className="w-10 h-10 text-center text-lg font-bold rounded-md border focus:outline-none focus:ring-2 focus:ring-primary bg-background disabled:bg-muted disabled:cursor-not-allowed"
                            />
                            <span className="text-muted-foreground text-sm font-medium">×</span>
                            <input
                              type="number" min={0} max={99} inputMode="numeric"
                              value={pred?.away_score ?? ""}
                              onChange={e => handleScoreChange(match.id, "away", e.target.value)}
                              disabled={isLocked || !teamsKnown}
                              placeholder="–"
                              className="w-10 h-10 text-center text-lg font-bold rounded-md border focus:outline-none focus:ring-2 focus:ring-primary bg-background disabled:bg-muted disabled:cursor-not-allowed"
                            />
                          </div>

                          {/* Visitante */}
                          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                            <div className="min-w-0 text-right">
                              <div className="text-sm font-bold truncate leading-tight">{awayTeam?.fifa_code ?? "?"}</div>
                              {awayTeam?.name && <div className="text-[10px] text-muted-foreground truncate leading-tight">{awayTeam.name}</div>}
                            </div>
                            <TeamFlag team={awayTeam} />
                          </div>
                        </div>

                        {/* Quem avança em caso de empate */}
                        {isDraw && !isLocked && homeTeam && awayTeam && (
                          <div className="mt-2.5 pt-2.5 border-t">
                            <p className="text-xs text-muted-foreground mb-2">Empate no tempo normal — quem avança?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleWinnerSelect(match.id, homeTeam.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold border transition-colors ${pred?.winner_team_id === homeTeam.id ? "bg-green-600 text-white border-green-600" : "hover:bg-muted border-border"}`}
                              >
                                <TeamFlag team={homeTeam} />
                                {homeTeam.fifa_code}
                              </button>
                              <button
                                onClick={() => handleWinnerSelect(match.id, awayTeam.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold border transition-colors ${pred?.winner_team_id === awayTeam.id ? "bg-green-600 text-white border-green-600" : "hover:bg-muted border-border"}`}
                              >
                                {awayTeam.fifa_code}
                                <TeamFlag team={awayTeam} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Quem avança (não-empate, readonly) */}
                        {!isDraw && pred?.winner_team_id && !isLocked && (
                          <div className="mt-1.5 text-[11px] text-muted-foreground">
                            Passa: <span className="font-semibold text-foreground">
                              {pred.winner_team_id === homeTeam?.id ? homeTeam?.fifa_code : awayTeam?.fifa_code}
                            </span>
                          </div>
                        )}

                        {/* Resultado oficial */}
                        {match.status === "FINISHED" && match.home_score !== null && (
                          <div className="mt-1.5 text-xs text-muted-foreground">
                            Resultado oficial: <span className="font-semibold text-foreground">{match.home_score} × {match.away_score}</span>
                            {match.winner_team_id && (
                              <span className="ml-1">
                                · Classificado: <span className="font-semibold text-foreground">
                                  {match.winner_team_id === homeTeam?.id ? homeTeam?.fifa_code : awayTeam?.fifa_code}
                                </span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Times ainda não definidos */}
                        {!teamsKnown && (
                          <p className="mt-2 text-xs text-muted-foreground italic">
                            Times serão definidos após os jogos anteriores.
                          </p>
                        )}
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
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-700 hover:bg-green-800 text-white"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Palpites
          </Button>
        </div>
      </div>

      {/* Modal de palpites dos participantes */}
      {modalMatch && (
        <MatchPredictionsModal
          match={{
            id: modalMatch.id,
            stage: modalMatch.stage,
            status: modalMatch.status,
            home_score: modalMatch.home_score,
            away_score: modalMatch.away_score,
            home_team: modalMatch.home_team,
            away_team: modalMatch.away_team,
            scheduled_at: modalMatch.scheduled_at,
          }}
          isLocked={modalMatch.status !== "SCHEDULED"}
          isFinished={modalMatch.status === "FINISHED"}
          onClose={closeModal}
        />
      )}
    </main>
  )
}
