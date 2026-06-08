import { createAdminClient } from "@/lib/supabase/admin"
import { fetchLiveAndFinishedMatches, fetchAllMatches } from "./client"
import { FD_STAGE_MAP, FD_STATUS_MAP } from "./types"
import { recalculateMatchScores } from "@/lib/scoring/calculate"

export async function syncMatches(fullSync = false) {
  const supabase = createAdminClient()
  const data = fullSync ? await fetchAllMatches() : await fetchLiveAndFinishedMatches()

  // ── Build team lookup: tla (from FD API) → our team_id ──────────────────
  const { data: dbTeams } = await supabase.from("teams").select("id, fifa_code")
  const tlaToId = new Map<string, number>()
  for (const t of dbTeams ?? []) {
    tlaToId.set(t.fifa_code.toUpperCase(), t.id)
  }

  // ── Load all our matches for fallback matching ───────────────────────────
  type DbMatch = {
    id: number
    external_id: number | null
    status: string
    result_confirmed_at: string | null
    home_team_id: number | null
    away_team_id: number | null
    scheduled_at: string
  }
  const { data: dbMatches } = await supabase
    .from("matches")
    .select("id, external_id, status, result_confirmed_at, home_team_id, away_team_id, scheduled_at")

  // Quick lookup by external_id for already-linked matches
  const byExtId = new Map<number, DbMatch>()
  for (const m of (dbMatches ?? []) as DbMatch[]) {
    if (m.external_id) byExtId.set(m.external_id, m)
  }

  const newlyFinished: number[] = []
  let linked = 0

  for (const fdMatch of data.matches) {
    const stage = FD_STAGE_MAP[fdMatch.stage] ?? fdMatch.stage
    const status = FD_STATUS_MAP[fdMatch.status] ?? "SCHEDULED"

    // Scoring rule: use 90min + ET score (ignore penalties)
    // football-data.org: fullTime = 90min only, extraTime = score after 120min
    const wentToET = fdMatch.score.duration === "EXTRA_TIME" || fdMatch.score.duration === "PENALTY_SHOOTOUT"
    const homeScore = wentToET && fdMatch.score.extraTime.home !== null
      ? fdMatch.score.extraTime.home
      : fdMatch.score.fullTime.home
    const awayScore = wentToET && fdMatch.score.extraTime.away !== null
      ? fdMatch.score.extraTime.away
      : fdMatch.score.fullTime.away

    // ── Find matching DB row: try external_id first, then teams+date ────────
    let existing: DbMatch | null = byExtId.get(fdMatch.id) ?? null

    if (!existing) {
      const homeTla = fdMatch.homeTeam.tla?.toUpperCase()
      const awayTla = fdMatch.awayTeam.tla?.toUpperCase()
      const homeId = tlaToId.get(homeTla)
      const awayId = tlaToId.get(awayTla)
      const fdTime = new Date(fdMatch.utcDate).getTime()

      if (homeId && awayId) {
        existing = ((dbMatches ?? []) as DbMatch[]).find(m =>
          m.home_team_id === homeId &&
          m.away_team_id === awayId &&
          Math.abs(new Date(m.scheduled_at).getTime() - fdTime) < 12 * 3_600_000 // ±12h
        ) ?? null

        if (existing) {
          // Save external_id so future syncs are instant
          await supabase
            .from("matches")
            .update({ external_id: fdMatch.id })
            .eq("id", existing.id)
          byExtId.set(fdMatch.id, existing)
          linked++
        }
      }
    }

    if (!existing) continue

    // ── Build update object ─────────────────────────────────────────────────
    const wasNotFinished = existing.status !== "FINISHED"
    const isNowFinished = status === "FINISHED" && homeScore !== null && awayScore !== null

    const update: Record<string, unknown> = { status }

    if (isNowFinished) {
      update.home_score = homeScore
      update.away_score = awayScore
      update.home_score_et = fdMatch.score.extraTime.home
      update.away_score_et = fdMatch.score.extraTime.away

      if (fdMatch.score.winner === "HOME_TEAM") {
        update.winner_team_id = existing.home_team_id
      } else if (fdMatch.score.winner === "AWAY_TEAM") {
        update.winner_team_id = existing.away_team_id
      }

      if (wasNotFinished && !existing.result_confirmed_at) {
        update.result_confirmed_at = new Date().toISOString()
        newlyFinished.push(existing.id)
      }
    } else if (status === "LIVE") {
      update.home_score = homeScore
      update.away_score = awayScore
    }

    await supabase.from("matches").update(update).eq("id", existing.id)
  }

  // ── Auto-calculate scores for newly finished matches ─────────────────────
  for (const matchId of newlyFinished) {
    await recalculateMatchScores(matchId)
  }

  // ── Update last_sync timestamp (best-effort) ─────────────────────────────
  try {
    await supabase
      .from("pool_config")
      .upsert({ key: "last_sync", value: new Date().toISOString() })
  } catch (e) {
    console.warn("[sync] pool_config upsert failed:", e)
  }

  return { synced: data.matches.length, linked, newlyFinished }
}
