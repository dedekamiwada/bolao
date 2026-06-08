export function getGroupRound(matchNumber: number): 1 | 2 | 3 {
  if (matchNumber <= 2) return 1
  if (matchNumber <= 4) return 2
  return 3
}

export interface RoundBoundaryMatch {
  match_number: number
  scheduled_at: string
}

export function getRoundFirstMatchAt(groupMatches: RoundBoundaryMatch[], round: 1 | 2 | 3): string {
  const roundMatches = groupMatches.filter(m => getGroupRound(m.match_number) === round)
  return roundMatches.reduce(
    (min, m) => (new Date(m.scheduled_at) < new Date(min) ? m.scheduled_at : min),
    roundMatches[0].scheduled_at
  )
}

export function getRoundLastMatchAt(groupMatches: RoundBoundaryMatch[], round: 1 | 2 | 3): string {
  const roundMatches = groupMatches.filter(m => getGroupRound(m.match_number) === round)
  return roundMatches.reduce(
    (max, m) => (new Date(m.scheduled_at) > new Date(max) ? m.scheduled_at : max),
    roundMatches[0].scheduled_at
  )
}

// Server-side and client-side check: can this match be bet on right now?
export function isGroupMatchBettable(
  match: RoundBoundaryMatch,
  groupMatches: RoundBoundaryMatch[],
  cutoffMinutes = 15
): boolean {
  const round = getGroupRound(match.match_number)
  const now = Date.now()

  const roundFirstMatchAt = getRoundFirstMatchAt(groupMatches, round)
  const lockTime = new Date(roundFirstMatchAt).getTime() - cutoffMinutes * 60 * 1000
  if (now >= lockTime) return false // round is locked

  if (round > 1) {
    const prevRound = (round - 1) as 1 | 2 | 3
    const prevRoundLastMatchAt = getRoundLastMatchAt(groupMatches, prevRound)
    if (now < new Date(prevRoundLastMatchAt).getTime()) return false // previous round not done yet
  }

  return true
}
