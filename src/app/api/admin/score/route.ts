import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { recalculateMatchScores } from "@/lib/scoring/calculate"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/admin/score?matchId=X  — recalculate for one match
// POST /api/admin/score             — recalculate ALL finished matches
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const matchIdParam = searchParams.get("matchId")

  if (matchIdParam) {
    const count = await recalculateMatchScores(parseInt(matchIdParam))
    return NextResponse.json({ ok: true, processed: count })
  }

  // Recalculate all finished matches
  const supabase = createAdminClient()
  const { data: finishedMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "FINISHED")
    .not("result_confirmed_at", "is", null)

  let total = 0
  for (const m of finishedMatches ?? []) {
    total += await recalculateMatchScores(m.id)
  }

  return NextResponse.json({ ok: true, matchesProcessed: finishedMatches?.length ?? 0, predictionsScored: total })
}
