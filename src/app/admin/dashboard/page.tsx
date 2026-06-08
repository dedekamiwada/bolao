"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, RefreshCw, Copy, Check, LogOut, Loader2, Plus, Trash2, Calculator, Link2, RotateCcw } from "lucide-react"

interface Participant {
  id: string
  name: string
  created_at: string
  is_active: boolean
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

  useEffect(() => { loadParticipants() }, [])

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
    const res = await fetch("/api/admin/matches/sync", { method: "POST" })
    const data = await res.json()
    setSyncing(false)
    setSyncMsg(res.ok ? `✓ ${data.synced} jogos sincronizados` : "Erro ao sincronizar")
  }

  async function handleRecalculate() {
    setScoring(true)
    setScoreMsg("")
    const res = await fetch("/api/admin/score", { method: "POST" })
    const data = await res.json()
    setScoring(false)
    setScoreMsg(res.ok ? `✓ ${data.matchesProcessed} jogos recalculados` : "Erro ao recalcular")
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
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-green-300 hover:text-white hover:bg-green-800">
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
              <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sincronizar
              </Button>
              <Button onClick={handleRecalculate} disabled={scoring} variant="outline" size="sm">
                {scoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                Recalcular Pontos
              </Button>
            </div>
            {syncMsg && <p className="text-xs text-muted-foreground">{syncMsg}</p>}
            {scoreMsg && <p className="text-xs text-muted-foreground">{scoreMsg}</p>}
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
              <Input
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
                      {/* Novo link (regenerar token) */}
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                        title="Gerar novo link"
                        onClick={() => regenerateToken(p.id, p.name)}
                        disabled={actionId === p.id}
                      >
                        {actionId === p.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <RotateCcw className="w-3.5 h-3.5" />}
                      </Button>
                      {/* Excluir definitivamente */}
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Excluir definitivamente"
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
