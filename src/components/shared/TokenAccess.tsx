"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LogIn, Loader2 } from "lucide-react"

export function TokenAccess() {
  const router = useRouter()
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleAccess() {
    const t = token.trim()
    if (!t) return
    setLoading(true)
    setError("")

    const res = await fetch(`/api/p/${t}`)
    if (res.ok) {
      router.push(`/p/${t}`)
    } else {
      setError("Link inválido ou expirado.")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground text-center">
        Já tem um link? Cole seu token para acessar seus palpites:
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="Cole seu token aqui..."
          value={token}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAccess()}
          className="text-sm"
        />
        <Button
          onClick={handleAccess}
          disabled={loading || !token.trim()}
          size="sm"
          className="shrink-0 bg-green-700 hover:bg-green-800 text-white"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <LogIn className="w-4 h-4" />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  )
}
