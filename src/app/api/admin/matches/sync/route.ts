import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { syncMatches } from "@/lib/football-data/sync"

// Full sync atualiza ~104 jogos um a um; precisa de mais que os 10s padrão
export const maxDuration = 60

export async function POST() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    // fullSync=true: busca todos os jogos (inclusive SCHEDULED) para linkar external_ids
    const result = await syncMatches(true)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[sync-matches]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
