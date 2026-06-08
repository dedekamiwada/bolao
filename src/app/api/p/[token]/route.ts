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

  // Get counts for status indicators
  const [groupCount, knockoutCount] = await Promise.all([
    supabase
      .from("group_predictions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", participant!.id),
    supabase
      .from("knockout_predictions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", participant!.id),
  ])

  // Get current ranking
  const { data: snapshot } = await supabase
    .from("ranking_snapshots")
    .select("total_points, rank_position")
    .eq("participant_id", participant!.id)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({
    participant: {
      id: participant!.id,
      name: participant!.name,
    },
    stats: {
      groupPredictionsCount: groupCount.count ?? 0,
      knockoutPredictionsCount: knockoutCount.count ?? 0,
      totalPoints: snapshot?.total_points ?? 0,
      rankPosition: snapshot?.rank_position ?? null,
    },
  })
}
