import { NextRequest, NextResponse } from "next/server"
import { validateParticipant, isPredictionLocked } from "@/lib/participant-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { simulateGroupStandings, selectBest3rdPlaceTeams } from "@/lib/scoring/groupSimulation"

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
      .from("group_predictions")
      .select("match_id, home_score, away_score, is_locked")
      .eq("participant_id", participant!.id),
    supabase
      .from("matches")
      .select("id, group_letter, home_team_id, away_team_id, scheduled_at, status, home_score, away_score, home_team:teams!matches_home_team_id_fkey(id, fifa_code, name, flag_url), away_team:teams!matches_away_team_id_fkey(id, fifa_code, name, flag_url)")
      .eq("stage", "GROUP")
      .order("scheduled_at", { ascending: true }),
  ])

  return NextResponse.json({ predictions: predictions ?? [], matches: matches ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { participant, error } = await validateParticipant(token)
  if (error) return error

  const { predictions } = await req.json()
  // predictions: Array<{ matchId: number; homeScore: number; awayScore: number }>

  if (!Array.isArray(predictions) || predictions.length === 0) {
    return NextResponse.json({ error: "Palpites obrigatórios" }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch group matches to validate locks
  const matchIds = predictions.map((p: { matchId: number }) => p.matchId)
  const { data: matches } = await supabase
    .from("matches")
    .select("id, scheduled_at, status")
    .in("id", matchIds)
    .eq("stage", "GROUP")

  if (!matches) return NextResponse.json({ error: "Jogos não encontrados" }, { status: 400 })

  // Validate prediction scores and check locks
  const validPredictions = []
  for (const pred of predictions) {
    const match = matches.find((m) => m.id === pred.matchId)
    if (!match) continue
    if (isPredictionLocked(match.scheduled_at)) continue // silently skip locked

    if (pred.homeScore < 0 || pred.awayScore < 0) continue

    validPredictions.push({
      participant_id: participant!.id,
      match_id: pred.matchId,
      home_score: pred.homeScore,
      away_score: pred.awayScore,
      is_locked: false,
    })
  }

  if (validPredictions.length > 0) {
    const { error: upsertError } = await supabase
      .from("group_predictions")
      .upsert(validPredictions, { onConflict: "participant_id,match_id" })

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // After saving, run group simulation and update classification predictions
  await generateClassificationPredictions(participant!.id, supabase)

  return NextResponse.json({ ok: true, saved: validPredictions.length })
}

async function generateClassificationPredictions(
  participantId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const [{ data: allGroupMatches }, { data: allPredictions }, { data: allTeams }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, group_letter, home_team_id, away_team_id")
      .eq("stage", "GROUP"),
    supabase
      .from("group_predictions")
      .select("match_id, home_score, away_score")
      .eq("participant_id", participantId),
    supabase.from("teams").select("id, fifa_code, name, flag_url, group_letter"),
  ])

  if (!allGroupMatches || !allPredictions || !allTeams) return

  const predMap = new Map(
    allPredictions.map((p: { match_id: number; home_score: number; away_score: number }) => [
      p.match_id,
      { matchId: p.match_id, home: p.home_score, away: p.away_score },
    ])
  )

  type TeamRow = { id: number; fifa_code: string; name: string; flag_url: string; group_letter: string }
  const teamMap = new Map<number, TeamRow>(allTeams.map((t: TeamRow) => [t.id, t]))

  // Group matches by group letter
  const groupLetters = [...new Set(allGroupMatches.map((m: { group_letter: string }) => m.group_letter).filter(Boolean))] as string[]
  const allGroupStandings: ReturnType<typeof simulateGroupStandings>[] = []
  const classificationUpserts: Array<{
    participant_id: string
    group_letter: string
    position: number
    team_id: number
    is_locked: boolean
  }> = []

  for (const letter of groupLetters) {
    const groupMatches = allGroupMatches.filter((m: { group_letter: string }) => m.group_letter === letter)
    const standings = simulateGroupStandings(groupMatches, predMap as Map<number, { matchId: number; home: number; away: number }>)

    // Attach team info
    const enriched = standings.map((s) => {
      const t = teamMap.get(s.teamId)
      return { ...s, teamName: t?.name ?? "", fifaCode: t?.fifa_code ?? "", flagUrl: t?.flag_url ?? null }
    })
    allGroupStandings.push(enriched)

    // Generate classification predictions for this group
    enriched.forEach((team, idx) => {
      classificationUpserts.push({
        participant_id: participantId,
        group_letter: letter,
        position: idx + 1,
        team_id: team.teamId,
        is_locked: false,
      })
    })
  }

  if (classificationUpserts.length > 0) {
    await supabase
      .from("group_classification_predictions")
      .upsert(classificationUpserts, {
        onConflict: "participant_id,group_letter,position",
      })
  }

  // Select best 3rd-place teams (used by bracket generation when knockout opens)
  selectBest3rdPlaceTeams(allGroupStandings, groupLetters)
  // (Bracket generation for knockout is handled in the knockout route)
}
