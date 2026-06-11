import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  // Paginação: o Supabase limita cada resposta a 1000 linhas no servidor
  // (um .limit() maior é ignorado). Ao longo da Copa esta tabela passa de
  // 1000 linhas (~31 participantes × ~39 dias) e, como a ordenação é
  // ascendente, o corte derrubaria justamente os dias mais recentes.
  const data: { participant_id: string; snapshot_date: string; total_points: number; rank_position: number | null }[] = []
  const PAGE_SIZE = 1000
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page } = await supabase
      .from("ranking_snapshots")
      .select("participant_id, snapshot_date, total_points, rank_position")
      .order("snapshot_date", { ascending: true })
      .order("id")
      .range(from, from + PAGE_SIZE - 1)
    if (!page?.length) break
    data.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  return NextResponse.json({ history: data }, {
    headers: { "Cache-Control": "public, s-maxage=60" },
  })
}
