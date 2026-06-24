"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClipboardEdit, Loader2, RefreshCw, Save, Search, ChevronDown, ChevronUp } from "lucide-react"
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
  group_letter: string | null
  match_number: number
  scheduled_at: string
  status: string
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  home_team: Team | null
  away_team: Team | null
}

interface EditState {
  home: string
  away: string
  winnerId: number | null
}

const STAGE_SHORT: Record<string, string> = {
  GROUP: "Grupos", R32: "16 avos", R16: "Oitavas", QF: "Quartas", SF: "Semis", "3RD": "3º Lugar", FINAL: "Final",
}

export function MatchResultsEditor() {
  const [open, setOpen] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)
  const [edits, setEdits] = useState<Map<number, EditState>>(new Map())
  const [savingId, setSavingId] = useState<number | null>(null)
  const [msg, setMsg] = useState("")
  const [search, setSearch] = useState("")
  const [showAll, setShowAll] = useState(false)
  // Congelado na montagem: serve só para separar jogos já iniciados dos futuros
  const [now] = useState(() => Date.now())

  async function loadMatches() {
    setLoading(true)
    const res = await fetch("/api/admin/matches")
    if (res.ok) {
      const data = await res.json()
      setMatches(data.matches ?? [])
    }
    setLoading(false)
  }

  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next && matches.length === 0) loadMatches()
  }

  function getEdit(m: Match): EditState {
    return edits.get(m.id) ?? {
      home: m.home_score !== null ? String(m.home_score) : "",
      away: m.away_score !== null ? String(m.away_score) : "",
      winnerId: m.winner_team_id,
    }
  }

  function setEdit(matchId: number, patch: Partial<EditState>, base: EditState) {
    setEdits(prev => new Map(prev).set(matchId, { ...base, ...patch }))
  }

  async function saveResult(m: Match, asStatus: "FINISHED" | "LIVE") {
    const edit = getEdit(m)
    const home = parseInt(edit.home)
    const away = parseInt(edit.away)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setMsg(`❌ Jogo ${m.match_number}: preencha os dois placares.`)
      return
    }

    // Mata-mata encerrado precisa de vencedor (empate no tempo normal → escolha manual)
    let winnerId: number | null = null
    if (m.stage !== "GROUP" && asStatus === "FINISHED") {
      if (home > away) winnerId = m.home_team?.id ?? null
      else if (away > home) winnerId = m.away_team?.id ?? null
      else winnerId = edit.winnerId
      if (!winnerId) {
        setMsg(`❌ Jogo ${m.match_number}: empate no mata-mata — selecione quem avançou.`)
        return
      }
    }

    setSavingId(m.id)
    setMsg("")

    const res = await fetch("/api/admin/matches", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: m.id,
        home_score: home,
        away_score: away,
        status: asStatus,
        ...(m.stage !== "GROUP" && asStatus === "FINISHED" ? { winner_team_id: winnerId } : {}),
      }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMsg(`❌ Erro ao salvar: ${data.error ?? res.statusText}`)
      setSavingId(null)
      return
    }

    // Jogo encerrado → recalcula pontos do jogo + ranking de todos
    if (asStatus === "FINISHED") {
      const scoreRes = await fetch(`/api/admin/score?matchId=${m.id}`, { method: "POST" })
      if (scoreRes.ok) {
        const data = await scoreRes.json()
        setMsg(`✓ Jogo ${m.match_number} salvo · ${data.processed} participantes pontuados · ranking atualizado`)
      } else {
        setMsg(`⚠️ Placar salvo, mas houve erro ao recalcular pontos — use "Recalcular Pontos".`)
      }
    } else {
      setMsg(`✓ Placar ao vivo do jogo ${m.match_number} atualizado (pontos só contam ao encerrar).`)
    }

    setSavingId(null)
    // Atualiza a linha local sem refetch completo
    setMatches(prev => prev.map(x => x.id === m.id
      ? { ...x, home_score: home, away_score: away, status: asStatus, winner_team_id: winnerId ?? x.winner_team_id }
      : x))
  }

  const visible = matches
    .filter(m => showAll || m.status === "LIVE" || m.status === "FINISHED" || new Date(m.scheduled_at).getTime() <= now)
    .filter(m => {
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (
        m.home_team?.name?.toLowerCase().includes(q) ||
        m.away_team?.name?.toLowerCase().includes(q) ||
        m.home_team?.fifa_code?.toLowerCase().includes(q) ||
        m.away_team?.fifa_code?.toLowerCase().includes(q) ||
        (m.group_letter ? `grupo ${m.group_letter.toLowerCase()}`.includes(q) : false)
      )
    })
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

  const isError = msg.startsWith("❌")
  const isWarning = msg.startsWith("⚠️")

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <button
            onClick={toggleOpen}
            className="flex items-center gap-2.5 hover:opacity-80 cursor-pointer transition-opacity"
          >
            <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 p-1.5 rounded-md">
              <ClipboardEdit className="w-3.5 h-3.5" />
            </span>
            Correção Manual de Placar
            {open
              ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          {open && (
            <button
              onClick={loadMatches}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Recarregar jogos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-3">
          <p className="text-xs text-muted-foreground">
            Use apenas se a atualização automática trouxer um placar errado ou indisponível.
            &quot;Encerrar e pontuar&quot; salva o placar e já recalcula pontos e ranking do jogo.
          </p>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar seleção ou grupo…"
                className="w-full text-sm rounded-md border bg-background pl-8 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground select-none shrink-0 cursor-pointer">
              <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="cursor-pointer" />
              Jogos futuros
            </label>
          </div>

          {msg && (
            <div className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 ${
              isError
                ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                : isWarning
                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
            }`}>
              <span>{msg.replace(/^[✓❌⚠️]\s*/, "")}</span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {matches.length === 0 ? "Nenhum jogo carregado." : "Nenhum jogo já iniciado encontrado — marque \"Jogos futuros\" para ver todos."}
            </p>
          ) : (
            <div className="divide-y max-h-[28rem] overflow-y-auto -mx-2 px-2">
              {visible.map(m => {
                const edit = getEdit(m)
                const isDraw = edit.home !== "" && edit.home === edit.away
                const needsWinner = m.stage !== "GROUP" && isDraw
                return (
                  <div key={m.id} className="py-3 space-y-2 hover:bg-muted/20 -mx-2 px-2 transition-colors rounded-md">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {new Date(m.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
                      </span>
                      <span>· {m.stage === "GROUP" ? `Grupo ${m.group_letter}` : STAGE_SHORT[m.stage] ?? m.stage} · J{m.match_number}</span>
                      {m.status === "LIVE" && <Badge variant="live" className="text-[10px]">AO VIVO</Badge>}
                      {m.status === "FINISHED" && <Badge variant="secondary" className="text-[10px]">Encerrado</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 items-center gap-1.5 min-w-0 justify-end">
                        <span className="text-sm font-medium truncate">{m.home_team?.fifa_code ?? "?"}</span>
                        <TeamFlag flagUrl={m.home_team?.flag_url} name={m.home_team?.name ?? "?"} size="sm" />
                      </div>
                      <input
                        type="number" min={0} max={99} inputMode="numeric"
                        value={edit.home}
                        onChange={e => setEdit(m.id, { home: e.target.value }, edit)}
                        className="w-11 h-9 text-center font-bold rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-muted-foreground text-sm font-medium">×</span>
                      <input
                        type="number" min={0} max={99} inputMode="numeric"
                        value={edit.away}
                        onChange={e => setEdit(m.id, { away: e.target.value }, edit)}
                        className="w-11 h-9 text-center font-bold rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex flex-1 items-center gap-1.5 min-w-0">
                        <TeamFlag flagUrl={m.away_team?.flag_url} name={m.away_team?.name ?? "?"} size="sm" />
                        <span className="text-sm font-medium truncate">{m.away_team?.fifa_code ?? "?"}</span>
                      </div>
                    </div>

                    {needsWinner && m.home_team && m.away_team && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">Quem avançou?</span>
                        {[m.home_team, m.away_team].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setEdit(m.id, { winnerId: t.id }, edit)}
                            className={`flex-1 py-1 px-2 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                              edit.winnerId === t.id
                                ? "bg-green-600 text-white border-green-600"
                                : "hover:bg-muted"
                            }`}
                          >
                            {t.fifa_code}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm" variant="outline" className="flex-1 h-7 text-xs cursor-pointer"
                        disabled={savingId === m.id}
                        onClick={() => saveResult(m, "LIVE")}
                      >
                        {savingId === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar parcial (ao vivo)"}
                      </Button>
                      <Button
                        size="sm" className="flex-1 h-7 text-xs bg-green-700 hover:bg-green-800 text-white cursor-pointer"
                        disabled={savingId === m.id}
                        onClick={() => saveResult(m, "FINISHED")}
                      >
                        {savingId === m.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <><Save className="w-3 h-3 mr-1" /> Encerrar e pontuar</>}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
