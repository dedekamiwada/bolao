import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { KNOCKOUT_PROGRESSION, THIRD_PLACE_MATCH, THIRD_PLACE_SOURCES } from "@/lib/scoring/bracketPreview"

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

  const { id, home_score, away_score, status, winner_team_id, home_team_id, away_team_id } = await req.json()
  if (!id) return NextResponse.json({ error: "ID do jogo obrigatório" }, { status: 400 })

  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}

  if (home_score !== undefined) update.home_score = home_score
  if (away_score !== undefined) update.away_score = away_score
  if (status !== undefined) update.status = status
  if (winner_team_id !== undefined) update.winner_team_id = winner_team_id
  if (home_team_id !== undefined) update.home_team_id = home_team_id
  if (away_team_id !== undefined) update.away_team_id = away_team_id

  if (status === "FINISHED" && home_score !== undefined) {
    update.result_confirmed_at = new Date().toISOString()
  }

  const { data: saved, error: dbError } = await supabase
    .from("matches")
    .update(update)
    .eq("id", id)
    .select("id, match_number, home_team_id, away_team_id")
    .single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // ── Propagar vencedor para o próximo jogo do chaveamento ──────────────────
  if (status === "FINISHED" && winner_team_id && saved) {
    const matchNum = saved.match_number as number

    // Chaveamento regular (R32 → R16 → QF → SF → FINAL)
    const nextEntry = Object.entries(KNOCKOUT_PROGRESSION).find(
      ([, sources]) => sources.home === matchNum || sources.away === matchNum
    )
    if (nextEntry) {
      const [nextNum, sources] = nextEntry
      const isHome = sources.home === matchNum
      const { data: nextMatch } = await supabase
        .from("matches")
        .select("id, home_team_id, away_team_id")
        .eq("match_number", Number(nextNum))
        .single()

      if (nextMatch) {
        const propagate: Record<string, number> = {}
        if (isHome && !nextMatch.home_team_id) propagate.home_team_id = winner_team_id
        if (!isHome && !nextMatch.away_team_id) propagate.away_team_id = winner_team_id
        if (Object.keys(propagate).length > 0) {
          await supabase.from("matches").update(propagate).eq("id", nextMatch.id)
        }
      }
    }

    // 3º lugar: recebe os perdedores das semifinais
    if (matchNum === THIRD_PLACE_SOURCES.home || matchNum === THIRD_PLACE_SOURCES.away) {
      const isHome = matchNum === THIRD_PLACE_SOURCES.home
      const loser = winner_team_id === saved.home_team_id
        ? saved.away_team_id
        : saved.home_team_id

      if (loser) {
        const { data: thirdMatch } = await supabase
          .from("matches")
          .select("id, home_team_id, away_team_id")
          .eq("match_number", THIRD_PLACE_MATCH)
          .single()

        if (thirdMatch) {
          const propagate: Record<string, number> = {}
          if (isHome && !thirdMatch.home_team_id) propagate.home_team_id = loser
          if (!isHome && !thirdMatch.away_team_id) propagate.away_team_id = loser
          if (Object.keys(propagate).length > 0) {
            await supabase.from("matches").update(propagate).eq("id", thirdMatch.id)
          }
        }
      }
    }
  }

  return NextResponse.json({ match: saved })
}
