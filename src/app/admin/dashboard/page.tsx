"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, RefreshCw, Copy, Check, LogOut, Loader2, Plus, Trash2, Calculator, RotateCcw, AlertCircle, CheckCircle2, CalendarClock, Timer } from "lucide-react"
import { MatchResultsEditor } from "@/components/admin/MatchResultsEditor"

interface Participant {
  id: string
  name: string
  created_at: string
  is_active: boolean
}

type DateDiff = {
  match_id: number; home_team: string; away_team: string
  db_date: string; api_date: string; diff_minutes: number; status: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState("")
  const [generatedFor, setGeneratedFor] = useState("")
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState("")
  const [scoring, setScoring] = useState(false)
  const [scoreMsg, setScoreMsg] = useState("")
  const [copiedLink, setCopiedLink] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const [dateDiffs, setDateDiffs] = useState<DateDiff[] | null>(null)
  const [checkingDates, setCheckingDates] = useState(false)
  const [fixingDates, setFixingDates] = useState(false)
  const [dateFixMsg, setDateFixMsg] = useState("")

  interface MatchInfo { id: number; match_number: number; group_letter: string; scheduled_at: string; status: string; home_team: { fifa_code: string } | null; away_team: { fifa_code: string } | null }
  interface MatchOverride { match_id: number; close_at: string; match: MatchInfo | null }
  interface DeadlineConfig { r1CutoffMinutes: number; r23CutoffMinutes: number; matchOverrides: MatchOverride[]; availableMatches: MatchInfo[] }
  const [deadlineConfig, setDeadlineConfig] = useState<DeadlineConfig | null>(null)
  const [deadlineLoading, setDeadlineLoading] = useState(false)
  const [r1Input, setR1Input] = useState("")
  const [r23Input, setR23Input] = useState("")
  const [deadlineMsg, setDeadlineMsg] = useState("")
  const [savingRound, setSavingRound] = useState<"r1" | "r23" | null>(null)
  const [newOverrideMatchId, setNewOverrideMatchId] = useState<number | "">("")
  const [newOverrideCloseAt, setNewOverrideCloseAt] = useState("")
  const [savingOverride, setSavingOverride] = useState(false)
  const [removingOverride, setRemovingOverride] = useState<number | null>(null)

  interface PredStatus { id: string; name: string; done: number; total: number; complete: boolean; missing: number }
  const [predStatus, setPredStatus] = useState<{ windowLabel: string; windowDeadline: string | null; statuses: PredStatus[] } | null>(null)
  const [predStatusLoading, setPredStatusLoading] = useState(false)

  useEffect(() => { loadParticipants(); loadPredStatus(); loadDeadlineConfig() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDeadlineConfig() {
    setDeadlineLoading(true)
    const res = await fetch("/api/admin/deadline-config")
    if (res.ok) {
      const data = await res.json()
      setDeadlineConfig(data)
      setR1Input(String(data.r1CutoffMinutes))
      setR23Input(String(data.r23CutoffMinutes))
    }
    setDeadlineLoading(false)
  }

  async function saveRoundCutoff(round: "r1" | "r23") {
    const minutes = round === "r1" ? Number(r1Input) : Number(r23Input)
    if (isNaN(minutes)) return
    setSavingRound(round)
    setDeadlineMsg("")
    const res = await fetch("/api/admin/deadline-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "round", round, minutes }),
    })
    setSavingRound(null)
    if (res.ok) {
      setDeadlineMsg(`✓ Cutoff da ${round === "r1" ? "Rodada 1" : "Rodadas 2+3"} atualizado para ${minutes} min.`)
      loadDeadlineConfig()
    } else {
      setDeadlineMsg("❌ Erro ao salvar.")
    }
  }

  async function saveMatchOverride() {
    if (!newOverrideMatchId || !newOverrideCloseAt) return
    setSavingOverride(true)
    setDeadlineMsg("")
    const res = await fetch("/api/admin/deadline-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "match_override", matchId: newOverrideMatchId, closeAt: new Date(newOverrideCloseAt).toISOString() }),
    })
    setSavingOverride(false)
    if (res.ok) {
      setDeadlineMsg("✓ Prazo específico salvo.")
      setNewOverrideMatchId("")
      setNewOverrideCloseAt("")
      loadDeadlineConfig()
    } else {
      setDeadlineMsg("❌ Erro ao salvar.")
    }
  }

  async function removeMatchOverride(matchId: number) {
    setRemovingOverride(matchId)
    setDeadlineMsg("")
    const res = await fetch("/api/admin/deadline-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "remove_override", matchId }),
    })
    setRemovingOverride(null)
    if (res.ok) {
      setDeadlineMsg("✓ Extensão removida.")
      loadDeadlineConfig()
    } else {
      setDeadlineMsg("❌ Erro ao remover.")
    }
  }

  async function loadPredStatus() {
    setPredStatusLoading(true)
    const res = await fetch("/api/admin/predictions-status")
    if (res.ok) setPredStatus(await res.json())
    setPredStatusLoading(false)
  }

  async function loadParticipants() {
    const res = await fetch("/api/admin/participants")
    if (res.status === 401) { router.push("/admin"); return }
    const data = await res.json()
    setParticipants(data.participants ?? [])
    setLoading(false)
  }

  async function createParticipant() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch("/api/admin/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setGeneratedLink(data.link)
      setGeneratedFor(newName.trim())
      setNewName("")
      loadParticipants()
    }
    setCreating(false)
  }

  async function regenerateToken(id: string, name: string) {
    if (!confirm(`Gerar novo link para "${name}"? O link anterior não funcionará mais.`)) return
    setActionId(id)
    const res = await fetch("/api/admin/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate: true, id }),
    })
    const data = await res.json()
    if (res.ok) {
      setGeneratedLink(data.link)
      setGeneratedFor(name)
    }
    setActionId(null)
  }

  async function copyLink(link?: string) {
    const url = link ?? generatedLink
    await navigator.clipboard.writeText(url)
    setCopiedLink(url)
    setTimeout(() => setCopiedLink(""), 2000)
  }

  async function hardDeleteParticipant(id: string, name: string) {
    if (!confirm(`⚠️ EXCLUIR DEFINITIVAMENTE "${name}"?\n\nTodos os palpites e pontuações serão apagados permanentemente. Esta ação não pode ser desfeita.`)) return
    setActionId(id)
    await fetch("/api/admin/participants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, hard: true }),
    })
    setActionId(null)
    loadParticipants()
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMsg("")
    try {
      const res = await fetch("/api/admin/matches/sync", { method: "POST" })
      const data = await res.json()
      setSyncing(false)
      if (res.ok) {
        const finished = data.newlyFinished?.length ?? 0
        const parts = [`✓ ${data.synced} jogos verificados`]
        if (data.linked > 0) parts.push(`${data.linked} IDs linkados`)
        if (finished > 0) {
          parts.push(`${finished} jogo${finished > 1 ? "s" : ""} encerrado${finished > 1 ? "s" : ""} — pontos e ranking atualizados automaticamente`)
        } else {
          parts.push("nenhum jogo encerrado novo")
        }
        setSyncMsg(parts.join(" · "))
      } else {
        setSyncMsg(`❌ ${data.error ?? "Erro desconhecido"}`)
      }
    } catch (err) {
      setSyncing(false)
      setSyncMsg(`❌ Erro de rede: ${String(err)}`)
    }
  }

  async function handleRecalculate() {
    setScoring(true)
    setScoreMsg("")
    const res = await fetch("/api/admin/score", { method: "POST" })
    const data = await res.json()
    setScoring(false)
    setScoreMsg(res.ok ? `✓ ${data.matchesProcessed} jogos recalculados` : "Erro ao recalcular")
  }

  async function handleCheckDates() {
    setCheckingDates(true)
    setDateDiffs(null)
    setDateFixMsg("")
    try {
      const res = await fetch("/api/admin/matches/fix-dates")
      const data = await res.json()
      if (res.ok) {
        setDateDiffs(data.diffs)
        if (data.diffs.length === 0) setDateFixMsg("✓ Todas as datas estão corretas.")
      } else {
        setDateFixMsg(`❌ ${data.error ?? "Erro desconhecido"}`)
      }
    } catch (err) {
      setDateFixMsg(`❌ Erro de rede: ${String(err)}`)
    }
    setCheckingDates(false)
  }

  async function handleFixDates() {
    if (!dateDiffs?.length) return
    setFixingDates(true)
    setDateFixMsg("")
    try {
      const res = await fetch("/api/admin/matches/fix-dates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      const data = await res.json()
      if (res.ok) {
        setDateFixMsg(`✓ ${data.updated} data${data.updated !== 1 ? "s" : ""} corrigida${data.updated !== 1 ? "s" : ""} com sucesso.`)
        setDateDiffs(null)
      } else {
        setDateFixMsg(`❌ ${data.error ?? "Erro desconhecido"}`)
      }
    } catch (err) {
      setDateFixMsg(`❌ Erro de rede: ${String(err)}`)
    }
    setFixingDates(false)
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" })
    router.push("/admin")
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="bg-green-900 text-white px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold">Painel Admin</h1>
          <p className="text-green-300 text-xs">Bolão Copa 2026</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Sair" className="text-green-300 hover:text-white hover:bg-green-800">
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Sincronização e Pontuação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Resultados &amp; Pontuação
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSync} disabled={syncing} size="sm" className="bg-green-700 hover:bg-green-800 text-white">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Atualizar Jogos (automático)
              </Button>
              <Button onClick={handleRecalculate} disabled={scoring} variant="outline" size="sm">
                {scoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                Recalcular Pontos
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Atualizar Jogos</strong> busca os placares oficiais na football-data.org (1 requisição),
              atualiza jogos ao vivo, encerra os finalizados e já pontua participantes e ranking.
              <strong> Recalcular Pontos</strong> refaz a pontuação de todos os jogos encerrados — use após corrigir um placar manualmente.
            </p>
            {syncMsg && <p className="text-xs text-muted-foreground">{syncMsg}</p>}
            {scoreMsg && <p className="text-xs text-muted-foreground">{scoreMsg}</p>}
          </CardContent>
        </Card>

        {/* Edição manual de resultados */}
        <MatchResultsEditor />

        {/* Correção de Datas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Correção de Datas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <p className="text-xs text-muted-foreground">
              Compara os horários dos jogos no banco com a football-data.org e corrige divergências.
              Nunca altera placares ou palpites.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCheckDates} disabled={checkingDates || fixingDates} size="sm" variant="outline">
                {checkingDates ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarClock className="w-4 h-4 mr-2" />}
                Verificar Datas
              </Button>
              {dateDiffs && dateDiffs.length > 0 && (
                <Button onClick={handleFixDates} disabled={fixingDates} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                  {fixingDates ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Corrigir {dateDiffs.length} jogo{dateDiffs.length !== 1 ? "s" : ""}
                </Button>
              )}
            </div>

            {dateDiffs && dateDiffs.length > 0 && (
              <div className="rounded border overflow-hidden text-xs">
                <div className="grid grid-cols-[1fr_1fr_auto] bg-muted px-3 py-1.5 font-medium text-muted-foreground gap-2">
                  <span>Jogo</span>
                  <span>Banco → API</span>
                  <span>Δ</span>
                </div>
                {dateDiffs.map(d => {
                  const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
                  const hours = Math.floor(d.diff_minutes / 60)
                  const mins = d.diff_minutes % 60
                  const delta = hours > 0 ? `${hours}h${mins > 0 ? `${mins}m` : ""}` : `${mins}m`
                  return (
                    <div key={d.match_id} className="grid grid-cols-[1fr_1fr_auto] px-3 py-2 gap-2 border-t items-start">
                      <div>
                        <span className="font-medium">{d.home_team} × {d.away_team}</span>
                        <Badge variant={d.status === "FINISHED" ? "secondary" : "outline"} className="ml-1.5 text-[10px]">
                          {d.status === "FINISHED" ? "Encerrado" : "Agendado"}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground leading-snug">
                        <span className="line-through">{fmt(d.db_date)}</span>
                        <br />
                        <span className="text-foreground font-medium">{fmt(d.api_date)}</span>
                      </div>
                      <span className="text-amber-600 font-semibold">{delta}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {dateFixMsg && <p className="text-xs text-muted-foreground">{dateFixMsg}</p>}
          </CardContent>
        </Card>

        {/* Prazo de Palpites */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Timer className="w-4 h-4" /> Prazo de Palpites
              </span>
              <button onClick={loadDeadlineConfig} aria-label="Atualizar" className="text-muted-foreground hover:text-foreground">
                <RefreshCw className={`w-3.5 h-3.5 ${deadlineLoading ? "animate-spin" : ""}`} />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {deadlineLoading && !deadlineConfig ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {/* Round cutoffs */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Minutos antes do 1º jogo para fechar palpites</p>
                  <div className="flex flex-col gap-2">
                    {(["r1", "r23"] as const).map(round => (
                      <div key={round} className="flex items-center gap-2">
                        <span className="text-xs w-28 shrink-0 text-muted-foreground">
                          {round === "r1" ? "Rodada 1" : "Rodadas 2 e 3"}
                        </span>
                        <Input
                          type="number"
                          className="h-8 w-20 text-sm"
                          value={round === "r1" ? r1Input : r23Input}
                          onChange={e => round === "r1" ? setR1Input(e.target.value) : setR23Input(e.target.value)}
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          disabled={savingRound === round}
                          onClick={() => saveRoundCutoff(round)}
                        >
                          {savingRound === round ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Use valores negativos para manter aberto após o início dos jogos (ex: -30 = fecha 30 min depois do 1º jogo).</p>
                </div>

                {/* Existing match overrides */}
                {deadlineConfig && deadlineConfig.matchOverrides.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Prazos específicos ativos</p>
                    <div className="divide-y rounded border overflow-hidden text-xs">
                      {deadlineConfig.matchOverrides.map(o => (
                        <div key={o.match_id} className="flex items-center justify-between px-3 py-2 gap-2 bg-card">
                          <div>
                            <span className="font-medium">
                              {o.match?.home_team?.fifa_code ?? "?"} × {o.match?.away_team?.fifa_code ?? "?"}
                            </span>
                            <span className="text-muted-foreground ml-1.5">
                              Grupo {o.match?.group_letter}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-muted-foreground">
                              até {new Date(o.close_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              disabled={removingOverride === o.match_id}
                              onClick={() => removeMatchOverride(o.match_id)}
                            >
                              {removingOverride === o.match_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add new match override */}
                {deadlineConfig && deadlineConfig.availableMatches.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Adicionar prazo por jogo</p>
                    <div className="flex flex-col gap-2">
                      <select
                        value={newOverrideMatchId}
                        onChange={e => setNewOverrideMatchId(e.target.value === "" ? "" : Number(e.target.value))}
                        className="text-xs border rounded px-2 py-1.5 bg-background w-full"
                      >
                        <option value="">Selecionar jogo…</option>
                        {deadlineConfig.availableMatches.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.home_team?.fifa_code ?? "?"} × {m.away_team?.fifa_code ?? "?"} — Grupo {m.group_letter} ({new Date(m.scheduled_at).toLocaleDateString("pt-BR")})
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <Input
                          type="datetime-local"
                          className="h-8 text-xs flex-1"
                          value={newOverrideCloseAt}
                          onChange={e => setNewOverrideCloseAt(e.target.value)}
                        />
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-green-700 hover:bg-green-800 text-white shrink-0"
                          disabled={savingOverride || !newOverrideMatchId || !newOverrideCloseAt}
                          onClick={saveMatchOverride}
                        >
                          {savingOverride ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {deadlineMsg && <p className="text-xs text-muted-foreground">{deadlineMsg}</p>}
              </>
            )}
          </CardContent>
        </Card>

        {/* Palpites incompletos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Palpites Incompletos
              </span>
              <button onClick={loadPredStatus} aria-label="Atualizar palpites" className="text-muted-foreground hover:text-foreground">
                <RefreshCw className={`w-3.5 h-3.5 ${predStatusLoading ? "animate-spin" : ""}`} />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {predStatusLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : !predStatus || predStatus.statuses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma janela de palpites aberta no momento.</p>
            ) : (
              <>
                <div className="mb-3 px-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Próximo fechamento: <span className="text-foreground font-semibold">{predStatus.windowLabel}</span>
                  </p>
                  {predStatus.windowDeadline && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Fecha em: {new Date(predStatus.windowDeadline).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Total de jogos nessa janela: <strong>{predStatus.statuses[0]?.total ?? 0}</strong>
                  </p>
                </div>
                <div className="divide-y">
                  {predStatus.statuses.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {p.complete
                          ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          : <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />}
                        <span className="text-sm font-medium truncate">{p.name}</span>
                      </div>
                      <div className="shrink-0 text-right">
                        {p.complete ? (
                          <Badge variant="success" className="text-xs">✓ Completo</Badge>
                        ) : (
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                            {p.done}/{p.total} — faltam {p.missing}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Link gerado (aparece após criar ou regenerar) */}
        {generatedLink && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 rounded-lg p-3 space-y-2">
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">
              ✓ Link de <strong>{generatedFor}</strong> — envie agora:
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-background border rounded px-2 py-1 flex-1 truncate">{generatedLink}</code>
              <Button size="sm" variant="outline" onClick={() => copyLink()}>
                {copiedLink === generatedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">⚠️ Guarde agora — o token não é armazenado.</p>
          </div>
        )}

        {/* Criar participante */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Adicionar Participante
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <label htmlFor="new-participant-name" className="sr-only">Nome do participante</label>
              <Input
                id="new-participant-name"
                name="participant-name"
                autoComplete="off"
                placeholder="Nome do participante"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createParticipant()}
              />
              <Button onClick={createParticipant} disabled={creating || !newName.trim()}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de participantes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" /> Participantes ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : participants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum participante ainda.</p>
            ) : (
              <div className="divide-y">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <Badge variant={p.is_active ? "success" : "secondary"} className="text-[10px] mt-0.5">
                        {p.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                        aria-label={`Gerar novo link para ${p.name}`}
                        onClick={() => regenerateToken(p.id, p.name)}
                        disabled={actionId === p.id}
                      >
                        {actionId === p.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <RotateCcw className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label={`Excluir ${p.name}`}
                        onClick={() => hardDeleteParticipant(p.id, p.name)}
                        disabled={actionId === p.id}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
