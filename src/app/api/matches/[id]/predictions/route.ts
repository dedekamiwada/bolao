import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { scoreGroupMatch } from "@/lib/scoring/group"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const matchId = parseInt(id)
  if (isNaN(matchId)) return NextResponse.json({ error: "Invalid match id" }, { status: 400 })

  const supabase = createAdminClient()

  const [{ data: match, error: matchError }, { data: predictions }, { data: scores }, { data: snapshots }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, stage, group_letter, match_number, scheduled_at, status, home_score, away_score, home_team:teams!matches_home_team_id_fkey(id, fifa_code, name), away_team:teams!matches_away_team_id_fkey(id, fifa_code, name)")
      .eq("id", matchId)
      .single(),
    supabase
      .from("group_predictions")
      .select("participant_id, home_score, away_score, participants(name)")
      .eq("match_id", matchId),
    supabase
      .from("match_scores")
      .select("participant_id, total_points, points_exact_score, points_result, points_goal_diff")
      .eq("match_id", matchId),
    // Total geral de cada participante (snapshot mais recente do ranking)
    supabase
      .from("ranking_snapshots")
      .select("participant_id, total_points, snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(200),
  ])

  if (!match) {
    console.error("[match-predictions] match query failed:", matchError)
    return NextResponse.json({ error: "Match not found" }, { status: 404 })
  }

  const scoresMap = new Map((scores ?? []).map(s => [s.participant_id, s]))

  // Snapshot mais recente por participante → total geral no bolão
  const overallMap = new Map<string, number>()
  for (const s of snapshots ?? []) {
    if (!overallMap.has(s.participant_id)) overallMap.set(s.participant_id, s.total_points)
  }

  // Jogo ao vivo: calcula pontuação PROVISÓRIA em memória com o placar atual.
  // Nada é gravado — os pontos oficiais só existem após o encerramento.
  const isLiveProvisional =
    match.stage === "GROUP" &&
    match.status === "LIVE" &&
    match.home_score !== null &&
    match.away_score !== null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (predictions ?? []).map((p: any) => {
    const score = scoresMap.get(p.participant_id)
    let points = {
      total_points: score?.total_points ?? null,
      points_exact_score: score?.points_exact_score ?? null,
      points_result: score?.points_result ?? null,
      points_goal_diff: score?.points_goal_diff ?? null,
    }
    if (isLiveProvisional && !score) {
      const b = scoreGroupMatch(
        { home: p.home_score, away: p.away_score },
        { home: match.home_score!, away: match.away_score! }
      )
      points = {
        total_points: b.total,
        points_exact_score: b.exactScore,
        points_result: b.result,
        points_goal_diff: b.goalDiff,
      }
    }
    return {
      participant_id: p.participant_id,
      name: p.participants?.name ?? p.participant_id,
      home_score: p.home_score,
      away_score: p.away_score,
      overall_points: overallMap.get(p.participant_id) ?? 0,
      ...points,
    }
  }).sort((a: { total_points: number | null }, b: { total_points: number | null }) => {
    if (a.total_points === null && b.total_points === null) return 0
    if (a.total_points === null) return 1
    if (b.total_points === null) return -1
    return b.total_points - a.total_points
  })

  return NextResponse.json({ match, predictions: result, provisional: isLiveProvisional }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  })
}
