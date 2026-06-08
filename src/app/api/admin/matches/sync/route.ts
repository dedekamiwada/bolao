import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { syncMatches } from "@/lib/football-data/sync"

export async function POST() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const result = await syncMatches()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
