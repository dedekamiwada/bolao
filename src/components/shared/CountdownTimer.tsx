"use client"

import { useEffect, useState } from "react"

interface CountdownTimerProps {
  targetDate: string
  cutoffMinutes?: number
  onExpire?: () => void
}

function formatTime(ms: number) {
  if (ms <= 0) return "Encerrado"
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`
  return `${s}s`
}

export function CountdownTimer({ targetDate, cutoffMinutes = 15, onExpire }: CountdownTimerProps) {
  const lockTime = new Date(targetDate).getTime() - cutoffMinutes * 60 * 1000
  const [remaining, setRemaining] = useState(lockTime - Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = lockTime - Date.now()
      setRemaining(diff)
      if (diff <= 0) {
        clearInterval(interval)
        onExpire?.()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockTime, onExpire])

  const isUrgent = remaining > 0 && remaining < 30 * 60 * 1000 // < 30min

  if (remaining <= 0) {
    return <span className="text-xs text-muted-foreground">Palpites encerrados</span>
  }

  return (
    <span className={`text-xs font-mono tabular-nums ${isUrgent ? "text-orange-500 font-semibold" : "text-muted-foreground"}`}>
      Fecha em {formatTime(remaining)}
    </span>
  )
}
