// Dry-run do sync: 1 req à football-data + leituras no Supabase. NÃO escreve nada.
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"

// Parse .env manualmente
const env = {}
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=["']?(.*?)["']?$/)
  if (m) env[m[1]] = m[2]
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const FD_STATUS_MAP = {
  SCHEDULED: "SCHEDULED", TIMED: "SCHEDULED", IN_PLAY: "LIVE", PAUSED: "LIVE",
  FINISHED: "FINISHED", SUSPENDED: "POSTPONED", POSTPONED: "POSTPONED", CANCELLED: "POSTPONED",
}

const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
  headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY },
})
console.log("FD HTTP status:", res.status)
if (!res.ok) {
  console.log(await res.text())
  process.exit(1)
}
const data = await res.json()
console.log("FD matches count:", data.matches?.length)

// Distribuição de status FD
const statusCount = {}
for (const m of data.matches) statusCount[m.status] = (statusCount[m.status] ?? 0) + 1
console.log("FD status dist:", statusCount)

// Amostra dos primeiros 6 jogos
for (const m of data.matches.slice(0, 6)) {
  console.log(`FD ${m.id} | ${m.utcDate} | ${m.status} | ${m.homeTeam?.tla ?? m.homeTeam?.name} x ${m.awayTeam?.tla ?? m.awayTeam?.name} | ft=${m.score?.fullTime?.home}-${m.score?.fullTime?.away} | stage=${m.stage}`)
}

const { data: dbTeams } = await supabase.from("teams").select("id, fifa_code")
const tlaToId = new Map(dbTeams.map(t => [t.fifa_code.toUpperCase(), t.id]))

const { data: dbMatches } = await supabase
  .from("matches")
  .select("id, external_id, status, result_confirmed_at, home_team_id, away_team_id, scheduled_at, home_score, away_score, match_number, group_letter, stage")

console.log("DB matches:", dbMatches.length)
const byExtId = new Map(dbMatches.filter(m => m.external_id).map(m => [m.external_id, m]))
console.log("DB matches já linkados (external_id):", byExtId.size)

let wouldLink = 0, noLink = 0, statusChanges = [], scoreChanges = []
const unmatchedTlas = new Set()

for (const fd of data.matches) {
  const status = FD_STATUS_MAP[fd.status] ?? "SCHEDULED"
  let existing = byExtId.get(fd.id) ?? null
  if (!existing) {
    const homeId = tlaToId.get(fd.homeTeam?.tla?.toUpperCase())
    const awayId = tlaToId.get(fd.awayTeam?.tla?.toUpperCase())
    if (fd.homeTeam?.tla && !homeId) unmatchedTlas.add(fd.homeTeam.tla)
    if (fd.awayTeam?.tla && !awayId) unmatchedTlas.add(fd.awayTeam.tla)
    const fdTime = new Date(fd.utcDate).getTime()
    if (homeId && awayId) {
      existing = dbMatches.find(m =>
        m.home_team_id === homeId && m.away_team_id === awayId &&
        Math.abs(new Date(m.scheduled_at).getTime() - fdTime) < 12 * 3600000
      ) ?? null
      if (existing) wouldLink++
    }
    if (!existing) { noLink++; continue }
  }
  if (existing.status !== status) {
    statusChanges.push(`DB#${existing.id} (${existing.group_letter ?? existing.stage} J${existing.match_number}) ${existing.status} -> ${status} (confirmed_at=${existing.result_confirmed_at ? "SIM" : "não"}, db=${existing.home_score}-${existing.away_score}, fd_ft=${fd.score.fullTime.home}-${fd.score.fullTime.away})`)
  }
  const wentToET = fd.score.duration === "EXTRA_TIME" || fd.score.duration === "PENALTY_SHOOTOUT"
  const hs = wentToET && fd.score.extraTime?.home !== null ? fd.score.extraTime.home : fd.score.fullTime.home
  const as_ = wentToET && fd.score.extraTime?.away !== null ? fd.score.extraTime.away : fd.score.fullTime.away
  if ((status === "FINISHED" || status === "LIVE") && (existing.home_score !== hs || existing.away_score !== as_)) {
    scoreChanges.push(`DB#${existing.id} (${existing.group_letter ?? existing.stage} J${existing.match_number}) score ${existing.home_score}-${existing.away_score} -> ${hs}-${as_} [${status}]`)
  }
}

console.log("\nLinkaria agora (fallback teams+data):", wouldLink)
console.log("Sem correspondência (puladas):", noLink)
console.log("TLAs do FD sem time no DB:", [...unmatchedTlas].join(", ") || "(nenhum)")
console.log("\nMudanças de STATUS que o sync aplicaria:", statusChanges.length)
statusChanges.slice(0, 25).forEach(s => console.log("  ", s))
console.log("\nMudanças de PLACAR que o sync aplicaria:", scoreChanges.length)
scoreChanges.slice(0, 25).forEach(s => console.log("  ", s))

// Estado atual do DB: jogos de ontem/hoje
const recent = dbMatches.filter(m => new Date(m.scheduled_at) < new Date("2026-06-13T12:00:00Z") && m.stage === "GROUP")
  .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
console.log("\nJogos no DB até 13/06 12:00 UTC:")
recent.forEach(m => console.log(`  DB#${m.id} ${m.group_letter} J${m.match_number} ${m.scheduled_at} status=${m.status} ${m.home_score}-${m.away_score} ext=${m.external_id} confirmado=${m.result_confirmed_at ? "SIM" : "não"}`))
