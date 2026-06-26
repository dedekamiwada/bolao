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
  group_letter: string | null
}

interface R32Slot {
  slot: number       // match_number (73–88)
  homeSource: string // ex: "1C", "2F", "3ABCDF"
  awaySource: string
}

interface Match {
  id: number
  match_number: number
  scheduled_at: string
  status: string
  home_team: Team | null
  away_team: Team | null
}

// "1C" → { pos: 1, groups: ["C"] }
// "3ABCDF" → { pos: 3, groups: ["A","B","C","D","F"] }
function parseSource(source: string): { pos: number; groups: string[] } {
  const direct = source.match(/^([123])([A-L])$/)
  if (direct) return { pos: Number(direct[1]), groups: [direct[2]] }
  const third = source.match(/^3([A-L]+)$/)
  if (third) return { pos: 3, groups: third[1].split("") }
  return { pos: 0, groups: [] }
}

function sourceLabel(source: string): string {
  const { pos, groups } = parseSource(source)
  if (groups.length === 1) return `${pos}º Grupo ${groups[0]}`
  return `3º (${groups.join("/")})`
}

function teamsForSource(source: string, teams: Team[]): Team[] {
  const { groups } = parseSource(source)
  if (!groups.length) return teams
  return teams.filter(t => t.group_letter && groups.includes(t.group_letter))
}

export function KnockoutTeamAssigner() {
  const [open, setOpen] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [seeding, setSeeding] = useState<R32Slot[]>([])
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
      // Apenas R32 — R16+ são preenchidos automaticamente pelo sync
      setMatches((data.matches ?? []).filter((m: Match & { stage: string }) => m.stage === "R32"))
    }
    if (teamRes.ok) {
      const data = await teamRes.json()
      setTeams(data.teams ?? [])
      setSeeding(data.r32Seeding ?? [])
    }
    setLoading(false)
  }

  function toggle() {
    if (!open && matches.length === 0) load()
    setOpen(v => !v)
  }

  function seedingFor(match_number: number): R32Slot | null {
    return seeding.find(s => s.slot === match_number) ?? null
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

  function isDirty(match: Match) {
    if (!edits.has(match.id)) return false
    const { homeId, awayId } = getEdit(match)
    return homeId !== (match.home_team?.id ?? null) || awayId !== (match.away_team?.id ?? null)
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

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={toggle}>
        <CardTitle className="text-base font-semibold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-green-700 dark:text-green-400" />
            Times do Mata-Mata (16 avos)
          </span>
          <div className="flex items-center gap-2">
            {open && (
              <button
                onClick={e => { e.stopPropagation(); load() }}
                aria-label="Atualizar"
                className="text-muted-foreground hover:text-foreground"
              >
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
            Defina os times de cada jogo dos 16 avos conforme as classificações da fase de grupos.
            Os times das fases seguintes (oitavas em diante) são preenchidos automaticamente pelo sync.
          </p>

          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : matches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum jogo encontrado.</p>
          ) : (
            <div className="space-y-3">
              {matches.map(match => {
                const slot = seedingFor(match.match_number)
                const { homeId, awayId } = getEdit(match)
                const dirty = isDirty(match)
                const homeTeam = teams.find(t => t.id === homeId)
                const awayTeam = teams.find(t => t.id === awayId)
                const homeOptions = slot ? teamsForSource(slot.homeSource, teams) : teams
                const awayOptions = slot ? teamsForSource(slot.awaySource, teams) : teams

                return (
                  <div key={match.id} className="border rounded-lg p-3 space-y-2">
                    {/* Cabeçalho do jogo */}
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold">
                          Jogo {match.match_number}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(match.scheduled_at).toLocaleDateString("pt-BR", {
                            day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo",
                          })}
                          {" "}
                          {new Date(match.scheduled_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
                          })}
                        </span>
                      </div>
                      <Badge
                        variant={match.home_team && match.away_team ? "success" : "outline"}
                        className="text-[10px]"
                      >
                        {match.home_team && match.away_team ? "Definido" : "Pendente"}
                      </Badge>
                    </div>

                    {/* Rótulos do seeding (quem pode jogar aqui) */}
                    {slot && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{sourceLabel(slot.homeSource)}</span>
                        <span>×</span>
                        <span className="font-medium text-foreground">{sourceLabel(slot.awaySource)}</span>
                      </div>
                    )}

                    {/* Seletores de time */}
                    <div className="flex items-end gap-2">
                      {/* Casa */}
                      <div className="flex-1 space-y-1">
                        <p className="text-[11px] text-muted-foreground">
                          Casa {slot ? `· ${sourceLabel(slot.homeSource)}` : ""}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {homeTeam && (
                            <TeamFlag flagUrl={homeTeam.flag_url} name={homeTeam.name} size="sm" />
                          )}
                          <select
                            className="flex-1 text-xs border rounded px-2 py-1.5 bg-background text-foreground"
                            value={homeId ?? ""}
                            onChange={e => setEdit(match.id, "homeId", e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value="">— selecionar —</option>
                            {homeOptions.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.fifa_code} – {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <span className="text-muted-foreground text-xs font-bold pb-1.5">×</span>

                      {/* Visitante */}
                      <div className="flex-1 space-y-1">
                        <p className="text-[11px] text-muted-foreground">
                          Visitante {slot ? `· ${sourceLabel(slot.awaySource)}` : ""}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {awayTeam && (
                            <TeamFlag flagUrl={awayTeam.flag_url} name={awayTeam.name} size="sm" />
                          )}
                          <select
                            className="flex-1 text-xs border rounded px-2 py-1.5 bg-background text-foreground"
                            value={awayId ?? ""}
                            onChange={e => setEdit(match.id, "awayId", e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value="">— selecionar —</option>
                            {awayOptions.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.fifa_code} – {t.name}
                              </option>
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
                        {savingId === match.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Save className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </CardContent>
      )}
    </Card>
  )
}
