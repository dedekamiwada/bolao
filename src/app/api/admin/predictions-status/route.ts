import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/admin-auth"
import { getGroupRound } from "@/lib/group-rounds"

export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const supabase = createAdminClient()

  // Fetch all data in parallel
  const [
    { data: participants },
    { data: groupMatches },
    { data: knockoutMatches },
    { data: cutoffConfig },
  ] = await Promise.all([
    supabase.from("participants").select("id, name").eq("is_active", true).order("name"),
    supabase.from("matches").select("id, match_number, scheduled_at, group_letter, status").eq("stage", "GROUP").order("scheduled_at"),
    supabase.from("matches").select("id, stage, scheduled_at, status").neq("stage", "GROUP").in("status", ["SCHEDULED"]).order("scheduled_at").limit(1),
    supabase.from("pool_config").select("key, value").in("key", ["r1_cutoff_minutes", "r23_cutoff_minutes"]),
  ])

  if (!participants || !groupMatches) return NextResponse.json({ error: "DB error" }, { status: 500 })

  const now = Date.now()
  const cfgMap = Object.fromEntries((cutoffConfig ?? []).map(r => [r.key, r.value]))
  const R1_CUTOFF_MS  = Number(cfgMap["r1_cutoff_minutes"]  ?? 15) * 60 * 1000
  const R23_CUTOFF_MS = Number(cfgMap["r23_cutoff_minutes"] ?? 10) * 60 * 1000

  // Determine which group rounds are currently open for betting
  // Round 1: locks 15 min before round 1's first match
  // Rounds 2+3: lock 10 min before round 2's first match
  const r1Matches = groupMatches.filter(m => getGroupRound(m.match_number) === 1)
  const r2Matches = groupMatches.filter(m => getGroupRound(m.match_number) === 2)
  const r3Matches = groupMatches.filter(m => getGroupRound(m.match_number) === 3)

  function firstMatchAt(arr: typeof groupMatches): number | null {
    if (!arr || arr.length === 0) return null
    return Math.min(...arr.map(m => new Date(m.scheduled_at).getTime()))
  }

  const r1LockTime = r1Matches.length ? firstMatchAt(r1Matches)! - R1_CUTOFF_MS : null
  const r2LockTime = r2Matches.length ? firstMatchAt(r2Matches)! - R23_CUTOFF_MS : null

  // Windows are MUTUALLY EXCLUSIVE — show the nearest upcoming deadline only.
  // • r1 window:  open while now < r1LockTime
  // • r23 window: open while r1 already locked (now >= r1LockTime) AND now < r2LockTime
  // • knockout:   all group windows closed
  const r1Active  = r1LockTime  !== null && now < r1LockTime
  const r23Active = r2LockTime  !== null && !r1Active && now < r2LockTime

  const openMatchIds = new Set<number>()
  let windowLabel = ""
  let windowDeadline: string | null = null

  if (r1Active && r1LockTime) {
    r1Matches.forEach(m => openMatchIds.add(m.id))
    windowLabel = "Rodada 1 — Fase de Grupos"
    windowDeadline = new Date(r1LockTime).toISOString()
  } else if (r23Active && r2LockTime) {
    r2Matches.forEach(m => openMatchIds.add(m.id))
    r3Matches.forEach(m => openMatchIds.add(m.id))
    windowLabel = "Rodadas 2 e 3 — Fase de Grupos"
    windowDeadline = new Date(r2LockTime).toISOString()
  } else if (knockoutMatches && knockoutMatches.length > 0) {
    const ko = knockoutMatches[0]
    const koLock = new Date(ko.scheduled_at).getTime() - R1_CUTOFF_MS
    if (now < koLock) {
      const labels: Record<string, string> = { R32: "16 avos de Final", R16: "Oitavas de Final", QF: "Quartas de Final", SF: "Semifinais", "3RD": "3º Lugar", FINAL: "Final" }
      windowLabel = labels[ko.stage] ?? ko.stage
      windowDeadline = new Date(koLock).toISOString()
    }
  }

  const totalExpected = openMatchIds.size

  // Build prediction lookup: participant_id → Set of match_ids in the current window
  // Paginated fetch: Supabase caps every response at 1000 rows server-side, and
  // the r2+r3 window can hold 48 matches × all participants (> 1000 rows).
  const predMap = new Map<string, Set<number>>()
  for (const p of participants) predMap.set(p.id, new Set())

  const isKnockoutWindow = !r1Active && !r23Active && !!knockoutMatches?.length
  const predTable = isKnockoutWindow ? "knockout_predictions" : "group_predictions"

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
    return {
      id: p.id,
      name: p.name,
      done,
      total: totalExpected,
      complete: done >= totalExpected,
      missing: totalExpected - done,
    }
  }).sort((a, b) => a.missing - b.missing || a.name.localeCompare(b.name))

  return NextResponse.json({ windowLabel, windowDeadline, totalExpected, statuses })
}
