import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stage = searchParams.get("stage")

  const supabase = await createClient()

  let query = supabase
    .from("matches")
    .select(`
      id, stage, group_letter, match_number, scheduled_at, status,
      home_score, away_score, winner_team_id, result_confirmed_at,
      home_team:teams!matches_home_team_id_fkey(id, fifa_code, name, flag_url),
      away_team:teams!matches_away_team_id_fkey(id, fifa_code, name, flag_url)
    `)
    .order("scheduled_at", { ascending: true })

  if (stage) query = query.eq("stage", stage)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ matches: data }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  })
}
