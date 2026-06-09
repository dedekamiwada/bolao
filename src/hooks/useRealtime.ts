"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function useRealtime<T>(
  table: string,
  initialData: T[],
  onUpdate?: () => void
): T[] {
  const [data, setData] = useState<T[]>(initialData)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(initialData)
  }, [initialData]) // sync when server re-fetches

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`realtime-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        onUpdate?.()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, onUpdate])

  return data
}
