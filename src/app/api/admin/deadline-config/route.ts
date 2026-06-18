import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { getGroupRound } from "@/lib/group-rounds"

export const KO_STAGE_ORDER = ["R32", "R16", "QF", "SF", "3RD", "FINAL"]
export const KO_STAGE_LABELS: Record<string, string> = {
  R32: "16 avos", R16: "Oitavas", QF: "Quartas", SF: "Semifinais", "3RD": "3º Lugar", FINAL: "Final",
}
export const KO_CUTOFF_KEY: Record<string, string> = {
  R32: "ko_r32_cutoff_minutes", R16: "ko_r16_cutoff_minutes", QF: "ko_qf_cutoff_minutes",
  SF: "ko_sf_cutoff_minutes", "3RD": "ko_3rd_cutoff_minutes", FINAL: "ko_final_cutoff_minutes",
}
const ALL_CUTOFF_KEYS = ["r1_cutoff_minutes", "r23_cutoff_minutes", ...Object.values(KO_CUTOFF_KEY)]

export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminClient()

  const [{ data: config }, { data: overrides }, { data: groupMatches }, { data: koMatches }] = await Promise.all([
    supabase.from("pool_config").select("key, value").in("key", ALL_CUTOFF_KEYS),
    supabase.from("match_deadline_overrides").select("match_id, close_at, created_at"),
    supabase
      .from("matches")
      .select("id, match_number, group_letter, scheduled_at, status, home_team:teams!matches_home_team_id_fkey(id, fifa_code, name), away_team:teams!matches_away_team_id_fkey(id, fifa_code, name)")
      .eq("stage", "GROUP")
      .order("scheduled_at"),
    supabase
      .from("matches")
      .select("id, stage, match_number, scheduled_at, status, home_team:teams!matches_home_team_id_fkey(id, fifa_code, name), away_team:teams!matches_away_team_id_fkey(id, fifa_code, name)")
      .neq("stage", "GROUP")
      .order("scheduled_at"),
  ])

  const cfgMap = Object.fromEntries((config ?? []).map(r => [r.key, r.value]))
  const r1CutoffMinutes:  number = Number(cfgMap["r1_cutoff_minutes"]  ?? 15)
  const r23CutoffMinutes: number = Number(cfgMap["r23_cutoff_minutes"] ?? 10)
  // Per-stage KO cutoffs: { R32: 15, R16: 15, ... }
  const koCutoffMinutes: Record<string, number> = Object.fromEntries(
    KO_STAGE_ORDER.map(s => [s, Number(cfgMap[KO_CUTOFF_KEY[s]] ?? 15)])
  )

  const overrideMatchIds = new Set((overrides ?? []).map(o => o.match_id))

  const allMatches = [...(groupMatches ?? []).map(m => ({ ...m, stage: "GROUP" })), ...(koMatches ?? [])]
  const matchMap = Object.fromEntries(allMatches.map(m => [m.id, m]))
  const matchOverrides = (overrides ?? []).map(o => ({ ...o, match: matchMap[o.match_id] ?? null }))

  const availableGroupMatches = (groupMatches ?? [])
    .filter(m => m.status === "SCHEDULED" && !overrideMatchIds.has(m.id))
    .map(m => ({ ...m, stage: "GROUP", round: getGroupRound(m.match_number) as 1 | 2 | 3, koStage: null as string | null }))

  const availableKoMatches = (koMatches ?? [])
    .filter(m => m.status === "SCHEDULED" && !overrideMatchIds.has(m.id))
    .map(m => ({ ...m, group_letter: null as string | null, round: null as (1|2|3) | null, koStage: m.stage, koStageLabel: KO_STAGE_LABELS[m.stage] ?? m.stage }))

  availableKoMatches.sort((a, b) =>
    KO_STAGE_ORDER.indexOf(a.koStage ?? "") - KO_STAGE_ORDER.indexOf(b.koStage ?? "")
  )

  return NextResponse.json({
    r1CutoffMinutes, r23CutoffMinutes, koCutoffMinutes,
    matchOverrides,
    availableGroupMatches,
    availableKoMatches,
  })
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminClient()
  const body = await req.json()

  if (body.type === "round") {
    // round is "r1" | "r23" | KO stage key (e.g. "R32", "R16", ...)
    const { round, minutes } = body as { round: string; minutes: number }
    const fixedKeyMap: Record<string, string> = {
      r1: "r1_cutoff_minutes",
      r23: "r23_cutoff_minutes",
    }
    const key = fixedKeyMap[round] ?? KO_CUTOFF_KEY[round]
    if (!key) return NextResponse.json({ error: "Rodada inválida" }, { status: 400 })
    const { error } = await supabase.from("pool_config").upsert({ key, value: String(minutes) }, { onConflict: "key" })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === "match_override") {
    const { matchId, closeAt } = body as { matchId: number; closeAt: string }
    const { error } = await supabase
      .from("match_deadline_overrides")
      .upsert({ match_id: matchId, close_at: closeAt }, { onConflict: "match_id" })
    if (error) return NextResponse.json({ error: error.message, detail: "upsert match_deadline_overrides" }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.type === "remove_override") {
    const { matchId } = body as { matchId: number }
    const { error } = await supabase.from("match_deadline_overrides").delete().eq("match_id", matchId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
}
