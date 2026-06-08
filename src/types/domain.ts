export type Stage = "GROUP" | "R32" | "R16" | "QF" | "SF" | "3RD" | "FINAL"
export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED"

export interface Team {
  id: number
  fifa_code: string
  name: string
  group_letter: string | null
  flag_url: string | null
}

export interface Match {
  id: number
  external_id: number | null
  stage: Stage
  group_letter: string | null
  match_number: number
  home_team_id: number | null
  away_team_id: number | null
  home_team?: Team | null
  away_team?: Team | null
  scheduled_at: string
  status: MatchStatus
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  result_confirmed_at: string | null
}

export interface Participant {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export interface GroupPrediction {
  id: string
  participant_id: string
  match_id: number
  home_score: number
  away_score: number
  is_locked: boolean
}

export interface KnockoutPrediction {
  id: string
  participant_id: string
  match_id: number
  home_team_id: number | null
  away_team_id: number | null
  home_score: number | null
  away_score: number | null
  winner_team_id: number | null
  is_locked: boolean
}

export interface RankingEntry {
  participant_id: string
  name: string
  total_points: number
  exact_scores: number
  correct_results: number
  rank_position: number
  previous_rank?: number
  rank_change?: number
}

export interface TeamStanding {
  teamId: number
  teamName: string
  fifaCode: string
  flagUrl: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export type GroupStandings = Record<string, TeamStanding[]>

export const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Fase de Grupos",
  R32: "16 avos de Final",
  R16: "Oitavas de Final",
  QF: "Quartas de Final",
  SF: "Semifinais",
  "3RD": "Disputa de 3º Lugar",
  FINAL: "Final",
}

export const KNOCKOUT_POINTS: Record<Stage, { exact: number; result: number }> = {
  GROUP: { exact: 5, result: 3 },
  R32: { exact: 6, result: 4 },
  R16: { exact: 8, result: 5 },
  QF: { exact: 10, result: 6 },
  SF: { exact: 12, result: 7 },
  "3RD": { exact: 10, result: 6 },
  FINAL: { exact: 20, result: 12 },
}

export const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const
export type GroupLetter = (typeof GROUP_LETTERS)[number]
