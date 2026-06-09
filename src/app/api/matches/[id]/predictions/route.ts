import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const matchId = parseInt(id)
  if (isNaN(matchId)) return NextResponse.json({ error: "Invalid match id" }, { status: 400 })

  const supabase = createAdminClient()

  const [{ data: match }, { data: predictions }, { data: scores }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, stage, group_letter, match_number, scheduled_at, status, home_score, away_score, home_team:teams!matches_home_team_id_fkey(id, fifa_code, name), away_team:teams!matches_away_team_id_fkey(id, fifa_code, name)")
      .eq("id", matchId)
      .single(),
    supabase
      .from("group_predictions")
      .select("participant_id, home_score, away_score, participants(name)")
      .eq("match_id", matchId),
    supabase
      .from("match_scores")
      .select("participant_id, total_points, points_exact_score, points_result, points_goal_diff")
      .eq("match_id", matchId),
  ])

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 })

  const scoresMap = new Map((scores ?? []).map(s => [s.participant_id, s]))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (predictions ?? []).map((p: any) => {
    const score = scoresMap.get(p.participant_id)
    return {
      participant_id: p.participant_id,
      name: p.participants?.name ?? p.participant_id,
      home_score: p.home_score,
      away_score: p.away_score,
      total_points: score?.total_points ?? null,
    }
  }).sort((a: { total_points: number | null }, b: { total_points: number | null }) => {
    if (a.total_points === null && b.total_points === null) return 0
    if (a.total_points === null) return 1
    if (b.total_points === null) return -1
    return b.total_points - a.total_points
  })

  return NextResponse.json({ match, predictions: result }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  })
}
