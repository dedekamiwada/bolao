"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Users, RefreshCw, Copy, Check, LogOut, Loader2, Plus, Trash2,
  Calculator, RotateCcw, AlertCircle, CheckCircle2, CalendarClock, Shield,
} from "lucide-react"
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

interface PredStatus { id: string; name: string; done: number; total: number; complete: boolean; missing: number }

function StatusMsg({ msg }: { msg: string }) {
  if (!msg) return null
  const isError = msg.startsWith("❌") || msg === "Erro ao recalcular"
  const isWarning = msg.startsWith("⚠️")
  const clean = msg.replace(/^[✓❌⚠️]\s*/, "")
  return (
    <div className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 ${
      isError
        ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
        : isWarning
        ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
        : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
    }`}>
      {isError
        ? <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        : <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
      <span>{clean}</span>
    </div>
  )
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

  const [predStatus, setPredStatus] = useState<{ windowLabel: string; windowDeadline: string | null; statuses: PredStatus[] } | null>(null)
  const [predStatusLoading, setPredStatusLoading] = useState(false)

  useEffect(() => { loadParticipants(); loadPredStatus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    <main className="min-h-screen bg-muted/30">

      <header className="bg-gradient-to-r from-green-900 to-green-800 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 rounded-lg p-2">
            <Shield className="w-4 h-4 text-green-200" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Painel Admin</h1>
            <p className="text-green-300 text-xs">Bolão Copa 2026</p>
          </div>
        </div>
        <Button
          variant="ghost" size="sm" onClick={handleLogout}
          aria-label="Sair"
          className="text-green-300 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Sincronização e Pontuação */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2.5">
              <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 p-1.5 rounded-md">
                <RefreshCw className="w-3.5 h-3.5" />
              </span>
              Resultados &amp; Pontuação
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSync} disabled={syncing} size="sm" className="bg-green-700 hover:bg-green-800 text-white cursor-pointer">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Atualizar Jogos
              </Button>
              <Button onClick={handleRecalculate} disabled={scoring} variant="outline" size="sm" className="cursor-pointer">
                {scoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                Recalcular Pontos
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Atualizar Jogos</strong> busca os placares oficiais na football-data.org,
              atualiza jogos ao vivo, encerra os finalizados e já pontua participantes e ranking.{" "}
              <strong>Recalcular Pontos</strong> refaz a pontuação de todos os jogos encerrados — use após corrigir um placar manualmente.
            </p>
            {syncMsg && <StatusMsg msg={syncMsg} />}
            {scoreMsg && <StatusMsg msg={scoreMsg} />}
          </CardContent>
        </Card>

        {/* Edição manual de resultados */}
        <MatchResultsEditor />

        {/* Correção de Datas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2.5">
              <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 p-1.5 rounded-md">
                <CalendarClock className="w-3.5 h-3.5" />
              </span>
              Correção de Datas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <p className="text-xs text-muted-foreground">
              Compara os horários dos jogos no banco com a football-data.org e corrige divergências.
              Nunca altera placares ou palpites.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCheckDates} disabled={checkingDates || fixingDates} size="sm" variant="outline" className="cursor-pointer">
                {checkingDates ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarClock className="w-4 h-4 mr-2" />}
                Verificar Datas
              </Button>
              {dateDiffs && dateDiffs.length > 0 && (
                <Button onClick={handleFixDates} disabled={fixingDates} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
                  {fixingDates ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Corrigir {dateDiffs.length} jogo{dateDiffs.length !== 1 ? "s" : ""}
                </Button>
              )}
            </div>

            {dateDiffs && dateDiffs.length > 0 && (
              <div className="rounded-md border overflow-hidden text-xs">
                <div className="grid grid-cols-[1fr_1fr_auto] bg-muted px-3 py-2 font-medium text-muted-foreground gap-2 text-[11px] uppercase tracking-wide">
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
                    <div key={d.match_id} className="grid grid-cols-[1fr_1fr_auto] px-3 py-2.5 gap-2 border-t items-start hover:bg-muted/40 transition-colors">
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

            {dateFixMsg && <StatusMsg msg={dateFixMsg} />}
          </CardContent>
        </Card>

        {/* Palpites incompletos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between gap-2">
              <span className="flex items-center gap-2.5">
                <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 p-1.5 rounded-md">
                  <AlertCircle className="w-3.5 h-3.5" />
                </span>
                Palpites Incompletos
              </span>
              <button
                onClick={loadPredStatus}
                aria-label="Atualizar palpites"
                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
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
                <div className="mb-3 px-2.5 py-2 bg-muted/40 rounded-md space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Próximo fechamento: <span className="text-foreground font-semibold">{predStatus.windowLabel}</span>
                  </p>
                  {predStatus.windowDeadline && (
                    <p className="text-xs text-muted-foreground">
                      Fecha em: {new Date(predStatus.windowDeadline).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Total de jogos: <strong>{predStatus.statuses[0]?.total ?? 0}</strong>
                  </p>
                </div>
                <div className="divide-y">
                  {predStatus.statuses.map(p => (
                    <div key={p.id} className="flex items-center py-2.5 gap-3">
                      <div className="shrink-0">
                        {p.complete
                          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : <AlertCircle className="w-4 h-4 text-orange-400" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="text-sm font-medium block truncate">{p.name}</span>
                        {!p.complete && (
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all duration-300"
                              style={{ width: `${Math.round((p.done / p.total) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {p.complete ? (
                          <Badge variant="success" className="text-xs">Completo</Badge>
                        ) : (
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold tabular-nums">
                            {p.done}/{p.total}
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

        {/* Link gerado */}
        {generatedLink && (
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-4 pb-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Link de <strong>{generatedFor}</strong> — envie agora
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted border rounded-md px-2.5 py-1.5 flex-1 truncate">{generatedLink}</code>
                <Button size="sm" variant="outline" onClick={() => copyLink()} className="shrink-0 cursor-pointer">
                  {copiedLink === generatedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Guarde agora — o token não é armazenado.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Criar participante */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2.5">
              <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 p-1.5 rounded-md">
                <Plus className="w-3.5 h-3.5" />
              </span>
              Adicionar Participante
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
              <Button onClick={createParticipant} disabled={creating || !newName.trim()} className="cursor-pointer">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de participantes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2.5">
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 p-1.5 rounded-md">
                <Users className="w-3.5 h-3.5" />
              </span>
              Participantes
              <span className="ml-auto text-xs font-normal text-muted-foreground">{participants.length} no total</span>
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
                  <div key={p.id} className="flex items-center justify-between py-2.5 px-1.5 -mx-1.5 rounded-md hover:bg-muted/50 transition-colors gap-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${p.is_active ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className={`text-[10px] font-medium ${p.is_active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                          {p.is_active ? "Ativo" : "Inativo"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors"
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
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
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
