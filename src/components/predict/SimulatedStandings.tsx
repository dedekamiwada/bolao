"use client"

import { useMemo } from "react"
import { simulateGroupStandings } from "@/lib/scoring/groupSimulation"
import type { TeamStanding } from "@/types/domain"

interface Match {
  id: number
  home_team_id: number
  away_team_id: number
  group_letter: string
  home_team: { id: number; fifa_code: string; name: string; flag_url: string | null } | null
  away_team: { id: number; fifa_code: string; name: string; flag_url: string | null } | null
}

interface Props {
  groupLetter: string
  matches: Match[]
  predictions: Map<number, { home: number; away: number }>
}

export function SimulatedStandings({ groupLetter, matches, predictions }: Props) {
  const standings = useMemo(() => {
    const simPredMap = new Map<number, { matchId: number; home: number; away: number }>()
    predictions.forEach((v, k) => simPredMap.set(k, { matchId: k, home: v.home, away: v.away }))

    const groupMatches = matches
      .filter((m) => m.group_letter === groupLetter)
      .map((m) => ({
        id: m.id,
        homeTeamId: m.home_team_id,
        awayTeamId: m.away_team_id,
        groupLetter: m.group_letter,
      }))

    const raw = simulateGroupStandings(groupMatches, simPredMap)

    // Enrich with team info from matches
    return raw.map((s) => {
      const team = matches.flatMap((m) => [m.home_team, m.away_team]).find((t) => t?.id === s.teamId)
      return { ...s, teamName: team?.name ?? "", fifaCode: team?.fifa_code ?? "", flagUrl: team?.flag_url ?? null }
    })
  }, [groupLetter, matches, predictions])

  const hasPredictions = standings.some((s) => s.played > 0)

  if (!hasPredictions) {
    return (
      <div className="text-xs text-muted-foreground text-center py-4">
        Insira palpites para ver a classificação simulada
      </div>
    )
  }

  return (
    <div className="text-xs">
      <table className="w-full">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left pb-1 w-6">#</th>
            <th className="text-left pb-1">Seleção</th>
            <th className="text-center pb-1 w-6">J</th>
            <th className="text-center pb-1 w-6">V</th>
            <th className="text-center pb-1 w-6">E</th>
            <th className="text-center pb-1 w-6">D</th>
            <th className="text-center pb-1 w-8">SG</th>
            <th className="text-center pb-1 w-6 font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s: TeamStanding, idx: number) => (
            <tr key={s.teamId} className={idx < 2 ? "font-semibold" : "text-muted-foreground"}>
              <td className="py-0.5 w-6">
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold
                  ${idx === 0 ? "bg-yellow-100 text-yellow-800" : idx === 1 ? "bg-gray-100 text-gray-700" : ""}`}>
                  {idx + 1}
                </span>
              </td>
              <td className="py-0.5 truncate max-w-[80px]">{s.fifaCode}</td>
              <td className="text-center py-0.5">{s.played}</td>
              <td className="text-center py-0.5">{s.won}</td>
              <td className="text-center py-0.5">{s.drawn}</td>
              <td className="text-center py-0.5">{s.lost}</td>
              <td className="text-center py-0.5">{s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}</td>
              <td className="text-center py-0.5 font-bold">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
