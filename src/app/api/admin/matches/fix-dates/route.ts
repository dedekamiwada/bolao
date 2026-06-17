import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { fetchAllMatches } from "@/lib/football-data/client"

export const maxDuration = 30

// Mesmos aliases do sync.ts para consistência
const TLA_ALIASES: Record<string, string> = {
  URY: "URU",
}

type DbMatch = {
  id: number
  external_id: number | null
  scheduled_at: string
  status: string
  home_team: { id: number; fifa_code: string } | null
  away_team: { id: number; fifa_code: string } | null
}

type DateDiff = {
  match_id: number
  home_team: string
  away_team: string
  db_date: string
  api_date: string
  diff_minutes: number
  status: string
}

async function buildDiff(): Promise<{ diffs: DateDiff[]; unmatched: number }> {
  const supabase = createAdminClient()

  const [apiData, { data: dbTeams }, { data: rawMatches }] = await Promise.all([
    fetchAllMatches(),
    supabase.from("teams").select("id, fifa_code"),
    supabase.from("matches").select(`
      id, external_id, scheduled_at, status,
      home_team:teams!matches_home_team_id_fkey(id, fifa_code),
      away_team:teams!matches_away_team_id_fkey(id, fifa_code)
    `),
  ])

  const dbMatches = (rawMatches ?? []) as unknown as DbMatch[]

  // TLA → team_id
  const tlaToId = new Map<string, number>()
  for (const t of dbTeams ?? []) tlaToId.set(t.fifa_code.toUpperCase(), t.id)
  for (const [fdTla, fifaCode] of Object.entries(TLA_ALIASES)) {
    const id = tlaToId.get(fifaCode)
    if (id) tlaToId.set(fdTla, id)
  }

  // Lookup maps
  const byExtId = new Map<number, DbMatch>()
  const byTeams = new Map<string, DbMatch>() // "homeId:awayId"
  for (const m of dbMatches) {
    if (m.external_id) byExtId.set(m.external_id, m)
    if (m.home_team && m.away_team) {
      byTeams.set(`${m.home_team.id}:${m.away_team.id}`, m)
    }
  }

  const diffs: DateDiff[] = []
  let unmatched = 0

  for (const fdMatch of apiData.matches) {
    let dbMatch = byExtId.get(fdMatch.id) ?? null

    if (!dbMatch) {
      const homeId = tlaToId.get(fdMatch.homeTeam.tla?.toUpperCase())
      const awayId = tlaToId.get(fdMatch.awayTeam.tla?.toUpperCase())
      if (homeId && awayId) dbMatch = byTeams.get(`${homeId}:${awayId}`) ?? null
    }

    if (!dbMatch) {
      unmatched++
      continue
    }

    const apiTime = new Date(fdMatch.utcDate).getTime()
    const dbTime = new Date(dbMatch.scheduled_at).getTime()
    const diffMs = Math.abs(apiTime - dbTime)
    const diffMinutes = Math.round(diffMs / 60_000)

    if (diffMinutes <= 1) continue // dentro da tolerância

    diffs.push({
      match_id: dbMatch.id,
      home_team: dbMatch.home_team?.fifa_code ?? "?",
      away_team: dbMatch.away_team?.fifa_code ?? "?",
      db_date: dbMatch.scheduled_at,
      api_date: fdMatch.utcDate,
      diff_minutes: diffMinutes,
      status: dbMatch.status,
    })
  }

  return { diffs, unmatched }
}

// GET: dry-run — mostra quais datas estão erradas sem alterar nada
export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const { diffs, unmatched } = await buildDiff()
    return NextResponse.json({ diffs, total: diffs.length, unmatched })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST: aplica as correções de data (só scheduled_at, nunca toca em scores/palpites)
export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  // Aceita lista de match_ids para aplicar seletivamente, ou vazio para aplicar todos
  const body = await req.json().catch(() => ({}))
  const onlyIds: number[] | undefined = body.match_ids

  try {
    const { diffs } = await buildDiff()
    const toApply = onlyIds ? diffs.filter(d => onlyIds.includes(d.match_id)) : diffs

    if (toApply.length === 0) {
      return NextResponse.json({ updated: 0, message: "Nenhuma data para corrigir." })
    }

    const supabase = createAdminClient()
    let updated = 0

    for (const diff of toApply) {
      const { error: updateError } = await supabase
        .from("matches")
        .update({ scheduled_at: diff.api_date })
        .eq("id", diff.match_id)

      if (!updateError) updated++
    }

    return NextResponse.json({ updated, applied: toApply.map(d => d.match_id) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
