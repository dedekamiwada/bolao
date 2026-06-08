import { NextRequest, NextResponse } from "next/server"
import { validateParticipant, isPredictionLocked } from "@/lib/participant-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { participant, error } = await validateParticipant(token)
  if (error) return error

  const supabase = createAdminClient()

  const [{ data: predictions }, { data: matches }] = await Promise.all([
    supabase
      .from("knockout_predictions")
      .select("match_id, home_team_id, away_team_id, home_score, away_score, winner_team_id, is_locked")
      .eq("participant_id", participant!.id),
    supabase
      .from("matches")
      .select("id, stage, match_number, scheduled_at, status, home_team_id, away_team_id, home_score, away_score, winner_team_id, home_team:teams!matches_home_team_id_fkey(id, fifa_code, name, flag_url), away_team:teams!matches_away_team_id_fkey(id, fifa_code, name, flag_url)")
      .neq("stage", "GROUP")
      .order("scheduled_at", { ascending: true }),
  ])

  // Get participant's simulated group classification
  const { data: classifications } = await supabase
    .from("group_classification_predictions")
    .select("group_letter, position, team_id, teams(id, fifa_code, name, flag_url)")
    .eq("participant_id", participant!.id)
    .order("group_letter")
    .order("position")

  return NextResponse.json({
    predictions: predictions ?? [],
    matches: matches ?? [],
    classifications: classifications ?? [],
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

  const { data: matches } = await supabase
    .from("matches")
    .select("id, scheduled_at")
    .in("id", matchIds)
    .neq("stage", "GROUP")

  if (!matches) return NextResponse.json({ error: "Jogos não encontrados" }, { status: 400 })

  const validPredictions = []
  for (const pred of predictions) {
    const match = matches.find((m) => m.id === pred.matchId)
    if (!match) continue
    if (isPredictionLocked(match.scheduled_at)) continue

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
