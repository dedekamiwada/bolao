"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, RefreshCw, Copy, Check, LogOut, Loader2, Plus, Trash2, Calculator, RotateCcw, AlertCircle, CheckCircle2, CalendarClock, Timer, ShieldCheck } from "lucide-react"
import { MatchResultsEditor } from "@/components/admin/MatchResultsEditor"
import { KnockoutTeamAssigner } from "@/components/admin/KnockoutTeamAssigner"

interface Participant { id: string; name: string; created_at: string; is_active: boolean }
type DateDiff = { match_id: number; home_team: string; away_team: string; db_date: string; api_date: string; diff_minutes: number; status: string }
interface MatchInfo { id: number; match_number: number; group_letter: string | null; scheduled_at: string; status: string; round?: 1 | 2 | 3; koStage?: string | null; koStageLabel?: string; home_team: { fifa_code: string } | null; away_team: { fifa_code: string } | null }
interface MatchOverride { match_id: number; close_at: string; match: MatchInfo | null }
interface DeadlineConfig { r1CutoffMinutes: number; r23CutoffMinutes: number; koCutoffMinutes: Record<string, number>; matchOverrides: MatchOverride[]; availableGroupMatches: MatchInfo[]; availableKoMatches: MatchInfo[] }
interface PredStatus { id: string; name: string; done: number; total: number; complete: boolean; missing: number }
interface WindowInfo { key: string; label: string; deadline: string | null }
interface PredStatusData { windowLabel: string; windowDeadline: string | null; totalExpected: number; statuses: PredStatus[]; availableWindows: WindowInfo[]; activeWindow: string | null }

type Tab = "jogos" | "palpites" | "participantes"

