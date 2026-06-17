import { createAdminClient } from "@/lib/supabase/admin"
import { fetchLiveAndFinishedMatches, fetchAllMatches } from "./client"
import { FD_STATUS_MAP, buildTlaToId } from "./types"
import { recalculateMatchScores, updateRankingSnapshots } from "@/lib/scoring/calculate"

export async function syncMatches(fullSync = false) {
  const supabase = createAdminClient()
  const data = fullSync ? await fetchAllMatches() : await fetchLiveAndFinishedMatches()

  // ── Build team lookup: tla (from FD API) → our team_id ──────────────────
  const { data: dbTeams } = await supabase.from("teams").select("id, fifa_code")
  const tlaToId = buildTlaToId(dbTeams ?? [])

  // ── Load all our matches for fallback matching ───────────────────────────
  type DbMatch = {
    id: number
    external_id: number | null
    status: string
    result_confirmed_at: string | null
    home_team_id: number | null
    away_team_id: number | null
    scheduled_at: string
    home_score: number | null
    away_score: number | null
  }
  const { data: dbMatches } = await supabase
    .from("matches")
    .select("id, external_id, status, result_confirmed_at, home_team_id, away_team_id, scheduled_at, home_score, away_score")

  // Quick lookup by external_id for already-linked matches
  const byExtId = new Map<number, DbMatch>()
  for (const m of (dbMatches ?? []) as DbMatch[]) {
    if (m.external_id) byExtId.set(m.external_id, m)
  }

  const newlyFinished: number[] = []
  let linked = 0

  for (const fdMatch of data.matches) {
    const status = FD_STATUS_MAP[fdMatch.status] ?? "SCHEDULED"

    // Scoring rule: use 90min + ET score (ignore penalties)
    // football-data.org: fullTime = 90min only, extraTime = score após 120min.
    // ATENÇÃO: a API OMITE score.extraTime em jogos sem prorrogação — todo
    // acesso precisa de optional chaining, senão o sync inteiro estoura.
    const wentToET = fdMatch.score.duration === "EXTRA_TIME" || fdMatch.score.duration === "PENALTY_SHOOTOUT"
    const homeScore = wentToET && fdMatch.score.extraTime?.home != null
      ? fdMatch.score.extraTime.home
      : fdMatch.score.fullTime.home
    const awayScore = wentToET && fdMatch.score.extraTime?.away != null
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

    // Resultado confirmado manualmente pelo admin: só o FINISHED oficial da API
    // pode sobrescrever — nunca rebaixa para LIVE/SCHEDULED nem apaga o placar.
    if (existing.result_confirmed_at && existing.status === "FINISHED" && !isNowFinished) continue

    const update: Record<string, unknown> = { status }

    if (isNowFinished) {
      update.home_score = homeScore
      update.away_score = awayScore
      update.home_score_et = fdMatch.score.extraTime?.home ?? null
      update.away_score_et = fdMatch.score.extraTime?.away ?? null

      if (fdMatch.score.winner === "HOME_TEAM") {
        update.winner_team_id = existing.home_team_id
      } else if (fdMatch.score.winner === "AWAY_TEAM") {
        update.winner_team_id = existing.away_team_id
      } else {
        // DRAW ou null — garante que não persiste um winner_team_id incorreto de sync anterior
        update.winner_team_id = null
      }

      if (wasNotFinished && !existing.result_confirmed_at) {
        update.result_confirmed_at = new Date().toISOString()
        newlyFinished.push(existing.id)
      } else if (homeScore !== existing.home_score || awayScore !== existing.away_score) {
        // Jogo já encerrado mas a API corrigiu o placar — repontua também
        newlyFinished.push(existing.id)
      }
    } else if (status === "LIVE" && homeScore !== null && awayScore !== null) {
      // Placar parcial — só grava quando a API realmente traz números
      update.home_score = homeScore
      update.away_score = awayScore
    }

    // Pula escrita quando nada mudou (na prática zera ~100 UPDATEs por sync,
    // já que a maioria dos jogos segue SCHEDULED sem placar)
    const noChange =
      update.status === existing.status &&
      (update.home_score === undefined || update.home_score === existing.home_score) &&
      (update.away_score === undefined || update.away_score === existing.away_score) &&
      update.result_confirmed_at === undefined
    if (noChange) continue

    await supabase.from("matches").update(update).eq("id", existing.id)
  }

  // ── Auto-calculate scores for newly finished matches ─────────────────────
  for (const matchId of newlyFinished) {
    await recalculateMatchScores(matchId, { updateRanking: false })
  }
  if (newlyFinished.length > 0) {
    await updateRankingSnapshots(supabase)
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
