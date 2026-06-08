"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, RefreshCw, Copy, Check, LogOut, Loader2, Plus } from "lucide-react"

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
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState("")
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadParticipants()
  }, [])

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
      setNewName("")
      loadParticipants()
    }
    setCreating(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMsg("")
    const res = await fetch("/api/admin/matches/sync", { method: "POST" })
    const data = await res.json()
    setSyncing(false)
    setSyncMsg(res.ok ? `✓ ${data.synced} jogos sincronizados` : "Erro ao sincronizar")
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
        {/* Sincronização */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Sincronizar Resultados
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center gap-3">
            <Button onClick={handleSync} disabled={syncing} variant="outline" size="sm">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Sincronizar Agora
            </Button>
            {syncMsg && <span className="text-sm text-muted-foreground">{syncMsg}</span>}
          </CardContent>
        </Card>

        {/* Criar participante */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Adicionar Participante
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
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
            {generatedLink && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 rounded-lg p-3 space-y-2">
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">✓ Link gerado — envie para o participante:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background border rounded px-2 py-1 flex-1 truncate">{generatedLink}</code>
                  <Button size="sm" variant="outline" onClick={copyLink}>
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">⚠️ Este link aparece apenas uma vez.</p>
              </div>
            )}
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
              <div className="space-y-1">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm font-medium">{p.name}</span>
                    <Badge variant={p.is_active ? "success" : "secondary"}>
                      {p.is_active ? "Ativo" : "Inativo"}
                    </Badge>
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
