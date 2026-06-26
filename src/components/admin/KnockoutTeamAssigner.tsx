"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GitMerge, Loader2, RefreshCw, Save, ChevronDown, ChevronUp } from "lucide-react"
import { TeamFlag } from "@/components/shared/TeamFlag"

interface Team {
  id: number
  fifa_code: string
  name: string
  flag_url: string | null
}

interface Match {
  id: number
  stage: string
  match_number: number
  scheduled_at: string
  status: string
  home_team: Team | null
  away_team: Team | null
}

const STAGE_SHORT: Record<string, string> = {
  R32: "16 avos", R16: "Oitavas", QF: "Quartas", SF: "Semis", "3RD": "3º Lugar", FINAL: "Final",
}
const STAGE_ORDER = ["R32", "R16", "QF", "SF", "3RD", "FINAL"]

export function KnockoutTeamAssigner() {
  const [open, setOpen] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [msg, setMsg] = useState("")
  const [edits, setEdits] = useState<Map<number, { homeId: number | null; awayId: number | null }>>(new Map())

  async function load() {
    setLoading(true)
    const [matchRes, teamRes] = await Promise.all([
      fetch("/api/admin/matches"),
      fetch("/api/admin/teams"),
    ])
    if (matchRes.ok) {
      const data = await matchRes.json()
      const ko = (data.matches ?? []).filter((m: Match) => m.stage !== "GROUP")
      setMatches(ko)
    }
    if (teamRes.ok) {
      const data = await teamRes.json()
      setTeams(data.teams ?? [])
    }
    setLoading(false)
  }

  function toggle() {
    if (!open && matches.length === 0) load()
    setOpen(v => !v)
  }

  function getEdit(match: Match) {
    const e = edits.get(match.id)
    return {
      homeId: e?.homeId !== undefined ? e.homeId : (match.home_team?.id ?? null),
      awayId: e?.awayId !== undefined ? e.awayId : (match.away_team?.id ?? null),
    }
  }

  function setEdit(matchId: number, key: "homeId" | "awayId", value: number | null) {
    setEdits(prev => {
      const next = new Map(prev)
      const cur = next.get(matchId) ?? { homeId: null, awayId: null }
      next.set(matchId, { ...cur, [key]: value })
      return next
    })
  }

  async function save(match: Match) {
    const { homeId, awayId } = getEdit(match)
    setSavingId(match.id); setMsg("")
    const res = await fetch("/api/admin/matches", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: match.id, home_team_id: homeId, away_team_id: awayId }),
    })
    setSavingId(null)
    if (res.ok) {
      setMsg(`✓ Jogo #${match.match_number} atualizado.`)
      // Update local state
      setMatches(prev => prev.map(m => {
        if (m.id !== match.id) return m
        const home = teams.find(t => t.id === homeId) ?? null
        const away = teams.find(t => t.id === awayId) ?? null
        return { ...m, home_team: home, away_team: away }
      }))
      setEdits(prev => { const next = new Map(prev); next.delete(match.id); return next })
    } else {
      const data = await res.json()
      setMsg(`❌ ${data.error ?? "Erro ao salvar"}`)
    }
  }

  function isDirty(match: Match) {
    if (!edits.has(match.id)) return false
    const { homeId, awayId } = getEdit(match)
    return homeId !== (match.home_team?.id ?? null) || awayId !== (match.away_team?.id ?? null)
  }

  const byStage = new Map<string, Match[]>()
  for (const m of matches) {
    if (!byStage.has(m.stage)) byStage.set(m.stage, [])
    byStage.get(m.stage)!.push(m)
  }
  const stages = STAGE_ORDER.filter(s => byStage.has(s))

  const teamOptions = [...teams].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={toggle}>
        <CardTitle className="text-base font-semibold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-green-700 dark:text-green-400" />
            Times do Mata-Mata
          </span>
          <div className="flex items-center gap-2">
            {open && (
              <button onClick={e => { e.stopPropagation(); load() }} aria-label="Atualizar" className="text-muted-foreground hover:text-foreground">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-4">
          <p className="text-xs text-muted-foreground">
            Defina manualmente os times de cada jogo do mata-mata assim que as classificações forem confirmadas.
            Os palpites ficam disponíveis para os participantes assim que os dois times estiverem preenchidos.
          </p>

          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : stages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum jogo de mata-mata encontrado.</p>
          ) : (
            <div className="space-y-4">
              {stages.map(stage => (
                <div key={stage}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    {STAGE_SHORT[stage] ?? stage}
                  </p>
                  <div className="space-y-2">
                    {byStage.get(stage)!.map(match => {
                      const { homeId, awayId } = getEdit(match)
                      const dirty = isDirty(match)
                      const homeTeam = teams.find(t => t.id === homeId)
                      const awayTeam = teams.find(t => t.id === awayId)
                      return (
                        <div key={match.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground font-medium">
                              Jogo {match.match_number} · {new Date(match.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                            </span>
                            <Badge variant={match.home_team && match.away_team ? "success" : "outline"} className="text-[10px]">
                              {match.home_team && match.away_team ? "Definido" : "Pendente"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Home */}
                            <div className="flex-1 space-y-1">
                              <p className="text-[11px] text-muted-foreground">Casa</p>
                              <div className="flex items-center gap-1.5">
                                {homeTeam && <TeamFlag flagUrl={homeTeam.flag_url} name={homeTeam.name} size="sm" />}
                                <select
                                  className="flex-1 text-xs border rounded px-2 py-1.5 bg-background text-foreground"
                                  value={homeId ?? ""}
                                  onChange={e => setEdit(match.id, "homeId", e.target.value ? Number(e.target.value) : null)}
                                >
                                  <option value="">— selecionar —</option>
                                  {teamOptions.map(t => (
                                    <option key={t.id} value={t.id}>{t.fifa_code} – {t.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <span className="text-muted-foreground text-xs font-bold self-end pb-1.5">×</span>

                            {/* Away */}
                            <div className="flex-1 space-y-1">
                              <p className="text-[11px] text-muted-foreground">Fora</p>
                              <div className="flex items-center gap-1.5">
                                {awayTeam && <TeamFlag flagUrl={awayTeam.flag_url} name={awayTeam.name} size="sm" />}
                                <select
                                  className="flex-1 text-xs border rounded px-2 py-1.5 bg-background text-foreground"
                                  value={awayId ?? ""}
                                  onChange={e => setEdit(match.id, "awayId", e.target.value ? Number(e.target.value) : null)}
                                >
                                  <option value="">— selecionar —</option>
                                  {teamOptions.map(t => (
                                    <option key={t.id} value={t.id}>{t.fifa_code} – {t.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              className="self-end h-8 text-xs bg-green-700 hover:bg-green-800 text-white shrink-0"
                              disabled={!dirty || savingId === match.id}
                              onClick={() => save(match)}
                            >
                              {savingId === match.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </CardContent>
      )}
    </Card>
  )
}
