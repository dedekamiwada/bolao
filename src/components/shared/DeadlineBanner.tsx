"use client"

import { useEffect, useState } from "react"
import { Clock, AlertTriangle } from "lucide-react"

interface Props {
  deadlineAt: string   // ISO string — the actual lock time (already subtracted 15 min)
  label: string        // e.g. "Rodadas 2 e 3 da Fase de Grupos"
}

function formatTime(ms: number) {
  if (ms <= 0) return "Encerrado"
  const totalSeconds = Math.floor(ms / 1000)
  const d = Math.floor(totalSeconds / 86400)
  const h = Math.floor((totalSeconds % 86400) / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`
  return `${s}s`
}

export function DeadlineBanner({ deadlineAt, label }: Props) {
  const lockTime = new Date(deadlineAt).getTime()
  const [remaining, setRemaining] = useState(() => lockTime - Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = lockTime - Date.now()
      setRemaining(diff)
      if (diff <= 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [lockTime])

  if (remaining <= 0) return null

  const isUrgent = remaining < 30 * 60 * 1000  // < 30 min

  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
      isUrgent
        ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
        : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
    }`}>
      {isUrgent
        ? <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
        : <Clock className="w-5 h-5 text-amber-500 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium ${isUrgent ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
          Palpites fecham em
        </div>
        <div className={`text-xs text-muted-foreground truncate`}>{label}</div>
      </div>
      <div className={`font-mono font-bold text-base tabular-nums shrink-0 ${
        isUrgent ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
      }`}>
        {formatTime(remaining)}
      </div>
    </div>
  )
}
