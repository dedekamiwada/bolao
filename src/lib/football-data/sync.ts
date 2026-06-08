import { createAdminClient } from "@/lib/supabase/admin"
import { fetchLiveAndFinishedMatches, fetchAllMatches } from "./client"
import { FD_STAGE_MAP, FD_STATUS_MAP } from "./types"
import { recalculateMatchScores } from "@/lib/scoring/calculate"

export async function syncMatches(fullSync = false) {
  const supabase = createAdminClient()
  const data = fullSync ? await fetchAllMatches() : await fetchLiveAndFinishedMatches()

  const newlyFinished: number[] = []

  for (const fdMatch of data.matches) {
    const stage = FD_STAGE_MAP[fdMatch.stage] ?? fdMatch.stage
    const status = FD_STATUS_MAP[fdMatch.status] ?? "SCHEDULED"
    const homeScore = fdMatch.score.fullTime.home
    const awayScore = fdMatch.score.fullTime.away

    // Check existing match
    const { data: existing } = await supabase
      .from("matches")
      .select("id, status, result_confirmed_at")
      .eq("external_id", fdMatch.id)
      .single()

    if (!existing) continue // Match not yet seeded — skip

    const wasNotFinished = existing.status !== "FINISHED"
    const isNowFinished = status === "FINISHED" && homeScore !== null && awayScore !== null

    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (isNowFinished) {
      update.home_score = homeScore
      update.away_score = awayScore
      update.home_score_et = fdMatch.score.extraTime.home
      update.away_score_et = fdMatch.score.extraTime.away

      // Determine winner for knockout stages
      if (fdMatch.score.winner === "HOME_TEAM") {
        const { data: homeTeam } = await supabase
          .from("matches")
          .select("home_team_id")
          .eq("id", existing.id)
          .single()
        if (homeTeam) update.winner_team_id = homeTeam.home_team_id
      } else if (fdMatch.score.winner === "AWAY_TEAM") {
        const { data: awayTeam } = await supabase
          .from("matches")
          .select("away_team_id")
          .eq("id", existing.id)
          .single()
        if (awayTeam) update.winner_team_id = awayTeam.away_team_id
      }

      if (wasNotFinished && !existing.result_confirmed_at) {
        update.result_confirmed_at = new Date().toISOString()
        newlyFinished.push(existing.id)
      }
    } else if (status === "LIVE") {
      update.home_score = homeScore
      update.away_score = awayScore
    }

    await supabase
      .from("matches")
      .update(update)
      .eq("id", existing.id)
  }

  // Auto-calculate scores for newly finished matches
  for (const matchId of newlyFinished) {
    await recalculateMatchScores(matchId)
  }

  // Update pool_config last_sync timestamp
  await supabase
    .from("pool_config")
    .upsert({ key: "last_sync", value: new Date().toISOString() })

  return { synced: data.matches.length, newlyFinished }
}
