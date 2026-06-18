import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { getGroupRound } from "@/lib/group-rounds"
import { KO_STAGE_ORDER, KO_STAGE_LABELS, KO_CUTOFF_KEY } from "@/app/api/admin/deadline-config/route"

export async function GET(req: NextRequest) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const forceWindow = req.nextUrl.searchParams.get("window")

  const supabase = createAdminClient()

  const allCutoffKeys = ["r1_cutoff_minutes", "r23_cutoff_minutes", ...Object.values(KO_CUTOFF_KEY)]

  const [
    { data: participants },
    { data: groupMatches },
    { data: knockoutMatches },
    { data: cutoffConfig },
  ] = await Promise.all([
    supabase.from("participants").select("id, name").eq("is_active", true).order("name"),
    supabase.from("matches").select("id, match_number, scheduled_at, group_letter, status").eq("stage", "GROUP").order("scheduled_at"),
    supabase.from("matches").select("id, stage, scheduled_at, status").neq("stage", "GROUP").order("scheduled_at"),
    supabase.from("pool_config").select("key, value").in("key", allCutoffKeys),
  ])

  if (!participants || !groupMatches) return NextResponse.json({ error: "DB error" }, { status: 500 })

  const now = Date.now()
  const cfgMap = Object.fromEntries((cutoffConfig ?? []).map(r => [r.key, r.value]))
  const R1_CUTOFF_MS  = Number(cfgMap["r1_cutoff_minutes"]  ?? 15) * 60 * 1000
  const R23_CUTOFF_MS = Number(cfgMap["r23_cutoff_minutes"] ?? 10) * 60 * 1000
  // Per-stage KO cutoff in ms
  const koCutoffMs = (stage: string) => Number(cfgMap[KO_CUTOFF_KEY[stage]] ?? 15) * 60 * 1000

  const r1Matches  = groupMatches.filter(m => getGroupRound(m.match_number) === 1)
  const r2Matches  = groupMatches.filter(m => getGroupRound(m.match_number) === 2)
  const r3Matches  = groupMatches.filter(m => getGroupRound(m.match_number) === 3)

  function firstMatchAt(arr: typeof groupMatches): number | null {
    if (!arr || arr.length === 0) return null
    return Math.min(...arr.map(m => new Date(m.scheduled_at).getTime()))
  }

  const r1LockTime  = r1Matches.length  ? firstMatchAt(r1Matches)!  - R1_CUTOFF_MS  : null
  const r2LockTime  = r2Matches.length  ? firstMatchAt(r2Matches)!  - R23_CUTOFF_MS : null

  const r1Active  = r1LockTime  !== null && now < r1LockTime
  const r23Active = r2LockTime  !== null && !r1Active && now < r2LockTime

  // Group knockout matches by stage
  const koByStage = new Map<string, typeof knockoutMatches>()
  for (const m of knockoutMatches ?? []) {
    if (!koByStage.has(m.stage)) koByStage.set(m.stage, [])
    koByStage.get(m.stage)!.push(m)
  }
  const koStages = KO_STAGE_ORDER.filter(s => koByStage.has(s))

  // Build available window list
  const availableWindows: Array<{ key: string; label: string; deadline: string | null }> = []
  if (r1Matches.length)  availableWindows.push({ key: "r1",  label: "Rodada 1",      deadline: r1LockTime ? new Date(r1LockTime).toISOString() : null })
  if (r2Matches.length)  availableWindows.push({ key: "r23", label: "Rodadas 2 e 3", deadline: r2LockTime ? new Date(r2LockTime).toISOString() : null })
  for (const stage of koStages) {
    const stageMatches = koByStage.get(stage)!
    const earliest = Math.min(...stageMatches.map(m => new Date(m.scheduled_at).getTime()))
    const koLock = earliest - koCutoffMs(stage)
    availableWindows.push({
      key: stage,
      label: KO_STAGE_LABELS[stage] ?? stage,
      deadline: now < koLock ? new Date(koLock).toISOString() : null,
    })
  }

  // Determine active window for auto-detect
  const nextKoStage = koStages.find(s => {
    const earliest = Math.min(...koByStage.get(s)!.map(m => new Date(m.scheduled_at).getTime()))
    return now < earliest - koCutoffMs(s)
  })

  // Determine which window to query
  let windowLabel = ""
  let windowDeadline: string | null = null
  const openMatchIds = new Set<number>()
  let isKnockout = false

  const koStageKeys = new Set(koStages)
  const forceKO = forceWindow && koStageKeys.has(forceWindow)
  const useR1  = forceWindow === "r1"  || (!forceWindow && r1Active)
  const useR23 = forceWindow === "r23" || (!forceWindow && !r1Active && r23Active)
  const useKO  = forceKO || (!forceWindow && !r1Active && !r23Active && !!nextKoStage)

  if (useR1) {
    r1Matches.forEach(m => openMatchIds.add(m.id))
    windowLabel = "Rodada 1 — Fase de Grupos"
    if (r1LockTime) windowDeadline = new Date(r1LockTime).toISOString()
  } else if (useR23) {
    r2Matches.forEach(m => openMatchIds.add(m.id))
    r3Matches.forEach(m => openMatchIds.add(m.id))
    windowLabel = "Rodadas 2 e 3 — Fase de Grupos"
    if (r2LockTime) windowDeadline = new Date(r2LockTime).toISOString()
  } else if (useKO) {
    const stage = forceKO ? forceWindow! : nextKoStage!
    const stageMatches = koByStage.get(stage) ?? []
    stageMatches.forEach(m => openMatchIds.add(m.id))
    windowLabel = KO_STAGE_LABELS[stage] ?? stage
    const earliest = Math.min(...stageMatches.map(m => new Date(m.scheduled_at).getTime()))
    const koLock = earliest - koCutoffMs(stage)
    if (now < koLock) windowDeadline = new Date(koLock).toISOString()
    isKnockout = true
  }

  const totalExpected = openMatchIds.size
  const predMap = new Map<string, Set<number>>()
  for (const p of participants) predMap.set(p.id, new Set())

  const predTable = isKnockout ? "knockout_predictions" : "group_predictions"

  if (openMatchIds.size > 0) {
    const PAGE_SIZE = 1000
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: page } = await supabase
        .from(predTable)
        .select("participant_id, match_id")
        .in("match_id", Array.from(openMatchIds))
        .order("id")
        .range(from, from + PAGE_SIZE - 1)
      if (!page?.length) break
      for (const row of page) {
        predMap.get(row.participant_id)?.add(row.match_id)
      }
      if (page.length < PAGE_SIZE) break
    }
  }

  const statuses = participants.map(p => {
    const done = predMap.get(p.id)?.size ?? 0
    return { id: p.id, name: p.name, done, total: totalExpected, complete: done >= totalExpected, missing: totalExpected - done }
  }).sort((a, b) => a.missing - b.missing || a.name.localeCompare(b.name))

  const activeWindow = forceWindow ?? (r1Active ? "r1" : r23Active ? "r23" : nextKoStage ?? null)

  return NextResponse.json({ windowLabel, windowDeadline, totalExpected, statuses, availableWindows, activeWindow })
}
