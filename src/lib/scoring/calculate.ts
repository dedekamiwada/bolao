import { createAdminClient } from "@/lib/supabase/admin"
import { scoreGroupMatch } from "./group"
import { scoreKnockoutMatch } from "./knockout"
import type { Stage } from "@/types/domain"

export async function recalculateMatchScores(matchId: number) {
  const supabase = createAdminClient()

  // Get match details
  const { data: match } = await supabase
    .from("matches")
    .select("id, stage, home_score, away_score, winner_team_id, result_confirmed_at")
    .eq("id", matchId)
    .single()

  if (!match || match.home_score === null || match.away_score === null) return 0

  // Get all participants
  const { data: participants } = await supabase
    .from("participants")
    .select("id")
    .eq("is_active", true)

  if (!participants?.length) return 0

  const isGroup = match.stage === "GROUP"
  let processed = 0

  for (const { id: participantId } of participants) {
    let points = { exact: 0, result: 0, goalDiff: 0, total: 0 }

    if (isGroup) {
      const { data: pred } = await supabase
        .from("group_predictions")
        .select("home_score, away_score")
        .eq("participant_id", participantId)
        .eq("match_id", matchId)
        .single()

      if (pred) {
        const breakdown = scoreGroupMatch(
          { home: pred.home_score, away: pred.away_score },
          { home: match.home_score, away: match.away_score }
        )
        points = { exact: breakdown.exactScore, result: breakdown.result, goalDiff: breakdown.goalDiff, total: breakdown.total }
      }
    } else {
      const { data: pred } = await supabase
        .from("knockout_predictions")
        .select("home_score, away_score, winner_team_id")
        .eq("participant_id", participantId)
        .eq("match_id", matchId)
        .single()

      if (pred && pred.winner_team_id && match.winner_team_id) {
        const breakdown = scoreKnockoutMatch(
          match.stage as Stage,
          { home: pred.home_score ?? 0, away: pred.away_score ?? 0, winnerId: pred.winner_team_id },
          { home: match.home_score, away: match.away_score, winnerId: match.winner_team_id }
        )
        points = { exact: breakdown.exactScore, result: breakdown.correctWinner, goalDiff: 0, total: breakdown.total }
      }
    }

    // Upsert match score
    await supabase.from("match_scores").upsert({
      participant_id: participantId,
      match_id: matchId,
      points_exact_score: points.exact,
      points_result: points.result,
      points_goal_diff: points.goalDiff,
      points_classification: 0,
      total_points: points.total,
      calculated_at: new Date().toISOString(),
    }, { onConflict: "participant_id,match_id" })

    processed++
  }

  // Update ranking snapshots
  await updateRankingSnapshots(supabase)
  return processed
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateRankingSnapshots(supabase: any) {
  const today = new Date().toISOString().split("T")[0]

  const { data: totals } = await supabase
    .from("match_scores")
    .select("participant_id, total_points, points_exact_score")

  if (!totals?.length) return

  // Aggregate per participant
  const agg = new Map<string, { total: number; exact: number; correct: number }>()
  for (const row of totals) {
    const cur = agg.get(row.participant_id) ?? { total: 0, exact: 0, correct: 0 }
    cur.total += row.total_points
    cur.exact += row.points_exact_score > 0 ? 1 : 0
    cur.correct += row.total_points > 0 ? 1 : 0
    agg.set(row.participant_id, cur)
  }

  const sorted = [...agg.entries()].sort((a, b) => b[1].total - a[1].total)

  const upserts = sorted.map(([pid, data], idx) => ({
    participant_id: pid,
    snapshot_date: today,
    total_points: data.total,
    exact_scores: data.exact,
    correct_results: data.correct,
    rank_position: idx + 1,
  }))

  await supabase.from("ranking_snapshots").upsert(upserts, { onConflict: "participant_id,snapshot_date" })
}
