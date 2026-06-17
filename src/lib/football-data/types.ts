export interface FDTeam {
  id: number
  name: string
  tla: string
  crest: string
}

export interface FDScore {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT"
  fullTime: { home: number | null; away: number | null }
  // extraTime e penalties SÓ vêm na resposta quando o jogo teve prorrogação/pênaltis
  extraTime?: { home: number | null; away: number | null }
  penalties?: { home: number | null; away: number | null }
}

export interface FDMatch {
  id: number
  utcDate: string
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "SUSPENDED" | "POSTPONED" | "CANCELLED"
  matchday: number
  stage: string
  group: string | null
  homeTeam: FDTeam
  awayTeam: FDTeam
  score: FDScore
}

export interface FDMatchesResponse {
  count: number
  matches: FDMatch[]
}

export interface FDTeamsResponse {
  count: number
  teams: FDTeam[]
}

export const FD_STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "GROUP",
  LAST_16: "R16",
  QUARTER_FINALS: "QF",
  SEMI_FINALS: "SF",
  THIRD_PLACE: "3RD",
  FINAL: "FINAL",
}

export const FD_STATUS_MAP: Record<string, string> = {
  SCHEDULED: "SCHEDULED",
  TIMED: "SCHEDULED",
  IN_PLAY: "LIVE",
  PAUSED: "LIVE",
  FINISHED: "FINISHED",
  SUSPENDED: "POSTPONED",
  POSTPONED: "POSTPONED",
  CANCELLED: "POSTPONED",
}

// football-data usa alguns TLAs diferentes dos códigos FIFA do nosso banco
export const TLA_ALIASES: Record<string, string> = {
  URY: "URU",
}

export function buildTlaToId(dbTeams: { id: number; fifa_code: string }[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of dbTeams) map.set(t.fifa_code.toUpperCase(), t.id)
  for (const [fdTla, fifaCode] of Object.entries(TLA_ALIASES)) {
    const id = map.get(fifaCode)
    if (id) map.set(fdTla, id)
  }
  return map
}
