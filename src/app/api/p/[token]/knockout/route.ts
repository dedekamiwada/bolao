import { NextRequest, NextResponse } from "next/server"
import { validateParticipant, isPredictionLocked } from "@/lib/participant-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { KO_CUTOFF_KEY } from "@/app/api/admin/deadline-config/route"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { participant, error } = await validateParticipant(token)
  if (error) return error

  const supabase = createAdminClient()
  const allCutoffKeys = Object.values(KO_CUTOFF_KEY)

  const [{ data: predictions }, { data: matches }, { data: cutoffConfig }, { data: overrides }] = await Promise.all([
    supabase
      .from("knockout_predictions")
      .select("match_id, home_team_id, away_team_id, home_score, away_score, winner_team_id, is_locked")
      .eq("participant_id", participant!.id),
    supabase
      .from("matches")
      .select("id, stage, match_number, scheduled_at, status, home_team_id, away_team_id, home_score, away_score, winner_team_id, home_team:teams!matches_home_team_id_fkey(id, fifa_code, name, flag_url), away_team:teams!matches_away_team_id_fkey(id, fifa_code, name, flag_url)")
      .neq("stage", "GROUP")
      .order("scheduled_at", { ascending: true }),
    supabase.from("pool_config").select("key, value").in("key", allCutoffKeys),
    supabase.from("match_deadline_overrides").select("match_id, close_at"),
  ])

  // Calcula is_locked por jogo (15 min antes de cada partida, configurável)
  const cfgMap = Object.fromEntries((cutoffConfig ?? []).map(r => [r.key, r.value]))
  const cutoffForStage = (stage: string) => Number(cfgMap[KO_CUTOFF_KEY[stage]] ?? 15)
  const overrideMap = new Map((overrides ?? []).map(o => [o.match_id, o.close_at]))

  const predMap = new Map((predictions ?? []).map(p => [p.match_id, p]))

  // Calcula lock para todos os jogos (mesmo sem palpite ainda)
  const matchLockMap = new Map<number, boolean>()
  const predictionsWithLock = []
  for (const m of matches ?? []) {
    const customClose = overrideMap.get(m.id)
    const locked = m.status === "LIVE" || m.status === "FINISHED" || (
      customClose
        ? Date.now() >= new Date(customClose).getTime()
        : isPredictionLocked(m.scheduled_at, cutoffForStage(m.stage))
    )
    matchLockMap.set(m.id, locked)
    const pred = predMap.get(m.id)
    if (pred) predictionsWithLock.push({ ...pred, is_locked: locked })
  }

  const lockedMatchIds = [...matchLockMap.entries()].filter(([, v]) => v).map(([k]) => k)

  // Get participant's simulated group classification
  const { data: classifications } = await supabase
    .from("group_classification_predictions")
    .select("group_letter, position, team_id, teams(id, fifa_code, name, flag_url)")
    .eq("participant_id", participant!.id)
    .order("group_letter")
    .order("position")

  return NextResponse.json({
    predictions: predictionsWithLock,
    matches: matches ?? [],
    classifications: classifications ?? [],
    lockedMatchIds,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { participant, error } = await validateParticipant(token)
  if (error) return error

  const { predictions } = await req.json()

  if (!Array.isArray(predictions) || predictions.length === 0) {
    return NextResponse.json({ error: "Palpites obrigatórios" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const matchIds = predictions.map((p: { matchId: number }) => p.matchId)

  const allCutoffKeys = Object.values(KO_CUTOFF_KEY)

  const [{ data: matches }, { data: cutoffConfig }, { data: overrides }] = await Promise.all([
    supabase.from("matches").select("id, stage, scheduled_at").in("id", matchIds).neq("stage", "GROUP"),
    supabase.from("pool_config").select("key, value").in("key", allCutoffKeys),
    supabase.from("match_deadline_overrides").select("match_id, close_at").in("match_id", matchIds),
  ])

  if (!matches) return NextResponse.json({ error: "Jogos não encontrados" }, { status: 400 })

  const cfgMap = Object.fromEntries((cutoffConfig ?? []).map(r => [r.key, r.value]))
  const cutoffForStage = (stage: string) => Number(cfgMap[KO_CUTOFF_KEY[stage]] ?? 15)
  const overrideMap = new Map((overrides ?? []).map(o => [o.match_id, o.close_at]))

  const validPredictions = []
  for (const pred of predictions) {
    const match = matches.find((m) => m.id === pred.matchId)
    if (!match) continue
    // Per-match override takes priority over per-stage cutoff
    const customClose = overrideMap.get(match.id)
    const locked = customClose
      ? Date.now() >= new Date(customClose).getTime()
      : isPredictionLocked(match.scheduled_at, cutoffForStage(match.stage))
    if (locked) continue

    if (pred.homeScore === undefined || pred.awayScore === undefined || !pred.winnerId) continue

    validPredictions.push({
      participant_id: participant!.id,
      match_id: pred.matchId,
      home_team_id: pred.homeTeamId ?? null,
      away_team_id: pred.awayTeamId ?? null,
      home_score: pred.homeScore,
      away_score: pred.awayScore,
      winner_team_id: pred.winnerId,
      is_locked: false,
    })
  }

  if (validPredictions.length > 0) {
    const { error: upsertError } = await supabase
      .from("knockout_predictions")
      .upsert(validPredictions, { onConflict: "participant_id,match_id" })

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saved: validPredictions.length })
}
