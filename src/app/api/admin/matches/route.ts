import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const supabase = createAdminClient()
  const { data, error: dbError } = await supabase
    .from("matches")
    .select(`
      *,
      home_team:teams!matches_home_team_id_fkey(id, fifa_code, name, flag_url),
      away_team:teams!matches_away_team_id_fkey(id, fifa_code, name, flag_url)
    `)
    .order("scheduled_at", { ascending: true })

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ matches: data })
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id, home_score, away_score, status, winner_team_id } = await req.json()
  if (!id) return NextResponse.json({ error: "ID do jogo obrigatório" }, { status: 400 })

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}

  if (home_score !== undefined) update.home_score = home_score
  if (away_score !== undefined) update.away_score = away_score
  if (status !== undefined) update.status = status
  if (winner_team_id !== undefined) update.winner_team_id = winner_team_id

  if (status === "FINISHED" && home_score !== undefined) {
    update.result_confirmed_at = new Date().toISOString()
  }

  const { data, error: dbError } = await supabase
    .from("matches")
    .update(update as Parameters<typeof supabase.from>[0] extends string ? never : never)
    .eq("id", id)
    .select()
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ match: data })
}
