import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  // Get today's ranking from snapshots
  const { data: snapshots } = await supabase
    .from("ranking_snapshots")
    .select("participant_id, total_points, exact_scores, correct_results, rank_position, snapshot_date")
    .order("snapshot_date", { ascending: false })
    .limit(200) // At most 50 participants × buffer

  if (!snapshots) return NextResponse.json({ ranking: [] })

  // Keep only latest snapshot per participant
  const latestByParticipant = new Map<string, typeof snapshots[0]>()
  for (const s of snapshots) {
    if (!latestByParticipant.has(s.participant_id)) {
      latestByParticipant.set(s.participant_id, s)
    }
  }

  // Get participant names (via admin client — no public access to participants table)
  // We use the public match_scores aggregation instead to avoid exposing participants
  // Names are fetched via a join using service role in the admin endpoint
  // For the public ranking, we expose only what's needed

  const ranking = [...latestByParticipant.values()]
    .sort((a, b) => b.total_points - a.total_points || b.exact_scores - a.exact_scores)
    .map((s, idx) => ({
      ...s,
      rank_position: idx + 1,
    }))

  return NextResponse.json({ ranking }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  })
}
