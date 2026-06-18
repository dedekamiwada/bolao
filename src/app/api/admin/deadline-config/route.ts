import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { getGroupRound } from "@/lib/group-rounds"

export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminClient()

  const [{ data: config }, { data: overrides }, { data: groupMatches }] = await Promise.all([
    supabase.from("pool_config").select("key, value").in("key", ["r1_cutoff_minutes", "r23_cutoff_minutes"]),
    supabase
      .from("match_deadline_overrides")
      .select("match_id, close_at, created_at"),
    supabase
      .from("matches")
      .select("id, match_number, group_letter, scheduled_at, status, home_team:teams!matches_home_team_id_fkey(id, fifa_code, name), away_team:teams!matches_away_team_id_fkey(id, fifa_code, name)")
      .eq("stage", "GROUP")
      .order("scheduled_at"),
  ])

  const configMap = Object.fromEntries((config ?? []).map(r => [r.key, r.value]))
  const r1CutoffMinutes: number = Number(configMap["r1_cutoff_minutes"] ?? 15)
  const r23CutoffMinutes: number = Number(configMap["r23_cutoff_minutes"] ?? 10)

  const overrideMatchIds = new Set((overrides ?? []).map(o => o.match_id))
  const matchMap = Object.fromEntries((groupMatches ?? []).map(m => [m.id, m]))

  const matchOverrides = (overrides ?? []).map(o => ({
    ...o,
    match: matchMap[o.match_id] ?? null,
  }))

  // Upcoming scheduled matches without an override — offered for new overrides
  const availableMatches = (groupMatches ?? [])
    .filter(m => m.status === "SCHEDULED" && !overrideMatchIds.has(m.id))
    .map(m => ({ ...m, round: getGroupRound(m.match_number) as 1 | 2 | 3 }))

  return NextResponse.json({ r1CutoffMinutes, r23CutoffMinutes, matchOverrides, availableMatches })
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminClient()
  const body = await req.json()

  if (body.type === "round") {
    const { round, minutes } = body as { round: "r1" | "r23"; minutes: number }
    const key = round === "r1" ? "r1_cutoff_minutes" : "r23_cutoff_minutes"
    const { error } = await supabase
      .from("pool_config")
      .upsert({ key, value: String(minutes) })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === "match_override") {
    const { matchId, closeAt } = body as { matchId: number; closeAt: string }
    const { error } = await supabase
      .from("match_deadline_overrides")
      .upsert({ match_id: matchId, close_at: closeAt })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === "remove_override") {
    const { matchId } = body as { matchId: number }
    const { error } = await supabase
      .from("match_deadline_overrides")
      .delete()
      .eq("match_id", matchId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
}
