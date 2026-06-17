"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Check } from "lucide-react"

interface ShareCardProps {
  name: string
  rank: number | null
  points: number
  exactScores: number
}

export function ShareCard({ name, rank, points, exactScores }: ShareCardProps) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const text = [
      "⚽ Bolão Copa 2026",
      `${name}${rank ? ` • ${rank}º lugar` : ""}`,
      `${points} pontos | ${exactScores} placares exatos`,
    ].join("\n")

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available (e.g. http)
    }
  }

  return (
    <Button variant="outline" size="sm" className="flex-1" onClick={handleShare}>
      {copied
        ? <><Check className="w-4 h-4 mr-1.5 text-green-600" />Copiado!</>
        : <><Share2 className="w-4 h-4 mr-1.5" />Compartilhar</>
      }
    </Button>
  )
}
