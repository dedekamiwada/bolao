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
  allGroupStandings: TeamStanding[][],
  groupLetters: string[]
): { teamId: number; groupLetter: string }[] {
  const thirdPlaceTeams = allGroupStandings
    .map((g, i) => g[2] ? { ...g[2], groupLetter: groupLetters[i] } : null)
    .filter(Boolean) as (TeamStanding & { groupLetter: string })[]

  return thirdPlaceTeams
    .sort(compareTeams)
    .slice(0, 8)
    .map((t) => ({ teamId: t.teamId, groupLetter: t.groupLetter }))
}

// ============================================================
// FIFA 2026 — Seeding oficial do R32 (16 avos de final)
// Fonte: Wikipedia / FIFA oficial
// 24 classificados (1°/2° de cada grupo) + 8 melhores 3°s
// ============================================================
export interface R32Slot {
  matchNumber: number   // match number FIFA (73–88)
  homeSource: string   // "1A"=1° grupo A, "2B"=2° grupo B, "3ABCDF"=melhor 3° dos grupos A/B/C/D/F
  awaySource: string
}

export const OFFICIAL_R32_BRACKET: R32Slot[] = [
  { matchNumber: 73, homeSource: "2A",     awaySource: "2B"     },
  { matchNumber: 74, homeSource: "1C",     awaySource: "2F"     },
  { matchNumber: 75, homeSource: "1E",     awaySource: "3ABCDF" },
  { matchNumber: 76, homeSource: "1F",     awaySource: "2C"     },
  { matchNumber: 77, homeSource: "2E",     awaySource: "2I"     },
  { matchNumber: 78, homeSource: "1I",     awaySource: "3CDFGH" },
  { matchNumber: 79, homeSource: "1A",     awaySource: "3CEFHI" },
  { matchNumber: 80, homeSource: "1L",     awaySource: "3EHIJK" },
  { matchNumber: 81, homeSource: "1G",     awaySource: "3AEHIJ" },
  { matchNumber: 82, homeSource: "1D",     awaySource: "3BEFIJ" },
  { matchNumber: 83, homeSource: "1H",     awaySource: "2J"     },
  { matchNumber: 84, homeSource: "2K",     awaySource: "2L"     },
  { matchNumber: 85, homeSource: "1B",     awaySource: "3EFGIJ" },
  { matchNumber: 86, homeSource: "2D",     awaySource: "2G"     },
  { matchNumber: 87, homeSource: "1J",     awaySource: "2H"     },
  { matchNumber: 88, homeSource: "1K",     awaySource: "3DEIJL" },
]

/**
 * Resolve qual time vai para um slot a partir das classificações simuladas.
 * source: "1A" = 1° do grupo A, "2B" = 2° do grupo B
 *         "3ABCDF" = melhor 3° colocado dentre os grupos A, B, C, D, F
 */
export function resolveTeamFromSource(
  source: string,
  groupStandings: Record<string, TeamStanding[]>,
  best3rds: { teamId: number; groupLetter: string }[]
): number | null {
  // "1A", "2B", etc.
  const directMatch = source.match(/^([12])([A-L])$/)
  if (directMatch) {
    const position = parseInt(directMatch[1]) - 1 // 0-indexed
    const group = directMatch[2]
    return groupStandings[group]?.[position]?.teamId ?? null
  }

  // "3ABCDF" — melhor 3° dentre os grupos listados
  const thirdMatch = source.match(/^3([A-L]+)$/)
  if (thirdMatch) {
    const eligibleGroups = thirdMatch[1].split("") // ["A","B","C","D","F"]
    const eligible = best3rds.filter(t => eligibleGroups.includes(t.groupLetter))
    return eligible[0]?.teamId ?? null // já vêm ordenados por pontuação
  }

  return null
}