export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("jogos")

  // ── Jogos tab ──────────────────────────────────────────────
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState("")
  const [scoring, setScoring] = useState(false)
  const [scoreMsg, setScoreMsg] = useState("")
  const [dateDiffs, setDateDiffs] = useState<DateDiff[] | null>(null)
  const [checkingDates, setCheckingDates] = useState(false)
  const [fixingDates, setFixingDates] = useState(false)
  const [dateFixMsg, setDateFixMsg] = useState("")

  // ── Palpites tab ───────────────────────────────────────────
  const [deadlineConfig, setDeadlineConfig] = useState<DeadlineConfig | null>(null)
  const [deadlineLoading, setDeadlineLoading] = useState(false)
  const [r1Input, setR1Input] = useState("")
  const [r23Input, setR23Input] = useState("")
  const [koInputs, setKoInputs] = useState<Record<string, string>>({})
  const [deadlineMsg, setDeadlineMsg] = useState("")
  const [savingRound, setSavingRound] = useState<string | null>(null)

  const KO_STAGE_ORDER = ["R32", "R16", "QF", "SF", "3RD", "FINAL"]
  const KO_STAGE_LABELS: Record<string, string> = {
    R32: "16 avos", R16: "Oitavas", QF: "Quartas", SF: "Semifinais", "3RD": "3º Lugar", FINAL: "Final",
  }
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<number>>(new Set())
  const [newOverrideCloseAt, setNewOverrideCloseAt] = useState("")
  const [savingOverride, setSavingOverride] = useState(false)
  const [removingOverride, setRemovingOverride] = useState<number | null>(null)

  const [predStatus, setPredStatus] = useState<PredStatusData | null>(null)
  const [predStatusLoading, setPredStatusLoading] = useState(false)
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null)

  // ── Participantes tab ──────────────────────────────────────
  const [participants, setParticipants] = useState<Participant[]>([])
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState("")
  const [generatedFor, setGeneratedFor] = useState("")
  const [copiedLink, setCopiedLink] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  useEffect(() => {
    loadParticipants()
    loadPredStatus()
    loadDeadlineConfig()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Jogos ─────────────────────────────────────────────────

  async function handleSync() {
    setSyncing(true); setSyncMsg("")
    try {
      const res = await fetch("/api/admin/matches/sync", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        const finished = data.newlyFinished?.length ?? 0
        const parts = [`✓ ${data.synced} jogos verificados`]
        if (data.linked > 0) parts.push(`${data.linked} IDs linkados`)
        parts.push(finished > 0 ? `${finished} encerrado${finished > 1 ? "s" : ""} — pontos atualizados` : "nenhum encerrado novo")
        setSyncMsg(parts.join(" · "))
      } else {
        setSyncMsg(`❌ ${data.error ?? "Erro desconhecido"}`)
      }
    } catch (err) { setSyncMsg(`❌ Erro de rede: ${String(err)}`) }
    setSyncing(false)
  }

  async function handleRecalculate() {
    setScoring(true); setScoreMsg("")
    const res = await fetch("/api/admin/score", { method: "POST" })
    const data = await res.json()
    setScoreMsg(res.ok ? `✓ ${data.matchesProcessed} jogos recalculados` : "Erro ao recalcular")
    setScoring(false)
  }

  async function handleCheckDates() {
    setCheckingDates(true); setDateDiffs(null); setDateFixMsg("")
    try {
      const res = await fetch("/api/admin/matches/fix-dates")
      const data = await res.json()
      if (res.ok) { setDateDiffs(data.diffs); if (data.diffs.length === 0) setDateFixMsg("✓ Todas as datas estão corretas.") }
      else setDateFixMsg(`❌ ${data.error ?? "Erro desconhecido"}`)
    } catch (err) { setDateFixMsg(`❌ Erro de rede: ${String(err)}`) }
    setCheckingDates(false)
  }

  async function handleFixDates() {
    if (!dateDiffs?.length) return
    setFixingDates(true); setDateFixMsg("")
    try {
      const res = await fetch("/api/admin/matches/fix-dates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      const data = await res.json()
      if (res.ok) { setDateFixMsg(`✓ ${data.updated} data${data.updated !== 1 ? "s" : ""} corrigida${data.updated !== 1 ? "s" : ""}.`); setDateDiffs(null) }
      else setDateFixMsg(`❌ ${data.error ?? "Erro desconhecido"}`)
    } catch (err) { setDateFixMsg(`❌ Erro de rede: ${String(err)}`) }
    setFixingDates(false)
  }

  // ── Palpites ──────────────────────────────────────────────

  async function loadDeadlineConfig() {
    setDeadlineLoading(true)
    const res = await fetch("/api/admin/deadline-config")
    if (res.ok) {
      const data = await res.json()
      setDeadlineConfig(data)
      setR1Input(String(data.r1CutoffMinutes))
      setR23Input(String(data.r23CutoffMinutes))
      setKoInputs(Object.fromEntries(Object.entries(data.koCutoffMinutes).map(([k, v]) => [k, String(v)])))
    }
    setDeadlineLoading(false)
  }

  async function saveRoundCutoff(round: string) {
    const groupLabels: Record<string, string> = { r1: "Rodada 1", r23: "Rodadas 2+3" }
    const value = round === "r1" ? r1Input : round === "r23" ? r23Input : (koInputs[round] ?? "")
    const minutes = Number(value)
    if (isNaN(minutes) || value === "") return
    setSavingRound(round); setDeadlineMsg("")
    const res = await fetch("/api/admin/deadline-config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "round", round, minutes }),
    })
    setSavingRound(null)
    const label = groupLabels[round] ?? KO_STAGE_LABELS[round] ?? round
    if (res.ok) { setDeadlineMsg(`✓ ${label} → ${minutes} min.`); loadDeadlineConfig() }
    else setDeadlineMsg("❌ Erro ao salvar.")
  }

  async function saveMatchOverride() {
    if (selectedMatchIds.size === 0 || !newOverrideCloseAt) return
    setSavingOverride(true); setDeadlineMsg("")
    const closeAt = new Date(newOverrideCloseAt).toISOString()
    const results = await Promise.all(
      [...selectedMatchIds].map(matchId =>
        fetch("/api/admin/deadline-config", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "match_override", matchId, closeAt }),
        })
      )
    )
    setSavingOverride(false)
    const failed = results.filter(r => !r.ok).length
    if (failed === 0) {
      setDeadlineMsg(`✓ Prazo salvo para ${selectedMatchIds.size} jogo${selectedMatchIds.size > 1 ? "s" : ""}.`)
      setSelectedMatchIds(new Set()); setNewOverrideCloseAt(""); loadDeadlineConfig()
    } else {
      setDeadlineMsg(`❌ ${failed} jogo(s) falharam ao salvar.`)
    }
  }

  async function removeMatchOverride(matchId: number) {
    setRemovingOverride(matchId); setDeadlineMsg("")
    const res = await fetch("/api/admin/deadline-config", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "remove_override", matchId }),
    })
    setRemovingOverride(null)
    if (res.ok) { setDeadlineMsg("✓ Extensão removida."); loadDeadlineConfig() }
    else setDeadlineMsg("❌ Erro ao remover.")
  }

  async function loadPredStatus(window?: string) {
    setPredStatusLoading(true)
    const url = window ? `/api/admin/predictions-status?window=${window}` : "/api/admin/predictions-status"
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setPredStatus(data)
      if (!window) setSelectedWindow(data.activeWindow ?? null)
    }
    setPredStatusLoading(false)
  }

  function handleWindowSelect(key: string) {
    setSelectedWindow(key)
    loadPredStatus(key)
  }

  // ── Participantes ─────────────────────────────────────────

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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = await res.json()
    if (res.ok) { setGeneratedLink(data.link); setGeneratedFor(newName.trim()); setNewName(""); loadParticipants() }
    setCreating(false)
  }

  async function regenerateToken(id: string, name: string) {
    if (!confirm(`Gerar novo link para "${name}"? O link anterior não funcionará mais.`)) return
    setActionId(id)
    const res = await fetch("/api/admin/participants", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate: true, id }),
    })
    const data = await res.json()
    if (res.ok) { setGeneratedLink(data.link); setGeneratedFor(name) }
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
    await fetch("/api/admin/participants", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, hard: true }) })
    setActionId(null)
    loadParticipants()
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" })
    router.push("/admin")
  }

  // ── Render ────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: "jogos", label: "Jogos" },
    { key: "palpites", label: "Palpites" },
    { key: "participantes", label: "Participantes" },
  ]

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-green-900 text-white px-5 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-800 border border-white/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-green-300" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">Painel Admin</h1>
            <p className="text-green-400/80 text-[11px] mt-1 leading-none">Bolão Copa 2026</p>
          </div>
        </div>
        <Button
          variant="ghost" size="sm" onClick={handleLogout} aria-label="Sair"
          className="text-green-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Tab bar */}
      <div className="border-b bg-background sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 flex gap-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                tab === t.key
                  ? "border-green-700 text-green-700 dark:text-green-400 dark:border-green-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── ABA: JOGOS ── */}
        {tab === "jogos" && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-green-700 dark:text-green-400" /> Resultados &amp; Pontuação
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSync} disabled={syncing} size="sm" className="bg-green-700 hover:bg-green-800 text-white">
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Atualizar Jogos
                  </Button>
                  <Button onClick={handleRecalculate} disabled={scoring} variant="outline" size="sm">
                    {scoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                    Recalcular Pontos
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Atualizar Jogos</strong> busca placares na football-data.org, atualiza jogos ao vivo, encerra os finalizados e pontua automaticamente.{" "}
                  <strong>Recalcular Pontos</strong> refaz a pontuação de todos os jogos encerrados — use após corrigir um placar manualmente.
                </p>
                {syncMsg && <p className="text-xs text-muted-foreground">{syncMsg}</p>}
                {scoreMsg && <p className="text-xs text-muted-foreground">{scoreMsg}</p>}
              </CardContent>
            </Card>

            <MatchResultsEditor />

            <KnockoutTeamAssigner />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-green-700 dark:text-green-400" /> Correção de Datas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Compara os horários dos jogos no banco com a football-data.org e corrige divergências. Nunca altera placares ou palpites.
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
                      <span>Jogo</span><span>Banco → API</span><span>Δ</span>
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
                            <span className="line-through">{fmt(d.db_date)}</span><br />
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
          </>
        )}

        {/* ── ABA: PALPITES ── */}
        {tab === "palpites" && (
          <>
            {/* Palpites Incompletos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" /> Palpites por Fase
                  </span>
                  <button onClick={() => loadPredStatus(selectedWindow ?? undefined)} aria-label="Atualizar" className="text-muted-foreground hover:text-foreground">
                    <RefreshCw className={`w-3.5 h-3.5 ${predStatusLoading ? "animate-spin" : ""}`} />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Phase selector */}
                {predStatus?.availableWindows && predStatus.availableWindows.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {predStatus.availableWindows.map(w => (
                      <button
                        key={w.key}
                        onClick={() => handleWindowSelect(w.key)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          selectedWindow === w.key
                            ? "bg-green-700 text-white border-green-700"
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                )}

                {predStatusLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : !predStatus || predStatus.statuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma fase disponível.</p>
                ) : (
                  <>
                    <div className="px-1 space-y-0.5">
                      {predStatus.windowLabel && (
                        <p className="text-xs font-medium text-muted-foreground">
                          Fase: <span className="text-foreground font-semibold">{predStatus.windowLabel}</span>
                        </p>
                      )}
                      {predStatus.windowDeadline && (
                        <p className="text-xs text-muted-foreground">
                          Fecha em: {new Date(predStatus.windowDeadline).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Jogos na janela: <strong>{predStatus.statuses[0]?.total ?? 0}</strong>
                        {" · "}
                        Completos: <strong className="text-green-600">{predStatus.statuses.filter(s => s.complete).length}</strong>
                        {" · "}
                        Incompletos: <strong className="text-orange-500">{predStatus.statuses.filter(s => !s.complete).length}</strong>
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

            {/* Prazo de Palpites */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><Timer className="w-4 h-4 text-green-700 dark:text-green-400" /> Prazo de Palpites</span>
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
                      <p className="text-xs font-medium text-muted-foreground">Fechar palpites X min antes do 1º jogo</p>
                      <div className="flex flex-col gap-2">
                        {/* Fase de grupos */}
                        {[
                          { key: "r1", label: "Rodada 1", value: r1Input, onChange: setR1Input },
                          { key: "r23", label: "Rodadas 2 e 3", value: r23Input, onChange: setR23Input },
                        ].map(({ key, label, value, onChange }) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs w-28 shrink-0 text-muted-foreground">{label}</span>
                            <Input type="number" className="h-8 w-20 text-sm" value={value} onChange={e => onChange(e.target.value)} />
                            <span className="text-xs text-muted-foreground">min</span>
                            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={savingRound === key} onClick={() => saveRoundCutoff(key)}>
                              {savingRound === key ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                            </Button>
                          </div>
                        ))}
                        {/* Mata-mata por estágio */}
                        {KO_STAGE_ORDER.map(stage => (
                          <div key={stage} className="flex items-center gap-2">
                            <span className="text-xs w-28 shrink-0 text-muted-foreground">{KO_STAGE_LABELS[stage]}</span>
                            <Input
                              type="number"
                              className="h-8 w-20 text-sm"
                              value={koInputs[stage] ?? ""}
                              onChange={e => setKoInputs(prev => ({ ...prev, [stage]: e.target.value }))}
                            />
                            <span className="text-xs text-muted-foreground">min</span>
                            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={savingRound === stage} onClick={() => saveRoundCutoff(stage)}>
                              {savingRound === stage ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Valores negativos mantêm aberto após o início (ex: -30 = fecha 30 min depois do 1º jogo).</p>
                    </div>

                    {/* Existing match overrides */}
                    {deadlineConfig && deadlineConfig.matchOverrides.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Prazos específicos ativos</p>
                        <div className="divide-y rounded border overflow-hidden text-xs">
                          {deadlineConfig.matchOverrides.map(o => (
                            <div key={o.match_id} className="flex items-center justify-between px-3 py-2 gap-2 bg-card">
                              <div>
                                <span className="font-medium">{o.match?.home_team?.fifa_code ?? "?"} × {o.match?.away_team?.fifa_code ?? "?"}</span>
                                {o.match?.group_letter
                                  ? <span className="text-muted-foreground ml-1.5">Grupo {o.match.group_letter}</span>
                                  : o.match?.koStageLabel
                                    ? <span className="text-muted-foreground ml-1.5">{o.match.koStageLabel}</span>
                                    : null}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-muted-foreground">
                                  até {new Date(o.close_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                                </span>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  disabled={removingOverride === o.match_id} onClick={() => removeMatchOverride(o.match_id)}>
                                  {removingOverride === o.match_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add new match override — multi-select */}
                    {deadlineConfig && (deadlineConfig.availableGroupMatches.length > 0 || deadlineConfig.availableKoMatches.length > 0) && (() => {
                      const groupMatches = [...deadlineConfig.availableGroupMatches].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                      const koMatches = [...deadlineConfig.availableKoMatches]
                      const allAvailable = [...groupMatches, ...koMatches]

                      const byRound: Record<1 | 2 | 3, typeof groupMatches> = { 1: [], 2: [], 3: [] }
                      groupMatches.forEach(m => { const r = (m.round ?? 1) as 1 | 2 | 3; byRound[r].push(m) })

                      const KO_STAGE_LABELS: Record<string, string> = { R32: "16 avos", R16: "Oitavas", QF: "Quartas", SF: "Semifinais", "3RD": "3º Lugar", FINAL: "Final" }
                      const KO_STAGE_ORDER = ["R32", "R16", "QF", "SF", "3RD", "FINAL"]
                      const koByStage = new Map<string, typeof koMatches>()
                      koMatches.forEach(m => { const s = m.koStage ?? ""; if (!koByStage.has(s)) koByStage.set(s, []); koByStage.get(s)!.push(m) })
                      const koStages = KO_STAGE_ORDER.filter(s => koByStage.has(s))

                      const idsForRound = (r: 1 | 2 | 3) => new Set(byRound[r].map(m => m.id))
                      const allInRound = (r: 1 | 2 | 3) => byRound[r].length > 0 && byRound[r].every(m => selectedMatchIds.has(m.id))
                      const idsForKoStage = (s: string) => new Set((koByStage.get(s) ?? []).map(m => m.id))
                      const allInKoStage = (s: string) => { const ids = idsForKoStage(s); return ids.size > 0 && [...ids].every(id => selectedMatchIds.has(id)) }

                      function toggleGroup(ids: Set<number>, allSelected: boolean) {
                        setSelectedMatchIds(prev => {
                          const next = new Set(prev)
                          if (allSelected) ids.forEach(id => next.delete(id))
                          else ids.forEach(id => next.add(id))
                          return next
                        })
                      }

                      function toggleMatch(id: number) {
                        setSelectedMatchIds(prev => {
                          const next = new Set(prev)
                          next.has(id) ? next.delete(id) : next.add(id)
                          return next
                        })
                      }

                      return (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Adicionar prazo por jogo</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {([1, 2, 3] as const).filter(r => byRound[r].length > 0).map(r => (
                              <button key={`r${r}`} onClick={() => toggleGroup(idsForRound(r), allInRound(r))}
                                className={`text-xs px-2 py-1 rounded border transition-colors ${allInRound(r) ? "bg-green-700 text-white border-green-700" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
                                R{r} ({byRound[r].length})
                              </button>
                            ))}
                            {koStages.map(s => (
                              <button key={s} onClick={() => toggleGroup(idsForKoStage(s), allInKoStage(s))}
                                className={`text-xs px-2 py-1 rounded border transition-colors ${allInKoStage(s) ? "bg-green-700 text-white border-green-700" : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
                                {KO_STAGE_LABELS[s] ?? s} ({(koByStage.get(s) ?? []).length})
                              </button>
                            ))}
                            {selectedMatchIds.size > 0 && (
                              <button onClick={() => setSelectedMatchIds(new Set())}
                                className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted ml-auto">
                                Limpar
                              </button>
                            )}
                          </div>
                          <div className="rounded border divide-y max-h-48 overflow-y-auto text-xs">
                            {allAvailable.map(m => (
                              <label key={m.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50">
                                <input type="checkbox" checked={selectedMatchIds.has(m.id)} onChange={() => toggleMatch(m.id)} className="rounded" />
                                <span className="font-medium">{m.home_team?.fifa_code ?? "?"} × {m.away_team?.fifa_code ?? "?"}</span>
                                {m.group_letter
                                  ? <span className="text-muted-foreground">Grupo {m.group_letter}</span>
                                  : <span className="text-muted-foreground">{m.koStageLabel ?? m.koStage}</span>}
                                <span className="text-muted-foreground ml-auto">{new Date(m.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                              </label>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input type="datetime-local" className="h-8 text-xs flex-1" value={newOverrideCloseAt} onChange={e => setNewOverrideCloseAt(e.target.value)} />
                            <Button size="sm" className="h-8 text-xs bg-green-700 hover:bg-green-800 text-white shrink-0"
                              disabled={savingOverride || selectedMatchIds.size === 0 || !newOverrideCloseAt} onClick={saveMatchOverride}>
                              {savingOverride ? <Loader2 className="w-3 h-3 animate-spin" /> : `Salvar${selectedMatchIds.size > 0 ? ` (${selectedMatchIds.size})` : ""}`}
                            </Button>
                          </div>
                        </div>
                      )
                    })()}

                    {deadlineMsg && <p className="text-xs text-muted-foreground">{deadlineMsg}</p>}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── ABA: PARTICIPANTES ── */}
        {tab === "participantes" && (
          <>
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-700 dark:text-green-400" /> Adicionar Participante
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <label htmlFor="new-participant-name" className="sr-only">Nome do participante</label>
                  <Input id="new-participant-name" name="participant-name" autoComplete="off" placeholder="Nome do participante"
                    value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && createParticipant()} />
                  <Button onClick={createParticipant} disabled={creating || !newName.trim()}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-700 dark:text-green-400" /> Participantes ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                            aria-label={`Gerar novo link para ${p.name}`} onClick={() => regenerateToken(p.id, p.name)} disabled={actionId === p.id}>
                            {actionId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            aria-label={`Excluir ${p.name}`} onClick={() => hardDeleteParticipant(p.id, p.name)} disabled={actionId === p.id}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

      </div>
    </main>
  )
}
