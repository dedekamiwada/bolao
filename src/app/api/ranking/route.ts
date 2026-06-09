import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  // Get today's ranking from snapshots
  const [{ data: snapshots }, { data: knockoutRows }] = await Promise.all([
    supabase
      .from("ranking_snapshots")
      .select("participant_id, total_points, exact_scores, correct_results, rank_position, snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(200),
    supabase
      .from("match_scores")
      .select("participant_id, total_points, matches!inner(stage)")
      .neq("matches.stage", "GROUP"),
  ])

  if (!snapshots) return NextResponse.json({ ranking: [] })

  // Keep only latest snapshot per participant
  const latestByParticipant = new Map<string, typeof snapshots[0]>()
  for (const s of snapshots) {
    if (!latestByParticipant.has(s.participant_id)) {
      latestByParticipant.set(s.participant_id, s)
    }
  }

  // Aggregate knockout points per participant (tiebreaker #2)
  const knockoutByPid = new Map<string, number>()
  for (const row of (knockoutRows ?? []) as { participant_id: string; total_points: number }[]) {
    knockoutByPid.set(row.participant_id, (knockoutByPid.get(row.participant_id) ?? 0) + row.total_points)
  }

  const ranking = [...latestByParticipant.values()]
    .sort((a, b) =>
      b.total_points - a.total_points ||
      b.exact_scores - a.exact_scores ||
      (knockoutByPid.get(b.participant_id) ?? 0) - (knockoutByPid.get(a.participant_id) ?? 0)
    )
    .map((s, idx) => ({
      ...s,
      rank_position: idx + 1,
      knockout_points: knockoutByPid.get(s.participant_id) ?? 0,
    }))

  return NextResponse.json({ ranking }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  })
}
