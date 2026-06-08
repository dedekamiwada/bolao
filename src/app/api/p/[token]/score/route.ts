import { NextRequest, NextResponse } from "next/server"
import { validateParticipant } from "@/lib/participant-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { participant, error } = await validateParticipant(token)
  if (error) return error

  const supabase = createAdminClient()

  const { data: scores } = await supabase
    .from("match_scores")
    .select(`
      match_id,
      points_exact_score,
      points_result,
      points_goal_diff,
      points_classification,
      total_points,
      calculated_at,
      matches(id, stage, scheduled_at, home_score, away_score,
        home_team:teams!matches_home_team_id_fkey(id, fifa_code, name),
        away_team:teams!matches_away_team_id_fkey(id, fifa_code, name)
      )
    `)
    .eq("participant_id", participant!.id)
    .order("calculated_at", { ascending: false })

  const totalPoints = scores?.reduce((sum, s) => sum + s.total_points, 0) ?? 0
  const exactScores = scores?.filter((s) => s.points_exact_score > 0).length ?? 0
  const correctResults = scores?.filter((s) => s.points_result > 0 || s.points_exact_score > 0).length ?? 0

  return NextResponse.json({
    participant: { id: participant!.id, name: participant!.name },
    summary: { totalPoints, exactScores, correctResults },
    scores: scores ?? [],
  })
}
