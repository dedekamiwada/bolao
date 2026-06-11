import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { recalculateMatchScores, updateRankingSnapshots } from "@/lib/scoring/calculate"
import { createAdminClient } from "@/lib/supabase/admin"

// Recalcular todos os jogos faz centenas de chamadas sequenciais ao Supabase;
// o timeout padrão do Vercel (10s) não basta
export const maxDuration = 60

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
    total += await recalculateMatchScores(m.id, { updateRanking: false })
  }

  if ((finishedMatches?.length ?? 0) > 0) {
    await updateRankingSnapshots(supabase)
  }

  return NextResponse.json({ ok: true, matchesProcessed: finishedMatches?.length ?? 0, predictionsScored: total })
}
