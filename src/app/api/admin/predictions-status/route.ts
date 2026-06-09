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
    { data: groupPreds },
    { data: knockoutPreds },
  ] = await Promise.all([
    supabase.from("participants").select("id, name").eq("is_active", true).order("name"),
    supabase.from("matches").select("id, match_number, scheduled_at, group_letter, status").eq("stage", "GROUP").order("scheduled_at"),
    supabase.from("matches").select("id, stage, scheduled_at, status").neq("stage", "GROUP").in("status", ["SCHEDULED"]).order("scheduled_at").limit(1),
    supabase.from("group_predictions").select("participant_id, match_id"),
    supabase.from("knockout_predictions").select("participant_id, match_id"),
  ])

  if (!participants || !groupMatches) return NextResponse.json({ error: "DB error" }, { status: 500 })

  const now = Date.now()
  const CUTOFF_MS = 15 * 60 * 1000

  // Determine which group rounds are currently open for betting
  // Round 1: locks 15 min before round 1's first match
  // Rounds 2+3: lock 15 min before round 2's first match
  const r1Matches = groupMatches.filter(m => getGroupRound(m.match_number) === 1)
  const r2Matches = groupMatches.filter(m => getGroupRound(m.match_number) === 2)
  const r3Matches = groupMatches.filter(m => getGroupRound(m.match_number) === 3)

  function firstMatchAt(arr: typeof groupMatches): number | null {
    if (!arr || arr.length === 0) return null
    return Math.min(...arr.map(m => new Date(m.scheduled_at).getTime()))
  }

  const r1LockTime = r1Matches.length ? firstMatchAt(r1Matches)! - CUTOFF_MS : null
  const r2LockTime = r2Matches.length ? firstMatchAt(r2Matches)! - CUTOFF_MS : null

  // Which rounds are still open?
  const r1Open = r1LockTime !== null && now < r1LockTime
  const r23Open = r2LockTime !== null && now < r2LockTime

  // Expected match IDs per round window
  const openMatchIds = new Set<number>()
  if (r1Open) r1Matches.forEach(m => openMatchIds.add(m.id))
  if (r23Open) {
    r2Matches.forEach(m => openMatchIds.add(m.id))
    r3Matches.forEach(m => openMatchIds.add(m.id))
  }

  // Determine label for the next closing window
  let windowLabel = ""
  let windowDeadline: string | null = null
  if (r1Open && r1LockTime) {
    windowLabel = "Rodada 1 da Fase de Grupos"
    windowDeadline = new Date(r1LockTime).toISOString()
  } else if (r23Open && r2LockTime) {
    windowLabel = "Rodadas 2 e 3 da Fase de Grupos"
    windowDeadline = new Date(r2LockTime).toISOString()
  } else if (knockoutMatches && knockoutMatches.length > 0) {
    const ko = knockoutMatches[0]
    const koLock = new Date(ko.scheduled_at).getTime() - CUTOFF_MS
    if (now < koLock) {
      const labels: Record<string, string> = { R32: "16 avos", R16: "Oitavas", QF: "Quartas", SF: "Semifinais", "3RD": "3º Lugar", FINAL: "Final" }
      windowLabel = labels[ko.stage] ?? ko.stage
      windowDeadline = new Date(koLock).toISOString()
    }
  }

  const totalExpected = openMatchIds.size

  // Build prediction lookup: participant_id → Set of match_ids
  const predMap = new Map<string, Set<number>>()
  for (const p of participants) predMap.set(p.id, new Set())
  for (const gp of groupPreds ?? []) {
    if (openMatchIds.has(gp.match_id)) {
      predMap.get(gp.participant_id)?.add(gp.match_id)
    }
  }
  // For knockout window, count knockout preds too
  if (!r1Open && !r23Open && knockoutMatches?.length) {
    for (const kp of knockoutPreds ?? []) {
      predMap.get(kp.participant_id)?.add(kp.match_id)
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
