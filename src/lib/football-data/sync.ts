import { createAdminClient } from "@/lib/supabase/admin"
import { fetchLiveAndFinishedMatches, fetchAllMatches } from "./client"
import { FD_STATUS_MAP, buildTlaToId } from "./types"
import { recalculateMatchScores, updateRankingSnapshots } from "@/lib/scoring/calculate"
import { KNOCKOUT_PROGRESSION, THIRD_PLACE_MATCH, THIRD_PLACE_SOURCES } from "@/lib/scoring/bracketPreview"

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

  // ── Propagate bracket winners to next knockout matches ───────────────────
  // Busca todos os jogos do mata-mata finalizados com winner_team_id definido
  // e preenche home_team_id / away_team_id dos jogos seguintes no bracket.
  // Só atualiza se o campo ainda estiver NULL (nunca sobrescreve dado já definido).
  const { data: koMatches } = await supabase
    .from("matches")
    .select("id, match_number, stage, status, winner_team_id, home_team_id, away_team_id")
    .neq("stage", "GROUP")

  if (koMatches && koMatches.length > 0) {
    type KoMatch = { id: number; match_number: number; stage: string; status: string; winner_team_id: number | null; home_team_id: number | null; away_team_id: number | null }
    const byNumber = new Map<number, KoMatch>()
    for (const m of koMatches as KoMatch[]) byNumber.set(m.match_number, m)

    for (const [nextNum, sources] of Object.entries(KNOCKOUT_PROGRESSION)) {
      const nextMatch = byNumber.get(Number(nextNum))
      if (!nextMatch) continue

      const homeSource = byNumber.get(sources.home)
      const awaySource = byNumber.get(sources.away)

      const homeWinner = homeSource?.status === "FINISHED" ? homeSource.winner_team_id : null
      const awayWinner = awaySource?.status === "FINISHED" ? awaySource.winner_team_id : null

      const updateNext: Record<string, unknown> = {}
      if (homeWinner && !nextMatch.home_team_id) updateNext.home_team_id = homeWinner
      if (awayWinner && !nextMatch.away_team_id) updateNext.away_team_id = awayWinner

      if (Object.keys(updateNext).length > 0) {
        await supabase.from("matches").update(updateNext).eq("id", nextMatch.id)
      }
    }

    // 3º lugar: recebe os PERDEDORES das semifinais
    const thirdMatch = byNumber.get(THIRD_PLACE_MATCH)
    if (thirdMatch) {
      const homeSemi = byNumber.get(THIRD_PLACE_SOURCES.home)
      const awaySemi = byNumber.get(THIRD_PLACE_SOURCES.away)

      const updateThird: Record<string, unknown> = {}

      if (homeSemi?.status === "FINISHED" && homeSemi.winner_team_id && !thirdMatch.home_team_id) {
        // Perdedor = quem não é o winner. Usa home_team_id ou away_team_id da semi.
        const loser = homeSemi.winner_team_id === homeSemi.home_team_id
          ? homeSemi.away_team_id
          : homeSemi.home_team_id
        if (loser) updateThird.home_team_id = loser
      }

      if (awaySemi?.status === "FINISHED" && awaySemi.winner_team_id && !thirdMatch.away_team_id) {
        const loser = awaySemi.winner_team_id === awaySemi.home_team_id
          ? awaySemi.away_team_id
          : awaySemi.home_team_id
        if (loser) updateThird.away_team_id = loser
      }

      if (Object.keys(updateThird).length > 0) {
        await supabase.from("matches").update(updateThird).eq("id", thirdMatch.id)
      }
    }
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
