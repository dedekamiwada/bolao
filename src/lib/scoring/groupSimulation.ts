import type { TeamStanding } from "@/types/domain"

interface SimMatch {
  id: number
  homeTeamId: number
  awayTeamId: number
  groupLetter: string
}

interface SimPrediction {
  matchId: number
  home: number
  away: number
}

export function simulateGroupStandings(
  groupMatches: SimMatch[],
  predictions: Map<number, SimPrediction>
): TeamStanding[] {
  const standings = new Map<number, TeamStanding>()

  // Initialize standings for all teams in group
  for (const m of groupMatches) {
    for (const teamId of [m.homeTeamId, m.awayTeamId]) {
      if (!standings.has(teamId)) {
        standings.set(teamId, {
          teamId,
          teamName: "",
          fifaCode: "",
          flagUrl: null,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0,
        })
      }
    }
  }

  for (const match of groupMatches) {
    const pred = predictions.get(match.id)
    if (!pred) continue

    const hg = pred.home
    const ag = pred.away
    const home = standings.get(match.homeTeamId)!
    const away = standings.get(match.awayTeamId)!

    home.played++
    away.played++
    home.goalsFor += hg
    home.goalsAgainst += ag
    away.goalsFor += ag
    away.goalsAgainst += hg
    home.goalDiff = home.goalsFor - home.goalsAgainst
    away.goalDiff = away.goalsFor - away.goalsAgainst

    if (hg > ag) {
      home.won++
      home.points += 3
      away.lost++
    } else if (hg < ag) {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      home.points++
      away.drawn++
      away.points++
    }
  }

  return [...standings.values()].sort(compareTeams)
}

function compareTeams(a: TeamStanding, b: TeamStanding): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
  return 0
}

export function selectBest3rdPlaceTeams(
  allGroupStandings: TeamStanding[][]
): number[] {
  const thirdPlaceTeams = allGroupStandings
    .map((g) => g[2])
    .filter(Boolean)

  return thirdPlaceTeams
    .sort(compareTeams)
    .slice(0, 8)
    .map((t) => t.teamId)
}

// FIFA 2026 R16 bracket: 32 qualified teams from 12 groups
// 2 from each group (24 teams) + 8 best 3rd-place teams
// Official bracket seeding will be defined in pool_config
// This is the default/expected seeding (to be updated when FIFA announces)
export interface R16Slot {
  slot: number
  homeSource: string // e.g. "1A" = 1st of group A, "3ABCD" = best 3rd among A/B/C/D
  awaySource: string
}

export const DEFAULT_R16_BRACKET: R16Slot[] = [
  { slot: 1,  homeSource: "1A", awaySource: "2B" },
  { slot: 2,  homeSource: "1C", awaySource: "2D" },
  { slot: 3,  homeSource: "1E", awaySource: "2F" },
  { slot: 4,  homeSource: "1G", awaySource: "2H" },
  { slot: 5,  homeSource: "1I", awaySource: "2J" },
  { slot: 6,  homeSource: "1K", awaySource: "2L" },
  { slot: 7,  homeSource: "1B", awaySource: "2A" },
  { slot: 8,  homeSource: "1D", awaySource: "2C" },
  { slot: 9,  homeSource: "1F", awaySource: "2E" },
  { slot: 10, homeSource: "1H", awaySource: "2G" },
  { slot: 11, homeSource: "1J", awaySource: "2I" },
  { slot: 12, homeSource: "1L", awaySource: "2K" },
  // 4 slots for best 3rd-place teams (seeding TBD by FIFA)
  { slot: 13, homeSource: "3ABCD", awaySource: "3EFGH" },
  { slot: 14, homeSource: "3IJKL", awaySource: "3BEST" },
  { slot: 15, homeSource: "3BEST2", awaySource: "3BEST3" },
  { slot: 16, homeSource: "3BEST4", awaySource: "3BEST5" },
]
