import { createAdminClient } from "@/lib/supabase/admin"
import { scoreGroupMatch } from "./group"
import { scoreKnockoutMatch } from "./knockout"
import type { Stage } from "@/types/domain"

// Recalculates points for a single match. Does NOT update ranking snapshots —
// call updateRankingSnapshots() once after processing a batch of matches.
export async function recalculateMatchScores(matchId: number, opts?: { updateRanking?: boolean }) {
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

  // Fetch all predictions for this match in one query instead of one per participant
  const predByParticipant = new Map<string, { home_score: number; away_score: number; winner_team_id?: number | null }>()
  if (isGroup) {
    const { data: preds } = await supabase
      .from("group_predictions")
      .select("participant_id, home_score, away_score")
      .eq("match_id", matchId)
    for (const p of preds ?? []) predByParticipant.set(p.participant_id, p)
  } else {
    const { data: preds } = await supabase
      .from("knockout_predictions")
      .select("participant_id, home_score, away_score, winner_team_id")
      .eq("match_id", matchId)
    for (const p of preds ?? []) predByParticipant.set(p.participant_id, p)
  }

  const calculatedAt = new Date().toISOString()
  const upserts = participants.map(({ id: participantId }) => {
    let points = { exact: 0, result: 0, goalDiff: 0, total: 0 }
    const pred = predByParticipant.get(participantId)

    if (isGroup) {
      if (pred) {
        const breakdown = scoreGroupMatch(
          { home: pred.home_score, away: pred.away_score },
          { home: match.home_score, away: match.away_score }
        )
        points = { exact: breakdown.exactScore, result: breakdown.result, goalDiff: breakdown.goalDiff, total: breakdown.total }
      }
    } else {
      if (pred && pred.winner_team_id && match.winner_team_id) {
        const breakdown = scoreKnockoutMatch(
          match.stage as Stage,
          { home: pred.home_score ?? 0, away: pred.away_score ?? 0, winnerId: pred.winner_team_id },
          { home: match.home_score, away: match.away_score, winnerId: match.winner_team_id }
        )
        points = { exact: breakdown.exactScore, result: breakdown.correctWinner, goalDiff: 0, total: breakdown.total }
      }
    }

    return {
      participant_id: participantId,
      match_id: matchId,
      points_exact_score: points.exact,
      points_result: points.result,
      points_goal_diff: points.goalDiff,
      points_classification: 0,
      total_points: points.total,
      calculated_at: calculatedAt,
    }
  })

  // Batch upsert all participants' scores for this match in one request
  await supabase.from("match_scores").upsert(upserts, { onConflict: "participant_id,match_id" })
  const processed = upserts.length

  // Update ranking snapshots (skip when batching — caller updates once at the end)
  if (opts?.updateRanking !== false) {
    await updateRankingSnapshots(supabase)
  }
  return processed
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateRankingSnapshots(supabase: any) {
  const today = new Date().toISOString().split("T")[0]

  // Paginate to avoid PostgREST's default 1000-row cap (this table can exceed
  // that once most matches have been scored).
  const totals: { participant_id: string; total_points: number; points_exact_score: number }[] = []
  const PAGE_SIZE = 1000
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page } = await supabase
      .from("match_scores")
      .select("participant_id, total_points, points_exact_score")
      .order("id") // ordering estável é obrigatório para paginar sem pular/duplicar linhas
      .range(from, from + PAGE_SIZE - 1)
    if (!page?.length) break
    totals.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  if (!totals.length) return

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
