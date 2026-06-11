import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  // Admin client: a tabela participants não tem leitura pública (RLS), e o
  // ranking precisa do nome de cada participante
  const supabase = createAdminClient()

  // Get today's ranking from snapshots
  const { data: snapshots } = await supabase
    .from("ranking_snapshots")
    .select("participant_id, total_points, exact_scores, correct_results, rank_position, snapshot_date, participants(name)")
    .order("snapshot_date", { ascending: false })
    .limit(200)

  // Knockout points per participant (tiebreaker) — paginado pois o Supabase
  // limita cada resposta a 1000 linhas no servidor e esta tabela pode chegar
  // perto disso (participantes × 32 jogos de mata-mata)
  const knockoutRows: { participant_id: string; total_points: number }[] = []
  const PAGE_SIZE = 1000
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page } = await supabase
      .from("match_scores")
      .select("participant_id, total_points, matches!inner(stage)")
      .neq("matches.stage", "GROUP")
      .order("id")
      .range(from, from + PAGE_SIZE - 1)
    if (!page?.length) break
    knockoutRows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  if (!snapshots) return NextResponse.json({ ranking: [] })

  // Keep only latest snapshot per participant
  const latestByParticipant = new Map<string, typeof snapshots[0]>()
  for (const s of snapshots) {
    if (!latestByParticipant.has(s.participant_id)) {
      latestByParticipant.set(s.participant_id, s)
    }
  }

  // Aggregate knockout points per participant (tiebreaker #2)
  const knockoutByPid = new Map<string, number>()
  for (const row of knockoutRows) {
    knockoutByPid.set(row.participant_id, (knockoutByPid.get(row.participant_id) ?? 0) + row.total_points)
  }

  const ranking = [...latestByParticipant.values()]
    .sort((a, b) =>
      b.total_points - a.total_points ||
      b.exact_scores - a.exact_scores ||
      (knockoutByPid.get(b.participant_id) ?? 0) - (knockoutByPid.get(a.participant_id) ?? 0)
    )
    .map((s, idx) => ({
      ...s,
      // join retorna objeto ou array conforme a cardinalidade inferida
      name: (Array.isArray(s.participants) ? s.participants[0]?.name : (s.participants as { name: string } | null)?.name) ?? null,
      participants: undefined,
      rank_position: idx + 1,
      knockout_points: knockoutByPid.get(s.participant_id) ?? 0,
    }))

  return NextResponse.json({ ranking }, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  })
}
