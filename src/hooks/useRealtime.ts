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
    setData(initialData)
  }, [initialData])

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
