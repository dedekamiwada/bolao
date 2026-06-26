import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { scoreGroupMatch } from "@/lib/scoring/group"
import { scoreKnockoutMatch } from "@/lib/scoring/knockout"
import type { Stage } from "@/types/domain"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const matchId = parseInt(id)
  if (isNaN(matchId)) return NextResponse.json({ error: "Invalid match id" }, { status: 400 })

  const supabase = createAdminClient()

  const [{ data: match, error: matchError }, { data: scores }, { data: latestSnapDate }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, stage, group_letter, match_number, scheduled_at, status, home_score, away_score, winner_team_id, home_team_id, away_team_id, home_team:teams!matches_home_team_id_fkey(id, fifa_code, name), away_team:teams!matches_away_team_id_fkey(id, fifa_code, name)")
      .eq("id", matchId)
      .single(),
    supabase
      .from("match_scores")
      .select("participant_id, total_points, points_exact_score, points_result, points_goal_diff")
      .eq("match_id", matchId),
    supabase
      .from("ranking_snapshots")
      .select("snapshot_date")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single(),
  ])

  if (!match) {
    console.error("[match-predictions] match query failed:", matchError)
    return NextResponse.json({ error: "Match not found" }, { status: 404 })
  }

  const isKnockout = match.stage !== "GROUP"

  // Busca palpites da tabela correta
  const { data: predictions } = isKnockout
    ? await supabase
        .from("knockout_predictions")
        .select("participant_id, home_score, away_score, winner_team_id, participants(name)")
        .eq("match_id", matchId)
    : await supabase
        .from("group_predictions")
        .select("participant_id, home_score, away_score, participants(name)")
        .eq("match_id", matchId)

  const { data: snapshots } = latestSnapDate
    ? await supabase
        .from("ranking_snapshots")
        .select("participant_id, total_points")
        .eq("snapshot_date", latestSnapDate.snapshot_date)
    : { data: [] }

  const scoresMap = new Map((scores ?? []).map(s => [s.participant_id, s]))

  const overallMap = new Map<string, number>()
  for (const s of snapshots ?? []) {
    if (!overallMap.has(s.participant_id)) overallMap.set(s.participant_id, s.total_points)
  }

  const isGroupLive =
    !isKnockout &&
    match.status === "LIVE" &&
    match.home_score !== null &&
    match.away_score !== null

  const isKnockoutLive =
    isKnockout &&
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

    if (isGroupLive && !score) {
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

    // Mata-mata ao vivo: pontua igual ao grupo, pelo placar parcial. Sem
    // palpite de "quem passa", o resultado (vitória/derrota/empate) já é
    // determinável pelo sinal do placar atual.
    if (isKnockoutLive && !score && p.home_score !== null && p.away_score !== null) {
      const b = scoreKnockoutMatch(
        match.stage as Stage,
        { home: p.home_score, away: p.away_score },
        { home: match.home_score!, away: match.away_score! }
      )
      points = {
        total_points: b.total,
        points_exact_score: b.exactScore,
        points_result: b.correctResult,
        points_goal_diff: 0,
      }
    }

    return {
      participant_id: p.participant_id,
      name: (p.participants as { name: string } | null)?.name ?? p.participant_id,
      home_score: p.home_score,
      away_score: p.away_score,
      winner_team_id: p.winner_team_id ?? null,
      overall_points: overallMap.get(p.participant_id) ?? 0,
      ...points,
    }
  }).sort((a: { total_points: number | null }, b: { total_points: number | null }) => {
    if (a.total_points === null && b.total_points === null) return 0
    if (a.total_points === null) return 1
    if (b.total_points === null) return -1
    return b.total_points - a.total_points
  })

  const provisional = isGroupLive || isKnockoutLive

  return NextResponse.json({ match, predictions: result, provisional }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  })
}

// Exporta para uso no provisional knockout scoring
export { scoreKnockoutMatch }
export type { Stage }
